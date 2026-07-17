import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret, defineString } from 'firebase-functions/params'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

// The hardcoded super-admin uid — kept in sync with firestore.rules.
const SUPER_ADMIN_UID = 'iG5pZlJrNYSyU7IONYNnoo3XFYp2'

// Public — set in functions/.env (DISCORD_CLIENT_ID=...)
const DISCORD_CLIENT_ID = defineString('DISCORD_CLIENT_ID')
// Secret — set via: firebase functions:secrets:set DISCORD_CLIENT_SECRET
const DISCORD_CLIENT_SECRET = defineSecret('DISCORD_CLIENT_SECRET')

interface DiscordUser {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
}

/**
 * Exchanges a Discord OAuth `code` for a Firebase custom token.
 * The client calls this, then runs signInWithCustomToken(auth, token).
 */
export const discordAuth = onRequest(
  { cors: true, secrets: [DISCORD_CLIENT_SECRET] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const { code, redirectUri } = req.body ?? {}
    if (!code || !redirectUri) {
      res.status(400).send('Missing code or redirectUri')
      return
    }

    try {
      // 1. Exchange the OAuth code for a Discord access token.
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID.value(),
          client_secret: DISCORD_CLIENT_SECRET.value(),
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      })
      if (!tokenRes.ok) {
        logger.error('Discord token exchange failed', await tokenRes.text())
        res.status(401).send('Discord token exchange failed')
        return
      }
      const { access_token: accessToken } = (await tokenRes.json()) as {
        access_token: string
      }

      // 2. Fetch the Discord user (id, username, avatar).
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!userRes.ok) {
        res.status(401).send('Failed to fetch Discord user')
        return
      }
      const d = (await userRes.json()) as DiscordUser
      const uid = d.id
      // Animated avatars (Nitro) have a hash prefixed with "a_" and use .gif.
      const ext = d.avatar?.startsWith('a_') ? 'gif' : 'png'
      const photoURL = d.avatar
        ? `https://cdn.discordapp.com/avatars/${uid}/${d.avatar}.${ext}?size=128`
        : ''

      // 3. Upsert users/{discordId}. uid = Discord id → stable across sessions.
      const ref = db.collection('users').doc(uid)
      const snap = await ref.get()
      if (snap.exists && snap.data()?.banned) {
        res.status(403).send('Account is banned')
        return
      }
      if (!snap.exists) {
        await ref.set({
          username: d.username,
          // Display name defaults to the Discord username; the user can rename
          // themselves later without it being reset on the next login.
          displayName: d.username,
          photoURL, // Discord avatar as the initial default; user can change it later.
          createdAt: Date.now(),
          banned: false,
          about: '',
          roles: [],
        })
      } else {
        // Returning user: keep the Discord username in sync, but DON'T touch
        // photoURL or displayName — both are user-owned after signup, so their
        // custom picture and chosen name are preserved. Backfill displayName
        // only for legacy docs that never had one.
        const patch: Record<string, unknown> = { username: d.username }
        if (!snap.data()?.displayName) patch.displayName = d.username
        await ref.set(patch, { merge: true })
      }

      // 4. Mint a Firebase custom token. First sign-in auto-creates the auth user.
      const token = await admin.auth().createCustomToken(uid)
      res.json({ token })
    } catch (err) {
      logger.error('discordAuth error', err)
      res.status(500).send('Internal error')
    }
  },
)

interface MergeResult {
  dryRun: boolean
  fromUid: string
  toUid: string
  targetUsername: string
  postsReassigned: number
  likeArrays: number
  comments: number
  notifications: number
  rolesAfter: string[]
}

/**
 * Merge one account into another: reassign all content authored by `fromUid` to
 * `toUid`, merge the source profile into the target (target wins; roles unioned,
 * earliest join date kept, blank bio/avatar filled from source), then delete the
 * source user doc and its Auth login.
 *
 * Admin-only. Runs with Admin SDK privileges, so it bypasses Firestore rules —
 * this is why the operation lives here and not in the browser. Pass
 * `dryRun: true` to get the counts without writing anything.
 *
 * Client: httpsCallable(functions, 'mergeAccounts')({ fromUid, toUid, dryRun })
 */
export const mergeAccounts = onCall(async (request): Promise<MergeResult> => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')

  // Verify the caller is a site admin (super-admin uid or `administrator` role).
  const callerSnap = await db.collection('users').doc(caller.uid).get()
  const callerRoles: string[] = callerSnap.data()?.roles ?? []
  const isAdmin = caller.uid === SUPER_ADMIN_UID || callerRoles.includes('administrator')
  if (!isAdmin) throw new HttpsError('permission-denied', 'Admins only.')

  const { fromUid, toUid, dryRun } = (request.data ?? {}) as {
    fromUid?: string; toUid?: string; dryRun?: boolean
  }
  if (!fromUid || !toUid) throw new HttpsError('invalid-argument', 'fromUid and toUid are required.')
  if (fromUid === toUid) throw new HttpsError('invalid-argument', 'Pick two different accounts.')
  if (fromUid === SUPER_ADMIN_UID) {
    throw new HttpsError('failed-precondition', 'Refusing to delete the super-admin account.')
  }

  const [fromSnap, toSnap] = await Promise.all([
    db.collection('users').doc(fromUid).get(),
    db.collection('users').doc(toUid).get(),
  ])
  if (!toSnap.exists) throw new HttpsError('not-found', 'Target account does not exist.')
  const fromData = fromSnap.data() ?? {}
  const toData = toSnap.data() ?? {}
  const targetUsername: string = toData.username ?? ''

  let postsReassigned = 0
  let likeArrays = 0
  let comments = 0
  let notifications = 0

  let batch = db.batch()
  let ops = 0
  const flush = async () => {
    if (ops && !dryRun) await batch.commit()
    if (ops) { batch = db.batch(); ops = 0 }
  }
  const queue = async (fn: () => void) => { fn(); if (++ops >= 400) await flush() }

  // ── Posts: authorship, like/dislike arrays, and nested comments ──
  const postsSnap = await db.collection('posts').get()
  for (const post of postsSnap.docs) {
    const d = post.data()
    const updates: Record<string, unknown> = {}
    if (d.authorId === fromUid) {
      updates.authorId = toUid
      updates.authorUsername = targetUsername
      postsReassigned++
    }
    for (const field of ['likedBy', 'dislikedBy']) {
      const arr = d[field]
      if (Array.isArray(arr) && arr.includes(fromUid)) {
        updates[field] = [...new Set(arr.map((id: string) => (id === fromUid ? toUid : id)))]
        likeArrays++
      }
    }
    if (Object.keys(updates).length) await queue(() => batch.update(post.ref, updates))

    const cs = await post.ref.collection('comments').where('authorId', '==', fromUid).get()
    for (const c of cs.docs) {
      comments++
      await queue(() => batch.update(c.ref, { authorId: toUid, authorUsername: targetUsername }))
    }
  }
  await flush()

  // ── Notifications addressed to the source uid ──
  const ns = await db.collection('notifications').where('userId', '==', fromUid).get()
  for (const n of ns.docs) {
    notifications++
    await queue(() => batch.update(n.ref, { userId: toUid }))
  }
  await flush()

  // ── Profile merge (target wins) ──
  const rolesAfter = [...new Set([...(toData.roles ?? []), ...(fromData.roles ?? [])])]
  const profilePatch: Record<string, unknown> = { roles: rolesAfter }
  const fromCreated = typeof fromData.createdAt === 'number' ? fromData.createdAt : Infinity
  const toCreated = typeof toData.createdAt === 'number' ? toData.createdAt : Infinity
  const earliest = Math.min(fromCreated, toCreated)
  if (Number.isFinite(earliest)) profilePatch.createdAt = earliest
  if (!toData.about && fromData.about) profilePatch.about = fromData.about
  if (!toData.photoURL && fromData.photoURL) profilePatch.photoURL = fromData.photoURL

  if (!dryRun) {
    await db.collection('users').doc(toUid).set(profilePatch, { merge: true })
    if (fromSnap.exists) await db.collection('users').doc(fromUid).delete()
    // The doc may not have a matching Auth account (e.g. seed data) — ignore that.
    await admin.auth().deleteUser(fromUid).catch((e) =>
      logger.warn(`mergeAccounts: auth delete skipped for ${fromUid}: ${e.message}`),
    )
    logger.info(`mergeAccounts: ${fromUid} -> ${toUid} by ${caller.uid}`, {
      postsReassigned, likeArrays, comments, notifications,
    })
  }

  return {
    dryRun: !!dryRun,
    fromUid,
    toUid,
    targetUsername,
    postsReassigned,
    likeArrays,
    comments,
    notifications,
    rolesAfter,
  }
})

// ── Message of the day (MOTD) rotation ──────────────────────────────────────
//
// The community's calendar day drives which message shows, and the roll must
// happen at ONE authoritative moment — Vilnius midnight — for everyone. It used
// to run from visitors' browsers using each device's own clock, so a client
// with a skewed clock could roll early (and two clients could disagree and
// ping-pong, burning through the pool). Rolling here on a schedule with the
// server's trusted clock fixes that; the client only reads config/motd now.
//
// The Admin SDK bypasses Firestore rules, so this can delete the consumed
// message and write the denormalized banner in one transaction regardless of
// how the rules are locked down.

const MOTD_TZ = 'Europe/Vilnius'

interface MotdConfig {
  currentId: string | null
  text: string | null
  day: string | null
  selectedAt: number
}

// The community day ("YYYY-MM-DD") in Vilnius wall-time for a given instant.
function vilniusDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MOTD_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

// Roll the message of the day: delete the one that was showing (so it can never
// be picked again) and pick a random one of the remaining, stamping today's
// Vilnius date. Runs in a transaction so a scheduled run and a manual "roll now"
// can't double-roll. When `force` is false (the daily run) it still rolls — the
// schedule already guarantees it's a new day — but re-stamps the current day so
// repeat/retry invocations on the same day are no-ops.
async function rotateMotd(force: boolean): Promise<void> {
  const now = new Date()
  const today = vilniusDay(now)
  const configRef = db.collection('config').doc('motd')

  await db.runTransaction(async (tx) => {
    // Reads first (transaction requirement): current config + the whole pool.
    const cfgSnap = await tx.get(configRef)
    const poolSnap = await tx.get(db.collection('motd'))
    const cfg = (cfgSnap.exists ? cfgSnap.data() : {}) as Partial<MotdConfig>
    const pool = poolSnap.docs.map((d) => ({ id: d.id, text: (d.data().text as string) ?? '' }))

    const currentId = cfg.currentId ?? null
    // The daily run always advances the day; skip only if we already rolled for
    // today (idempotent on retries) and this isn't a forced manual roll.
    if (!force && cfg.day === today) return

    const candidates = pool.filter((m) => m.id !== currentId)
    if (currentId) tx.delete(db.collection('motd').doc(currentId))
    const pick = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : null
    const next: MotdConfig = {
      currentId: pick?.id ?? null,
      text: pick?.text ?? null,
      day: today,
      selectedAt: now.getTime(),
    }
    tx.set(configRef, next)
  })
}

/**
 * Daily authoritative roll at Vilnius midnight. This is the single source of
 * truth for the day's message — clients never roll anymore.
 */
export const rollMotdDaily = onSchedule(
  { schedule: '0 0 * * *', timeZone: MOTD_TZ },
  async () => {
    await rotateMotd(false)
    logger.info('rollMotdDaily: rolled MOTD')
  },
)

/**
 * Manual "roll now" for the admin panel: consume the current message and pick a
 * new one immediately. Restricted to the motd-manager role or a site admin.
 *
 * Client: httpsCallable(functions, 'rollMotdNow')()
 */
export const rollMotdNow = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerSnap = await db.collection('users').doc(caller.uid).get()
  const roles: string[] = callerSnap.data()?.roles ?? []
  const allowed =
    caller.uid === SUPER_ADMIN_UID ||
    roles.includes('administrator') ||
    roles.includes('motd-manager')
  if (!allowed) throw new HttpsError('permission-denied', 'MOTD managers only.')
  await rotateMotd(true)
  return { ok: true }
})

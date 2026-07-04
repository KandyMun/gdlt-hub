#!/usr/bin/env node
/**
 * One-time migration: re-point old username/password accounts onto their
 * new Discord identity (uid = Discord id).
 *
 * PREREQUISITES
 *   1. Each real user logs in with Discord ONCE, so users/{discordId} exists.
 *   2. Run `node scripts/admin.js list-users` to see both the old docs
 *      (random Firebase uid) and the new Discord docs (numeric Discord id).
 *   3. Fill in MAPPING below: oldUid -> discordId for each person.
 *   4. Leave DRY_RUN = true, run once, read the report. Then set it false and
 *      run again to apply.
 *
 * WHAT IT DOES (per mapping entry)
 *   - Posts & comments authored by oldUid  -> authorId/authorUsername = Discord.
 *   - likedBy / dislikedBy arrays           -> oldUid replaced with Discord id.
 *   - Notifications addressed to oldUid      -> userId = Discord id.
 *   - Profile (about, roles, custom avatar, original join date) merged into the
 *     new Discord user doc.
 *   - Old user doc + old Auth account deleted.
 *
 * Run:  node scripts/migrate-discord.js
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DRY_RUN = true // set to false to actually write

// oldUid (random Firebase uid) -> discordId (numeric string)
const MAPPING = {
  'H70reK9tgmMBRFOzlFHMuPaG1Qz2': '232581692022456320',
  // 'XyZ789oldFirebaseUid': '987654321098765432',
}
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(resolve(__dirname, 'serviceAccountKey.json'), 'utf8'))
} catch {
  console.error('❌  scripts/serviceAccountKey.json not found (see scripts/admin.js for setup).')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const tag = DRY_RUN ? '[dry-run] ' : ''
const oldUids = Object.keys(MAPPING)

async function run() {
  if (oldUids.length === 0) {
    console.error('❌  MAPPING is empty — fill in oldUid -> discordId first.')
    process.exit(1)
  }

  // Resolve the new Discord username for each target (used on posts/comments).
  const target = {} // oldUid -> { discordId, username }
  for (const oldUid of oldUids) {
    const discordId = MAPPING[oldUid]
    const newSnap = await db.collection('users').doc(discordId).get()
    if (!newSnap.exists) {
      console.error(`❌  users/${discordId} does not exist — that user must log in with Discord first. Skipping ${oldUid}.`)
      continue
    }
    target[oldUid] = { discordId, username: newSnap.data().username ?? '' }
  }

  let posts = 0, comments = 0, likes = 0, notifs = 0

  // ── One pass over all posts: authorship, likes, and nested comments ──
  const postSnap = await db.collection('posts').get()
  for (const post of postSnap.docs) {
    const data = post.data()
    const updates = {}

    if (target[data.authorId]) {
      updates.authorId = target[data.authorId].discordId
      updates.authorUsername = target[data.authorId].username
    }

    for (const field of ['likedBy', 'dislikedBy']) {
      const arr = data[field]
      if (!Array.isArray(arr)) continue
      const mapped = [...new Set(arr.map((id) => target[id]?.discordId ?? id))]
      if (JSON.stringify(mapped) !== JSON.stringify(arr)) {
        updates[field] = mapped
        likes++
      }
    }

    if (Object.keys(updates).length) {
      console.log(`${tag}post ${post.id}: ${JSON.stringify(updates)}`)
      if (updates.authorId) posts++
      if (!DRY_RUN) await post.ref.update(updates)
    }

    // Comments live at posts/{id}/comments
    const commentSnap = await post.ref.collection('comments').get()
    for (const c of commentSnap.docs) {
      const t = target[c.data().authorId]
      if (!t) continue
      console.log(`${tag}comment ${post.id}/${c.id} -> ${t.discordId}`)
      comments++
      if (!DRY_RUN) await c.ref.update({ authorId: t.discordId, authorUsername: t.username })
    }
  }

  // ── Notifications addressed to the old uid ──
  const notifSnap = await db.collection('notifications').get()
  for (const n of notifSnap.docs) {
    const t = target[n.data().userId]
    if (!t) continue
    notifs++
    if (!DRY_RUN) await n.ref.update({ userId: t.discordId })
  }

  // ── Merge profile into the new doc, then remove the old account ──
  for (const oldUid of Object.keys(target)) {
    const { discordId } = target[oldUid]
    const oldDocSnap = await db.collection('users').doc(oldUid).get()
    if (!oldDocSnap.exists) { console.log(`${tag}no old doc for ${oldUid}, skipping profile merge`); continue }
    const old = oldDocSnap.data()

    const merge = {
      about: old.about ?? '',
      roles: old.roles ?? [],
    }
    // Keep a custom old avatar if they'd set one; else leave the Discord default.
    if (old.photoURL) merge.photoURL = old.photoURL
    // Preserve the original join date.
    if (typeof old.createdAt === 'number') merge.createdAt = old.createdAt

    console.log(`${tag}merge users/${discordId} <- ${oldUid}: ${JSON.stringify(merge)}`)
    if (!DRY_RUN) {
      await db.collection('users').doc(discordId).set(merge, { merge: true })
      await db.collection('users').doc(oldUid).delete()
      await admin.auth().deleteUser(oldUid).catch((e) => console.warn(`  (auth delete skipped: ${e.message})`))
    }
  }

  console.log(`\n${tag}Done. posts:${posts} comments:${comments} like-arrays:${likes} notifications:${notifs}`)
  if (DRY_RUN) console.log('This was a dry run — set DRY_RUN = false to apply.')
  process.exit(0)
}

run().catch((err) => { console.error('❌ ', err); process.exit(1) })

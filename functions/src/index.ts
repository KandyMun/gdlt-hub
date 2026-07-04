import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

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
          displayName: d.global_name ?? d.username,
          photoURL, // Discord avatar as the initial default; user can change it later.
          createdAt: Date.now(),
          banned: false,
          about: '',
          roles: [],
        })
      } else {
        // Returning user: refresh identity fields, but DON'T touch photoURL —
        // it's user-owned after signup so their custom picture is preserved.
        await ref.set(
          { username: d.username, displayName: d.global_name ?? d.username },
          { merge: true },
        )
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

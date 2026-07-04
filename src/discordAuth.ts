import { signInWithCustomToken } from 'firebase/auth'
import { auth } from './firebase'

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string
// Deployed Cloud Function URL, e.g. https://us-central1-<project>.cloudfunctions.net/discordAuth
const FN_URL = import.meta.env.VITE_DISCORD_FN_URL as string

// Vite base path, e.g. '/freepost/' (always has a trailing slash).
const BASE = import.meta.env.BASE_URL
const CALLBACK_PATH = `${BASE}auth/discord`

// Must exactly match a redirect added in the Discord OAuth2 tab.
export const DISCORD_REDIRECT_URI = `${window.location.origin}${CALLBACK_PATH}`

const STATE_KEY = 'discord_oauth_state'

/** Redirect the browser to Discord's authorize screen. */
export function startDiscordLogin() {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    state,
  })
  window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`
}

/** True when the current URL is Discord bouncing back with a code. */
export function isDiscordCallback() {
  return (
    window.location.pathname === CALLBACK_PATH &&
    new URLSearchParams(window.location.search).has('code')
  )
}

/** Exchange the code via the Cloud Function and sign in. */
export async function completeDiscordLogin() {
  const q = new URLSearchParams(window.location.search)
  const code = q.get('code')
  const state = q.get('state')
  const saved = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)

  if (!code) throw new Error('Missing authorization code')
  if (!state || state !== saved) throw new Error('State mismatch — please try again')

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: DISCORD_REDIRECT_URI }),
  })
  if (!res.ok) {
    throw new Error((await res.text()) || 'Discord login failed')
  }
  const { token } = (await res.json()) as { token: string }
  await signInWithCustomToken(auth, token)
}

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { startDiscordLogin } from '../discordAuth'
import { useI18n } from '../i18n'

interface Props {
  onSuccess?: () => void
}

export default function AuthPage({ onSuccess }: Props) {
  const { locale } = useI18n()
  const [loading, setLoading] = useState(false)

  // Legacy username/password sign-in — kept for admin only, hidden by default.
  const [legacy, setLegacy] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const title = locale === 'lt' ? 'Prisijunk prie freepost' : 'Sign in to freepost'
  const btn = locale === 'lt' ? 'Prisijungti su Discord' : 'Log in with Discord'
  const note =
    locale === 'lt'
      ? 'Būsi nukreiptas į Discord ir grįši atgal.'
      : "You'll be redirected to Discord and back."

  function handleDiscord() {
    setLoading(true)
    startDiscordLogin()
  }

  async function handleLegacy(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = `${username.toLowerCase().trim()}@freepost.local`
      await signInWithEmailAndPassword(auth, email, password)
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : locale === 'lt' ? 'Nepavyko prisijungti' : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">{title}</h1>

        <button
          onClick={handleDiscord}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
          </svg>
          {loading && !legacy ? '…' : btn}
        </button>
        <p className="text-neutral-500 text-sm text-center mt-4">{note}</p>

        {legacy && (
          <form onSubmit={handleLegacy} className="flex flex-col gap-3 mt-6 pt-6 border-t border-neutral-800">
            <input
              type="text"
              placeholder={locale === 'lt' ? 'Vartotojo vardas' : 'Username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
            <input
              type="password"
              placeholder={locale === 'lt' ? 'Slaptažodis' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              {locale === 'lt' ? 'Prisijungti' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => { setLegacy((v) => !v); setError('') }}
            className="text-neutral-700 hover:text-neutral-500 text-xs transition-colors"
            title={locale === 'lt' ? 'Prisijungimas administratoriui' : 'Admin sign-in'}
          >
            ·
          </button>
        </div>
      </div>
    </div>
  )
}

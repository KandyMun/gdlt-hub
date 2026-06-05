import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useI18n } from '../i18n'

interface Props {
  onSuccess?: () => void
}

export default function AuthPage({ onSuccess }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const email = `${username.toLowerCase().trim()}@freepost.local`
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
        onSuccess?.()
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        await setDoc(doc(db, 'users', user.uid), {
          username: username.toLowerCase().trim(),
          createdAt: Date.now(),
          banned: false,
        })
        onSuccess?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth_err_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          {mode === 'login' ? t.auth_signin_title : t.auth_signup_title}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={t.auth_username_placeholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <input
            type="password"
            placeholder={t.auth_password_placeholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? t.auth_loading : mode === 'login' ? t.auth_signin_button : t.auth_signup_button}
          </button>
        </form>
        <p className="text-neutral-500 text-sm text-center mt-4">
          {mode === 'login' ? t.auth_no_account : t.auth_has_account}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-violet-400 hover:text-violet-300"
          >
            {mode === 'login' ? t.auth_go_signup : t.auth_go_signin}
          </button>
        </p>
      </div>
    </div>
  )
}

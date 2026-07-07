import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { isDiscordCallback, completeDiscordLogin } from './discordAuth'
import { useAuth } from './AuthContext'
import Spinner from './components/Spinner'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import AboutPage from './components/AboutPage'
import ChangelogPage from './components/ChangelogPage'
import ProfilePage from './components/ProfilePage'
import LtclPage from './components/LtclPage'
import UserSearch from './components/UserSearch'
import AdminPage from './components/admin/AdminPage'
import FreepostApp from './FreepostApp'

// Module-level guard: exchange the one-time OAuth code exactly once, even though
// React StrictMode runs effects twice in development.
let discordCallbackHandled = false

// Top-level router for the gdlt-hub. The hub home lives at "/", and freepost is
// nested one level below at "/freepost/*" — reached from the home page.
export default function App() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')

  // Handle Discord bouncing back to /gdlt-hub/auth/discord, then land on the hub home.
  useEffect(() => {
    if (!isDiscordCallback() || discordCallbackHandled) return
    discordCallbackHandled = true
    completeDiscordLogin()
      .then(() => {
        window.history.replaceState({}, '', import.meta.env.BASE_URL)
        navigate('/', { replace: true })
      })
      .catch((e: unknown) => setAuthError(e instanceof Error ? e.message : 'Login failed'))
  }, [navigate])

  if (isDiscordCallback() && !user && !authError) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Spinner /></div>
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-red-400">{authError}</p>
        <button
          onClick={() => { window.history.replaceState({}, '', import.meta.env.BASE_URL); setAuthError('') }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
        >
          OK
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Spinner /></div>
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        {/* Profiles belong to the whole hub, not just freepost, so they live at /u/. */}
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/user-search" element={<UserSearch />} />
        <Route path="/ltcl/*" element={<LtclPage />} />
        {/* Hub-wide admin panel. Self-gates on the manage_site capability. */}
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/freepost/*" element={<FreepostApp />} />
      </Route>
    </Routes>
  )
}

import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { isDiscordCallback, completeDiscordLogin } from './discordAuth'

// Module-level guard: ensures the one-time OAuth code is exchanged exactly once,
// even though React StrictMode runs effects twice in development.
let discordCallbackHandled = false
import PostModal from './components/PostModal'
import { type Post } from './types'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { useAuth } from './AuthContext'
import { useIsAdmin } from './useIsAdmin'
import { useSiteConfig } from './useSiteConfig'
import { useI18n } from './i18n'
import AuthPage from './components/AuthPage'
import Feed from './components/Feed'
import MyPosts from './components/MyPosts'
import UsersPage from './components/UsersPage'
import NewPostModal from './components/NewPostModal'
import NotificationsPanel from './components/NotificationsPanel'
import ChangelogPage from './components/ChangelogPage'
import ProfilePage from './components/ProfilePage'
import Avatar from './components/Avatar'
import VERSION from './version'
import Spinner from './components/Spinner'

export default function App() {
  const { user, profile, loading } = useAuth()
  const isAdmin = useIsAdmin()
  const { frozen } = useSiteConfig()
  const { t, locale, setLocale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [notifPost, setNotifPost] = useState<Post | null>(null)
  const [feedKey, setFeedKey] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authError, setAuthError] = useState('')

  // Handle the Discord OAuth redirect back to the app (HashRouter-safe).
  useEffect(() => {
    if (!isDiscordCallback() || discordCallbackHandled) return
    discordCallbackHandled = true
    completeDiscordLogin()
      .then(() => window.history.replaceState({}, '', import.meta.env.BASE_URL))
      .catch((e: unknown) => setAuthError(e instanceof Error ? e.message : 'Login failed'))
  }, [])

  const currentUsername = profile?.username ?? user?.email?.split('@')[0] ?? ''

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

  if (showAuth && !user) {
    return <AuthPage onSuccess={() => setShowAuth(false)} />
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-white font-bold text-lg tracking-tight cursor-pointer">
          freepost <span className="text-neutral-600 text-xs font-normal">{VERSION}</span>
        </button>

        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <NavLink to="/" end className={navClass}>{t.nav_feed}</NavLink>
          <NavLink to="/changelog" className={navClass}>{t.nav_changelog}</NavLink>
          {isAdmin && <NavLink to="/users" className={navClass}>{t.nav_users}</NavLink>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setLocale('lt')}
              className={`px-3 py-1.5 text-sm transition-colors ${locale === 'lt' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              🇱🇹 LT
            </button>
            <button
              onClick={() => setLocale('en')}
              className={`px-3 py-1.5 text-sm transition-colors ${locale === 'en' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              🇬🇧 EN
            </button>
          </div>
          {user && <NotificationsPanel onOpenPost={(post) => setNotifPost(post)} />}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex rounded-full ring-2 ring-transparent hover:ring-neutral-600 transition"
                title={currentUsername}
              >
                <Avatar username={currentUsername} size={34} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-neutral-800">
                      <p className="text-white text-sm font-medium truncate">
                        {currentUsername}
                        {isAdmin && <span title="Admin" className="text-yellow-400 ml-1">★</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); navigate(`/u/${currentUsername}`) }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                    >
                      {t.nav_profile}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/myposts') }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                    >
                      {t.nav_myposts}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); signOut(auth) }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-neutral-800 transition-colors"
                    >
                      {t.nav_signout}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {t.nav_signin}
            </button>
          )}
        </div>
      </header>

      {frozen && !isAdmin && (
        <div className="bg-red-950/70 border-b border-red-800 text-red-300 text-sm text-center py-2 px-4">
          {t.site_frozen_banner}
        </div>
      )}

      <main className="max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Feed key={feedKey} onPostModalChange={setPostModalOpen} frozen={frozen && !isAdmin} />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          {user && <Route path="/myposts" element={<MyPosts />} />}
          {isAdmin && <Route path="/users" element={<UsersPage />} />}
        </Routes>
      </main>

      {user && location.pathname === '/' && !postModalOpen && (!frozen || isAdmin) && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-8 right-8 z-50 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base px-8 py-4 rounded-full shadow-2xl shadow-violet-900/50 transition-colors"
        >
          + {t.new_post_submit}
        </button>
      )}

      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onPosted={() => setFeedKey((k) => k + 1)}
        />
      )}

      {notifPost && (
        <PostModal post={notifPost} onClose={() => setNotifPost(null)} scrollToComments frozen={frozen && !isAdmin} />
      )}
    </div>
  )
}

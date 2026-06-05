import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
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
import VERSION from './version'

export default function App() {
  const { user, loading } = useAuth()
  const isAdmin = useIsAdmin()
  const { frozen } = useSiteConfig()
  const { t, locale, setLocale } = useI18n()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [notifPost, setNotifPost] = useState<Post | null>(null)
  const [feedKey, setFeedKey] = useState(0)

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">{t.loading}</div>
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
          {user && <NavLink to="/myposts" className={navClass}>{t.nav_myposts}</NavLink>}
          {isAdmin && <NavLink to="/users" className={navClass}>{t.nav_users}</NavLink>}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <NotificationsPanel onOpenPost={(post) => setNotifPost(post)} />
              <span className="text-sm text-neutral-400">{user.email?.split('@')[0]}</span>
              {isAdmin && <span title="Admin" className="text-yellow-400 text-sm">★</span>}
            </div>
          )}
          <button
            onClick={() => setLocale(locale === 'lt' ? 'en' : 'lt')}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors border border-neutral-700 hover:border-neutral-500 rounded px-1.5 py-0.5"
          >
            {locale === 'lt' ? '🇬🇧 EN' : '🇱🇹 LT'}
          </button>
          {user ? (
            <button
              onClick={() => signOut(auth)}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {t.nav_signout}
            </button>
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
          {user && <Route path="/myposts" element={<MyPosts />} />}
          {isAdmin && <Route path="/users" element={<UsersPage />} />}
        </Routes>
      </main>

      {user && !postModalOpen && (!frozen || isAdmin) && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base px-8 py-4 rounded-full shadow-2xl shadow-violet-900/50 transition-colors"
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

import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../AuthContext'
import { useIsAdmin } from '../useIsAdmin'
import { useCan } from '../permissions'
import { useSiteConfig } from '../useSiteConfig'
import { useI18n } from '../i18n'
import { type Post } from '../types'
import AuthPage from './AuthPage'
import NotificationsPanel from './NotificationsPanel'
import PostModal from './PostModal'
import Avatar from './Avatar'
import FreepostNav from './FreepostNav'
import LtclNav from './LtclNav'
import HomeNav from './HomeNav'
import MotdBanner from './MotdBanner'
import VERSION from '../version'

// The shared top bar for the whole hub: logo, a page-specific middle slot,
// language toggle, notifications and login/profile. The page body renders in the
// <Outlet />. The bar stays mounted across navigation.
export default function Layout() {
  const { user, profile } = useAuth()
  const isAdmin = useIsAdmin()
  const canManageSite = useCan('manage_site')
  const canManageMotd = useCan('manage_motd')
  const { frozen } = useSiteConfig()
  const { t, locale, setLocale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [notifPost, setNotifPost] = useState<Post | null>(null)

  const currentUsername = profile?.username ?? user?.email?.split('@')[0] ?? ''
  const currentDisplayName = profile?.displayName || currentUsername

  if (showAuth && !user) {
    return <AuthPage onSuccess={() => setShowAuth(false)} />
  }

  // Section-specific bits: the middle nav and the page label shown next to the logo.
  const onHome = location.pathname === '/'
  const inFreepost = location.pathname.startsWith('/freepost')
  const inLtcl = location.pathname.startsWith('/ltcl')
  const inBounty = location.pathname.startsWith('/bounty-board')
  const inAdmin = location.pathname.startsWith('/admin')
  const pageLabel = inFreepost ? 'freepost' : inLtcl ? 'LTCL' : inBounty ? t.bounty_board_title : inAdmin ? 'admin' : null
  const middle = inFreepost ? <FreepostNav /> : inLtcl ? <LtclNav /> : inAdmin ? null : <HomeNav />

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-white font-bold text-2xl tracking-tight cursor-pointer">
          <span className="flag-text">GDLT</span> Hub
          {pageLabel && <span className="text-neutral-400 text-lg"> : {pageLabel}</span>}
          <span className="text-neutral-600 text-xs font-normal"> {VERSION}</span>
        </button>

        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          {middle}
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
                title={currentDisplayName}
              >
                <Avatar username={currentUsername} size={34} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-neutral-800">
                      <p className="text-white text-sm font-medium truncate">
                        {currentDisplayName}
                        {isAdmin && <span title="Admin" className="text-yellow-400 ml-1">★</span>}
                      </p>
                      {currentDisplayName !== currentUsername && (
                        <p className="text-neutral-500 text-xs truncate">@{currentUsername}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); navigate(`/u/${currentUsername}`) }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                    >
                      {t.nav_profile}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/freepost/myposts') }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                    >
                      {t.nav_myposts}
                    </button>
                    {(canManageSite || canManageMotd) && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/admin') }}
                        className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                      >
                        {t.nav_admin}
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); signOut(auth); navigate('/', { replace: true }) }}
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

      <MotdBanner />

      {!onHome && (
        <div className="px-4 pt-3 flex justify-start">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t.nav_back}
          </button>
        </div>
      )}

      <Outlet />

      {notifPost && (
        <PostModal post={notifPost} onClose={() => setNotifPost(null)} scrollToComments frozen={frozen && !isAdmin} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../AuthContext'
import { useIsAdmin } from '../useIsAdmin'
import { useCan } from '../permissions'
import { useSiteConfig } from '../useSiteConfig'
import { useNotifications } from '../useNotifications'
import { useI18n } from '../i18n'
import { usePageTitle } from '../usePageTitle'
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

// General GDLT Discord server invite, shown in the header on every page.
const GDLT_DISCORD_URL = 'https://discord.gg/x3KcEXgxUs'

// Discord brand glyph (Simple Icons, CC0), 0 0 24 24 viewBox.
function DiscordIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

// The shared top bar for the whole hub: logo, a page-specific middle slot,
// language toggle, notifications and login/profile. The page body renders in the
// <Outlet />. The bar stays mounted across navigation.
export default function Layout() {
  const { user, profile } = useAuth()
  const isAdmin = useIsAdmin()
  const canManageSite = useCan('manage_site')
  const canManageMotd = useCan('manage_motd')
  const { frozen } = useSiteConfig()
  const { notifs, setNotifs, unread } = useNotifications()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  usePageTitle()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)
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
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <button onClick={() => navigate('/')} className="min-w-0 shrink text-white font-bold text-xl sm:text-2xl tracking-tight cursor-pointer truncate">
          <span className="flag-text">GDLT</span> Hub
          {pageLabel && <span className="text-neutral-400 text-base sm:text-lg"> : {pageLabel}</span>}
          <span className="hidden sm:inline text-neutral-600 text-xs font-normal"> {VERSION}</span>
        </button>

        <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          {middle}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {middle && (
            <div className="relative md:hidden">
              <button
                onClick={() => setNavMenuOpen((o) => !o)}
                aria-label="Menu"
                aria-expanded={navMenuOpen}
                className="flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 p-2 transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {navMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                </svg>
              </button>
              {navMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNavMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 min-w-[11rem] bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-2 z-50 flex flex-col gap-1"
                    onClick={() => setNavMenuOpen(false)}
                  >
                    {middle}
                  </div>
                </>
              )}
            </div>
          )}
          <a
            href={GDLT_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t.nav_discord}
            aria-label={t.nav_discord}
            className="flex items-center justify-center rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white p-2 shadow-lg shadow-[#5865F2]/30 hover:scale-105 transition-all"
          >
            <DiscordIcon size={22} />
          </a>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="relative flex rounded-full ring-2 ring-transparent hover:ring-neutral-600 transition"
                title={currentDisplayName}
              >
                <Avatar username={currentUsername} size={34} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-neutral-950">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
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
                    <NotificationsPanel
                      notifs={notifs}
                      setNotifs={setNotifs}
                      onOpenPost={(post) => { setMenuOpen(false); setNotifPost(post) }}
                      onActivate={() => setMenuOpen(false)}
                    />
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

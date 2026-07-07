import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useIsAdmin } from './useIsAdmin'
import { useSiteConfig } from './useSiteConfig'
import { useI18n } from './i18n'
import Feed from './components/Feed'
import MyPosts from './components/MyPosts'
import NewPostModal from './components/NewPostModal'

// The freepost body, mounted at /freepost/* under the shared Layout. The top bar
// (logo, language, notifications, profile) lives in Layout; this owns only the
// freepost content, the freeze banner and the new-post flow.
export default function FreepostApp() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()
  const { frozen } = useSiteConfig()
  const { t } = useI18n()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)

  return (
    <>
      {frozen && !isAdmin && (
        <div className="bg-red-950/70 border-b border-red-800 text-red-300 text-sm text-center py-2 px-4">
          {t.site_frozen_banner}
        </div>
      )}

      <main className="max-w-5xl mx-auto">
        <Routes>
          <Route path="" element={<Feed key={feedKey} onPostModalChange={setPostModalOpen} frozen={frozen && !isAdmin} />} />
          {user && <Route path="myposts" element={<MyPosts />} />}
        </Routes>
      </main>

      {user && location.pathname === '/freepost' && !postModalOpen && (!frozen || isAdmin) && (
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
    </>
  )
}

import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { useAuth } from './AuthContext'
import { useIsAdmin } from './useIsAdmin'
import AuthPage from './components/AuthPage'
import Feed from './components/Feed'
import MyPosts from './components/MyPosts'
import UsersPage from './components/UsersPage'
import NewPostModal from './components/NewPostModal'

type Page = 'feed' | 'mine' | 'users'

export default function App() {
  const { user, loading } = useAuth()
  const isAdmin = useIsAdmin()
  const [showModal, setShowModal] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)
  const [page, setPage] = useState<Page>('feed')

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Loading…</div>
  }

  if (showAuth && !user) {
    return <AuthPage onSuccess={() => setShowAuth(false)} />
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setPage('feed')} className="text-white font-bold text-lg tracking-tight cursor-pointer">freepost</button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('feed')}
            className={`text-sm transition-colors ${page === 'feed' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            Feed
          </button>
          {user && (
            <>
              <button
                onClick={() => setPage('mine')}
                className={`text-sm transition-colors ${page === 'mine' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                My posts
              </button>
              {isAdmin && (
                <button
                  onClick={() => setPage('users')}
                  className={`text-sm transition-colors ${page === 'users' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Users
                </button>
              )}
            </>
          )}
          {user ? (
            <button
              onClick={() => signOut(auth)}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {page === 'feed' && <Feed key={feedKey} onPostModalChange={setPostModalOpen} />}
        {page === 'mine' && user && <MyPosts />}
        {page === 'users' && isAdmin && <UsersPage />}
      </main>

      {user && !postModalOpen && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base px-8 py-4 rounded-full shadow-2xl shadow-violet-900/50 transition-colors"
        >
          + Post
        </button>
      )}

      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onPosted={() => setFeedKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

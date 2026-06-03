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
  const [feedKey, setFeedKey] = useState(0)
  const [page, setPage] = useState<Page>('feed')

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Loading…</div>
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-lg tracking-tight">freepost</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('feed')}
            className={`text-sm transition-colors ${page === 'feed' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            Feed
          </button>
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            + Post
          </button>
          <button
            onClick={() => signOut(auth)}
            className="text-neutral-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {page === 'feed' && <Feed key={feedKey} />}
        {page === 'mine' && <MyPosts />}
        {page === 'users' && isAdmin && <UsersPage />}
      </main>

      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onPosted={() => setFeedKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { type Post } from '../types'
import { useIsAdmin } from '../useIsAdmin'
import PostModal from './PostModal'

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Post | null>(null)
  const isAdmin = useIsAdmin()

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)))
      setLoading(false)
    })
  }, [])

  async function handleDelete(post: Post) {
    setDeleting(true)
    await deleteDoc(doc(db, 'posts', post.id))
    if (post.storagePath) {
      try { await deleteObject(ref(storage, post.storagePath)) } catch { /* ignore */ }
    }
    setConfirmId(null)
    setDeleting(false)
  }

  if (loading) return <div className="text-neutral-500 text-center py-20">Loading…</div>
  if (posts.length === 0) return <div className="text-neutral-500 text-center py-20">No posts yet. Be the first!</div>

  return (
    <>
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 p-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="break-inside-avoid mb-4 bg-neutral-900 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
          onClick={() => setSelected(post)}
        >
          <img src={post.imageUrl} alt={post.title} className="w-full object-cover" loading="lazy" />
          <div className="p-4">
            <h3 className="text-white font-semibold text-base">{post.title}</h3>
            {post.description && <p className="text-neutral-400 text-sm mt-1">{post.description}</p>}
            <div className="flex items-center justify-between mt-3">
              <p className="text-neutral-600 text-xs">{post.authorEmail.replace('@freepost.local', '')}</p>
              {isAdmin && (
                confirmId === post.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-neutral-400 hover:text-white text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId(post.id) }}
                    className="text-red-400 hover:text-red-300 text-xs transition-colors"
                  >
                    Delete
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
    {selected && <PostModal post={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

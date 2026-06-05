import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { type Post } from '../types'
import EditPostModal from './EditPostModal'

export default function MyPosts() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Post | null>(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)))
      setLoading(false)
    })
  }, [user])

  if (loading) return <div className="text-neutral-500 text-center py-20">{t.loading}</div>
  if (posts.length === 0) return <div className="text-neutral-500 text-center py-20">{t.myposts_empty}</div>

  return (
    <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      {posts.map((post) => (
        <div key={post.id} className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex gap-4 items-start p-4">
          <img src={post.imageUrl} alt={post.title} className="w-24 h-24 object-cover rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-neutral-500 text-xs mb-1">{new Date(post.createdAt).toLocaleDateString()}</p>
            <h3 className="text-white font-semibold truncate">{post.title}</h3>
            {post.description && <p className="text-neutral-400 text-sm mt-1 line-clamp-2">{post.description}</p>}
          </div>
          <button
            onClick={() => setEditing(post)}
            className="shrink-0 text-neutral-400 hover:text-white text-sm border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            {t.edit}
          </button>
        </div>
      ))}
      {editing && <EditPostModal post={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

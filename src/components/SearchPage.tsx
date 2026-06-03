import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { type Post } from '../types'
import PostModal from './PostModal'

export default function SearchPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Post | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)))
    })
  }, [])

  const results = search.trim()
    ? posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase().trim()))
    : []

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4">
      <input
        type="text"
        placeholder="Search posts by title…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="bg-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 text-base"
      />

      {search.trim() && results.length === 0 && (
        <p className="text-neutral-500 text-center py-8">No posts match "{search}"</p>
      )}

      {results.map((post) => (
        <div
          key={post.id}
          onClick={() => setSelected(post)}
          className="bg-neutral-900 rounded-2xl overflow-hidden flex gap-4 items-start p-4 cursor-pointer hover:bg-neutral-800 transition-colors"
        >
          <img src={post.imageUrl} alt={post.title} className="w-20 h-20 object-cover rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{post.title}</h3>
            {post.description && <p className="text-neutral-400 text-sm mt-1 line-clamp-2">{post.description}</p>}
            <p className="text-neutral-600 text-xs mt-2">{post.authorEmail.replace('@freepost.local', '')}</p>
          </div>
        </div>
      ))}

      {selected && <PostModal post={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

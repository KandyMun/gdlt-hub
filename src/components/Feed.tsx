import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, query, orderBy, getDocs, deleteDoc, doc, onSnapshot, updateDoc, where,
  limit, startAfter, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { type Post } from '../types'
import { authorName } from '../authorName'
import { useIsAdmin } from '../useIsAdmin'
import { useI18n } from '../i18n'
import PostModal from './PostModal'
import LikeBar from './LikeBar'
import Avatar from './Avatar'
import Spinner from './Spinner'

const PAGE_SIZE = 15

type SortMode = 'chronological' | 'likes'

interface Props {
  onPostModalChange?: (open: boolean) => void
  frozen?: boolean
}

export default function Feed({ onPostModalChange, frozen }: Props) {
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Post | null>(null)
  const [sort, setSort] = useState<SortMode>('chronological')
  const [search, setSearch] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isAdmin = useIsAdmin()
  const { t } = useI18n()
  const [newPostAvailable, setNewPostAvailable] = useState(false)

  // Live listener for pinned posts (small set, always fresh)
  useEffect(() => {
    const q = query(collection(db, 'posts'), where('pinned', '==', true))
    return onSnapshot(q, (snap) => {
      setPinnedPosts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post))
          .sort((a, b) => a.title.localeCompare(b.title))
      )
    })
  }, [])

  // Lightweight watcher for new posts at the top
  useEffect(() => {
    if (sort !== 'chronological') return
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(1))
    return onSnapshot(q, (snap) => {
      const topId = snap.docs[0]?.id
      if (!topId) return
      setPosts((current) => {
        if (current.length > 0 && current[0].id !== topId) setNewPostAvailable(true)
        return current
      })
    })
  }, [sort])

  async function fetchPage(after: QueryDocumentSnapshot | null, sortMode: SortMode) {
    const order = sortMode === 'likes'
      ? orderBy('likeCount', 'desc')
      : orderBy('createdAt', 'desc')
    const q = after
      ? query(collection(db, 'posts'), order, startAfter(after), limit(PAGE_SIZE))
      : query(collection(db, 'posts'), order, limit(PAGE_SIZE))
    const snap = await getDocs(q)
    const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post))
    setPosts((prev) => after ? [...prev, ...newPosts] : newPosts)
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
    setHasMore(snap.docs.length === PAGE_SIZE)
  }

  useEffect(() => {
    setLoading(true)
    setPosts([])
    setLastDoc(null)
    setHasMore(true)
    fetchPage(null, sort).then(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true)
        fetchPage(lastDoc, sort).finally(() => setLoadingMore(false))
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, lastDoc])

  function openPost(post: Post) {
    setSelected(post)
    onPostModalChange?.(true)
  }

  function closePost() {
    setSelected(null)
    onPostModalChange?.(false)
  }

  async function handleDelete(post: Post) {
    setDeleting(true)
    await deleteDoc(doc(db, 'posts', post.id))
    if (post.storagePath) {
      try { await deleteObject(ref(storage, post.storagePath)) } catch { /* ignore */ }
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
    setPinnedPosts((prev) => prev.filter((p) => p.id !== post.id))
    setConfirmId(null)
    setDeleting(false)
  }

  async function handleTogglePin(e: React.MouseEvent, post: Post) {
    e.stopPropagation()
    const newPinned = !post.pinned
    if (newPinned) {
      setPinnedPosts((prev) => [...prev, { ...post, pinned: true }].sort((a, b) => a.title.localeCompare(b.title)))
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } else {
      setPinnedPosts((prev) => prev.filter((p) => p.id !== post.id))
      setPosts((prev) => [{ ...post, pinned: false }, ...prev])
    }
    updateDoc(doc(db, 'posts', post.id), { pinned: newPinned })
  }

  function renderCard(post: Post, isPinned = false) {
    return (
      <div
        key={post.id}
        className={`rounded-2xl overflow-hidden shadow-lg cursor-pointer ${isPinned ? 'bg-neutral-900 ring-1 ring-yellow-600/40' : 'bg-neutral-900'}`}
        onClick={() => openPost(post)}
      >
        <div className="relative">
          {post.isVideo ? (
            <video src={post.imageUrl} className="w-full object-cover" muted loop autoPlay playsInline />
          ) : (
            <img src={post.imageUrl} alt={post.title} className="w-full object-cover" loading="lazy" />
          )}
          {post.isVideo && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{t.feed_video_badge}</span>
          )}
          {isPinned && (
            <span className="absolute top-2 left-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-600/40">📌</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <Link
              to={`/u/${authorName(post)}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-violet-400"
            >
              <Avatar username={authorName(post)} size={20} />
              <span className="hover:underline">{authorName(post)}</span>
            </Link>
            <span>
              {' • '}
              {(() => {
                const d = new Date(post.createdAt)
                const date = d.toISOString().slice(0, 10)
                const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
                return `${date} ${time}`
              })()}
            </span>
          </div>
          <h3 className="text-white font-semibold text-base">{post.title}</h3>
          {post.description && <p className="text-neutral-400 text-sm mt-1">{post.description}</p>}
          <div className="flex items-center gap-3 mt-3">
            <LikeBar post={post} frozen={frozen} />
            <span className="text-neutral-500 text-sm">💬 {post.commentCount ?? 0}</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            {isAdmin && (
              <>
                <button
                  onClick={(e) => handleTogglePin(e, post)}
                  className={`text-xs transition-colors ${post.pinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-700 hover:text-yellow-400'}`}
                >
                  {post.pinned ? t.feed_unpin : t.feed_pin}
                </button>
                {confirmId === post.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-neutral-400 hover:text-white text-xs transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {deleting ? t.deleting : t.delete}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId(post.id) }}
                    className="text-red-400 hover:text-red-300 text-xs transition-colors"
                  >
                    {t.delete}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const pinnedIds = new Set(pinnedPosts.map((p) => p.id))

  const filteredPinned = search.trim()
    ? pinnedPosts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase().trim()))
    : pinnedPosts

  const filteredPosts = (search.trim()
    ? posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase().trim()))
    : posts
  ).filter((p) => !pinnedIds.has(p.id))

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (posts.length === 0 && pinnedPosts.length === 0) return <div className="text-neutral-500 text-center py-20">{t.feed_empty}</div>

  return (
    <>
    <div className="px-4 pt-4">
      <input
        type="text"
        placeholder={t.feed_search_placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-neutral-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />
    </div>
    <div className="flex items-center gap-2 px-4 pt-3">
      <span className="text-neutral-500 text-sm">{t.feed_sort_label}</span>
      <button
        onClick={() => setSort('chronological')}
        className={`text-sm px-3 py-1 rounded-lg transition-colors ${sort === 'chronological' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
      >
        {t.feed_sort_new}
      </button>
      <button
        onClick={() => setSort('likes')}
        className={`text-sm px-3 py-1 rounded-lg transition-colors ${sort === 'likes' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
      >
        {t.feed_sort_top}
      </button>
    </div>
    {newPostAvailable && (
      <div className="px-4 pt-3">
        <button
          onClick={() => {
            setNewPostAvailable(false)
            setLoading(true)
            setPosts([])
            setLastDoc(null)
            setHasMore(true)
            fetchPage(null, sort).then(() => setLoading(false))
          }}
          className="w-full bg-violet-900/40 hover:bg-violet-900/60 border border-violet-700 text-violet-300 text-sm rounded-xl py-2 transition-colors"
        >
          {t.feed_new_available}
        </button>
      </div>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {filteredPinned.map((post) => renderCard(post, true))}
      {filteredPosts.map((post) => renderCard(post, false))}
    </div>
    <div ref={sentinelRef} className="py-4 text-center">
      {loadingMore && <span className="text-neutral-500 text-sm">{t.feed_loading_more}</span>}
      {!hasMore && posts.length > 0 && <span className="text-neutral-700 text-sm">{t.feed_no_more}</span>}
    </div>
    {selected && <PostModal post={selected} onClose={closePost} frozen={frozen} />}
    </>
  )
}

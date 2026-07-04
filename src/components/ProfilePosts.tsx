import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { type Post } from '../types'
import { authorName } from '../authorName'
import { useI18n } from '../i18n'
import { useSiteConfig } from '../useSiteConfig'
import { useIsAdmin } from '../useIsAdmin'
import PostModal from './PostModal'
import LikeBar from './LikeBar'
import Avatar from './Avatar'
import Spinner from './Spinner'

export default function ProfilePosts({ uid }: { uid: string }) {
  const { t } = useI18n()
  const { frozen } = useSiteConfig()
  const isAdmin = useIsAdmin()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Post | null>(null)

  useEffect(() => {
    setLoading(true)
    // where-only query (no orderBy) avoids needing a composite index; sort client-side.
    const q = query(collection(db, 'posts'), where('authorId', '==', uid))
    return onSnapshot(q, (snap) => {
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Post))
          .sort((a, b) => b.createdAt - a.createdAt),
      )
      setLoading(false)
    })
  }, [uid])

  const effFrozen = frozen && !isAdmin

  return (
    <div className="mt-6">
      <h2 className="text-neutral-300 font-medium mb-3 px-1">{t.profile_posts_title}</h2>
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : posts.length === 0 ? (
        <p className="text-neutral-600 text-sm px-1">{t.profile_posts_empty}</p>
      ) : (
        <div className="flex flex-col gap-4 w-[70%] mx-auto">
          {posts.map((post) => {
            const username = authorName(post)
            return (
              <div
                key={post.id}
                className="rounded-2xl overflow-hidden shadow-lg cursor-pointer bg-neutral-900"
                onClick={() => setSelected(post)}
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
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
                    <Link
                      to={`/u/${username}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:text-violet-400"
                    >
                      <Avatar username={username} size={20} />
                      <span className="hover:underline">{username}</span>
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
                    <LikeBar post={post} frozen={effFrozen} />
                    <span className="text-neutral-500 text-sm">💬 {post.commentCount ?? 0}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {selected && <PostModal post={selected} onClose={() => setSelected(null)} frozen={effFrozen} />}
    </div>
  )
}

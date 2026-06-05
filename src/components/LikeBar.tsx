import { useState } from 'react'
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { type Post } from '../types'

interface Props {
  post: Post
  frozen?: boolean
  size?: 'sm' | 'lg'
}

export default function LikeBar({ post, frozen, size = 'sm' }: Props) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(user ? (post.likedBy?.includes(user.uid) ?? false) : false)
  const [disliked, setDisliked] = useState(user ? (post.dislikedBy?.includes(user.uid) ?? false) : false)
  const [likeCount, setLikeCount] = useState(post.likedBy?.length ?? 0)
  const [dislikeCount, setDislikeCount] = useState(post.dislikedBy?.length ?? 0)

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user || frozen) return
    const ref = doc(db, 'posts', post.id)
    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      await updateDoc(ref, { likedBy: arrayRemove(user.uid), likeCount: increment(-1) })
    } else {
      setLiked(true)
      setLikeCount((c) => c + 1)
      if (disliked) { setDisliked(false); setDislikeCount((c) => c - 1) }
      await updateDoc(ref, {
        likedBy: arrayUnion(user.uid),
        likeCount: increment(1),
        dislikedBy: arrayRemove(user.uid),
      })
    }
  }

  async function handleDislike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user || frozen) return
    const ref = doc(db, 'posts', post.id)
    if (disliked) {
      setDisliked(false)
      setDislikeCount((c) => c - 1)
      await updateDoc(ref, { dislikedBy: arrayRemove(user.uid) })
    } else {
      setDisliked(true)
      setDislikeCount((c) => c + 1)
      if (liked) { setLiked(false); setLikeCount((c) => c - 1); }
      await updateDoc(ref, {
        dislikedBy: arrayUnion(user.uid),
        likedBy: arrayRemove(user.uid),
        ...(liked ? { likeCount: increment(-1) } : {}),
      })
    }
  }

  const base = size === 'lg'
    ? 'flex items-center gap-2 text-lg px-3 py-1.5 rounded-lg transition-colors cursor-pointer'
    : 'flex items-center gap-1 text-sm transition-colors cursor-pointer'

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleLike}
        className={`${base} ${liked ? 'text-violet-400' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <span>▲</span>
        <span>{likeCount}</span>
      </button>
      <button
        onClick={handleDislike}
        className={`${base} ${disliked ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <span>▼</span>
        <span>{dislikeCount}</span>
      </button>
    </div>
  )
}

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { type Post } from '../types'

interface Props {
  post: Post
}

export default function LikeBar({ post }: Props) {
  const { user } = useAuth()
  const liked = user ? post.likedBy?.includes(user.uid) : false
  const disliked = user ? post.dislikedBy?.includes(user.uid) : false

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    const ref = doc(db, 'posts', post.id)
    if (liked) {
      await updateDoc(ref, { likedBy: arrayRemove(user.uid) })
    } else {
      await updateDoc(ref, {
        likedBy: arrayUnion(user.uid),
        dislikedBy: arrayRemove(user.uid),
      })
    }
  }

  async function handleDislike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    const ref = doc(db, 'posts', post.id)
    if (disliked) {
      await updateDoc(ref, { dislikedBy: arrayRemove(user.uid) })
    } else {
      await updateDoc(ref, {
        dislikedBy: arrayUnion(user.uid),
        likedBy: arrayRemove(user.uid),
      })
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleLike}
        className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-violet-400' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <span>▲</span>
        <span>{post.likedBy?.length ?? 0}</span>
      </button>
      <button
        onClick={handleDislike}
        className={`flex items-center gap-1 text-sm transition-colors ${disliked ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <span>▼</span>
        <span>{post.dislikedBy?.length ?? 0}</span>
      </button>
    </div>
  )
}

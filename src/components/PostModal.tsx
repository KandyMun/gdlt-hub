import { useEffect, useState } from 'react'
import LikeBar from './LikeBar'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, doc, updateDoc, increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { type Post } from '../types'

interface Comment {
  id: string
  text: string
  authorId: string
  authorEmail: string
  createdAt: number
}

interface Props {
  post: Post
  onClose: () => void
}

const MAX = 160

export default function PostModal({ post: initialPost, onClose }: Props) {
  const { user } = useAuth()
  const [post, setPost] = useState<Post>(initialPost)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    return onSnapshot(doc(db, 'posts', initialPost.id), (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() } as Post)
    })
  }, [initialPost.id])

  useEffect(() => {
    const q = query(
      collection(db, 'posts', initialPost.id, 'comments'),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment)))
    })
  }, [initialPost.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !user) return
    setSubmitting(true)
    await addDoc(collection(db, 'posts', post.id, 'comments'), {
      text: text.trim(),
      authorId: user.uid,
      authorEmail: user.email,
      createdAt: Date.now(),
    })
    await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(1) })
    setText('')
    setSubmitting(false)
  }

  async function handleEdit(comment: Comment) {
    if (!editText.trim()) return
    await updateDoc(doc(db, 'posts', post.id, 'comments', comment.id), {
      text: editText.trim(),
    })
    setEditingId(null)
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditText(comment.text)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-white font-semibold truncate pr-4">{post.title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none shrink-0">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {post.isVideo ? (
            <video src={post.imageUrl} className="w-full" controls autoPlay loop playsInline />
          ) : (
            <img src={post.imageUrl} alt={post.title} className="w-full object-contain" />
          )}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            {post.description
              ? <p className="text-neutral-400 text-sm whitespace-pre-wrap">{post.description}</p>
              : <span />}
            <LikeBar post={post} />
          </div>

        {/* Comments */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-neutral-600 text-sm text-center py-4">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-xs font-medium">
                  {c.authorEmail.replace('@freepost.local', '')}
                  {' • '}
                  {(() => {
                    const d = new Date(c.createdAt)
                    const date = d.toISOString().slice(0, 10)
                    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
                    return `${date} ${time}`
                  })()}
                </span>
                {user?.uid === c.authorId && editingId !== c.id && (
                  <button
                    onClick={() => startEdit(c)}
                    className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingId === c.id ? (
                <div className="flex flex-col gap-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value.slice(0, MAX))}
                    rows={2}
                    className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 text-xs">{editText.length}/{MAX}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-neutral-500 hover:text-white text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        disabled={!editText.trim()}
                        className="text-violet-400 hover:text-violet-300 disabled:opacity-40 text-xs font-medium transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-300 text-sm">{c.text}</p>
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Comment input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800 shrink-0 flex flex-col gap-2">
          <textarea
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            rows={2}
            className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-600 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 text-xs">{text.length}/{MAX}</span>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {submitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

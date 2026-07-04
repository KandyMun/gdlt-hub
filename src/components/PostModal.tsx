import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LikeBar from './LikeBar'
import Avatar from './Avatar'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, doc, updateDoc, increment, getDocs, where, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { useIsAdmin } from '../useIsAdmin'
import { type Post } from '../types'
import { authorName } from '../authorName'

interface Comment {
  id: string
  text: string
  authorId: string
  authorEmail?: string
  authorUsername?: string
  createdAt: number
}

interface Props {
  post: Post
  onClose: () => void
  scrollToComments?: boolean
  frozen?: boolean
}

const MAX = 160

export default function PostModal({ post: initialPost, onClose, scrollToComments, frozen }: Props) {
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const isAdmin = useIsAdmin()
  const [post, setPost] = useState<Post>(initialPost)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const commentsRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (scrollToComments && commentsRef.current) {
      setTimeout(() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
  }, [scrollToComments])

  async function submitComment() {
    if (!text.trim() || !user) return
    setSubmitting(true)
    const commenterUsername = profile?.username ?? user.email?.split('@')[0] ?? ''
    await addDoc(collection(db, 'posts', post.id, 'comments'), {
      text: text.trim(),
      authorId: user.uid,
      authorUsername: commenterUsername,
      createdAt: Date.now(),
    })
    await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(1) })
    const preview = text.trim().slice(0, 80)
    const now = Date.now()

    if (user.uid !== post.authorId) {
      await addDoc(collection(db, 'notifications'), {
        type: 'comment',
        userId: post.authorId,
        postId: post.id,
        postTitle: post.title,
        commenterUsername,
        commentPreview: preview,
        createdAt: now,
        read: false,
      })
    }

    // Mention notifications for @username tags
    const mentionedUsernames = [...new Set(
      [...text.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1].toLowerCase())
    )].filter((u) => u !== commenterUsername)

    for (const username of mentionedUsernames) {
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', username)))
      if (snap.empty) continue
      const mentionedUid = snap.docs[0].id
      if (mentionedUid === user.uid) continue
      await addDoc(collection(db, 'notifications'), {
        type: 'mention',
        userId: mentionedUid,
        postId: post.id,
        postTitle: post.title,
        commenterUsername,
        commentPreview: preview,
        createdAt: now,
        read: false,
      })
    }
    setText('')
    setSubmitting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitComment()
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

  async function handleDeleteComment(comment: Comment) {
    await deleteDoc(doc(db, 'posts', post.id, 'comments', comment.id))
    await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(-1) })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-white font-semibold truncate pr-4">{post.title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {post.isVideo ? (
            <video src={post.imageUrl} className="w-full" controls autoPlay loop playsInline />
          ) : (
            <img src={post.imageUrl} alt={post.title} className="w-full object-contain" />
          )}
          <div className="px-4 py-3 border-b border-neutral-800 flex flex-col gap-2">
            {post.description && (
              <p className="text-neutral-400 text-sm whitespace-pre-wrap">{post.description}</p>
            )}
            <LikeBar post={post} frozen={frozen} size="lg" />
          </div>

          <div ref={commentsRef} className="px-4 pt-3 flex flex-col gap-3">
            <p className="text-neutral-500 text-base font-medium">💬 {t.post_comment_count(post.commentCount ?? 0)}</p>
            {comments.length === 0 && (
              <p className="text-neutral-600 text-sm text-center py-4">{t.post_no_comments}</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-xs font-medium flex items-center gap-1.5">
                    <Link
                      to={`/u/${authorName(c)}`}
                      className="flex items-center gap-1.5 hover:text-violet-400"
                    >
                      <Avatar username={authorName(c)} size={18} />
                      <span className="hover:underline">{authorName(c)}</span>
                    </Link>
                    {' • '}
                    {(() => {
                      const d = new Date(c.createdAt)
                      const date = d.toISOString().slice(0, 10)
                      const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
                      return `${date} ${time}`
                    })()}
                  </span>
                  <div className="flex items-center gap-2">
                    {user?.uid === c.authorId && editingId !== c.id && (
                      <button
                        onClick={() => startEdit(c)}
                        className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors"
                      >
                        {t.edit}
                      </button>
                    )}
                    {(isAdmin || user?.uid === c.authorId) && editingId !== c.id && (
                      <button
                        onClick={() => handleDeleteComment(c)}
                        className="text-neutral-600 hover:text-red-400 text-xs transition-colors"
                      >
                        {t.post_comment_delete}
                      </button>
                    )}
                  </div>
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
                          {t.cancel}
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          disabled={!editText.trim()}
                          className="text-violet-400 hover:text-violet-300 disabled:opacity-40 text-xs font-medium transition-colors"
                        >
                          {t.save}
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

        <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800 shrink-0 flex flex-col gap-2">
          {frozen ? (
            <p className="text-red-400 text-sm text-center py-1">{t.post_frozen_comments}</p>
          ) : (
            <>
              <textarea
                placeholder={t.post_comment_placeholder}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
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
                  {submitting ? t.post_comment_posting : t.post_comment_button}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

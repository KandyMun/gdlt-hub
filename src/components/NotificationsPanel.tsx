import { useEffect, useRef, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { type Post } from '../types'
import PostModal from './PostModal'

interface Notification {
  id: string
  postId: string
  postTitle: string
  commenterUsername: string
  commentPreview: string
  createdAt: number
  read: boolean
}

export default function NotificationsPanel() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)))
    })
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  async function handleNotifClick(notif: Notification) {
    if (!notif.read) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true })
    }
    const snap = await getDoc(doc(db, 'posts', notif.postId))
    if (snap.exists()) {
      setSelectedPost({ id: snap.id, ...snap.data() } as Post)
    }
    setOpen(false)
  }

  if (!user) return null

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative text-sm transition-colors ${open ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
      >
        Notifications
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={async () => {
                  for (const n of notifs.filter((n) => !n.read)) {
                    await updateDoc(doc(db, 'notifications', n.id), { read: true })
                  }
                }}
                className="text-neutral-500 hover:text-white text-xs transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">No notifications yet.</p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-800 transition-colors ${!n.read ? 'bg-neutral-800/50' : ''}`}
                >
                  <p className="text-white text-xs font-medium truncate">
                    <span className="text-violet-400">{n.commenterUsername}</span>
                    {' commented on '}
                    <span className="text-neutral-300">{n.postTitle}</span>
                  </p>
                  <p className="text-neutral-500 text-xs mt-0.5 truncate">"{n.commentPreview}"</p>
                  <p className="text-neutral-600 text-xs mt-1">{new Date(n.createdAt).toISOString().slice(0, 10)}</p>
                  {!n.read && <span className="inline-block w-1.5 h-1.5 bg-violet-500 rounded-full mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} scrollToComments />
      )}
    </div>
  )
}

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import { type Post } from '../types'
import { type Notification } from '../useNotifications'

interface Props {
  notifs: Notification[]
  setNotifs: Dispatch<SetStateAction<Notification[]>>
  onOpenPost: (post: Post) => void
  // Called when a notification is opened, so the surrounding avatar menu closes.
  onActivate?: () => void
}

// Renders as a row inside the profile dropdown. The button toggles a popover
// listing the user's notifications; the live data comes from the parent via
// props (see useNotifications).
export default function NotificationsPanel({ notifs, setNotifs, onOpenPost, onActivate }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n))
      updateDoc(doc(db, 'notifications', notif.id), { read: true })
    }
    const snap = await getDoc(doc(db, 'posts', notif.postId))
    if (snap.exists()) {
      onOpenPost({ id: snap.id, ...snap.data() } as Post)
    }
    setOpen(false)
    onActivate?.()
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
      >
        <span>{t.notif_button}</span>
        {unread > 0 && (
          <span className="bg-violet-600 text-white text-[10px] font-bold min-w-[1rem] h-4 px-1 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">{t.notif_panel_title}</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={async () => {
                    for (const n of notifs.filter((n) => !n.read)) {
                      await updateDoc(doc(db, 'notifications', n.id), { read: true })
                    }
                  }}
                  className="text-neutral-500 hover:text-white text-xs transition-colors"
                >
                  {t.notif_mark_read}
                </button>
              )}
              {notifs.length > 0 && (
                <button
                  onClick={async () => {
                    for (const n of notifs) {
                      await deleteDoc(doc(db, 'notifications', n.id))
                    }
                  }}
                  className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
                >
                  {t.notif_clear}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">{t.notif_empty}</p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start border-b border-neutral-800 last:border-0 ${!n.read ? 'bg-neutral-800/50' : ''}`}
                >
                  <button
                    onClick={() => handleNotifClick(n)}
                    className="flex-1 text-left px-4 py-3 hover:bg-neutral-800 transition-colors"
                  >
                    <p className="text-white text-xs font-medium truncate">
                      <span className="text-violet-400">{n.commenterUsername}</span>
                      {n.type === 'mention' ? t.notif_mentioned_in : t.notif_commented_on}
                      <span className="text-neutral-300">{n.postTitle}</span>
                    </p>
                    <p className="text-neutral-500 text-xs mt-0.5 truncate">"{n.commentPreview}"</p>
                    <p className="text-neutral-600 text-xs mt-1">{new Date(n.createdAt).toISOString().slice(0, 10)}</p>
                    {!n.read && <span className="inline-block w-1.5 h-1.5 bg-violet-500 rounded-full mt-1" />}
                  </button>
                  <button
                    onClick={() => deleteDoc(doc(db, 'notifications', n.id))}
                    className="px-3 py-3 text-neutral-600 hover:text-red-400 text-xs transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

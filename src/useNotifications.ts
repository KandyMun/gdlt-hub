import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'

export interface Notification {
  id: string
  type?: 'comment' | 'mention'
  postId: string
  postTitle: string
  commenterUsername: string
  commentPreview: string
  createdAt: number
  read: boolean
}

// Live subscription to the signed-in user's notifications, ordered newest-first.
// Lifted out of NotificationsPanel so the unread count is available higher up
// (e.g. for the avatar badge) while a single listener feeds the panel.
export function useNotifications() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notification[]>([])

  useEffect(() => {
    if (!user) {
      setNotifs([])
      return
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)))
    })
  }, [user])

  const unread = notifs.filter((n) => !n.read).length

  return { notifs, setNotifs, unread }
}

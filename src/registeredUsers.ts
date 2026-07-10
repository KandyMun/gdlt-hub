import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// A live, alphabetically-sorted list of every registered hub account. Used by
// the admin editors that let staff attach a real user to a person reference
// (see PersonRef). Reads are public, so this works for any signed-in admin.
export interface RegisteredUser {
  uid: string
  username: string
  displayName?: string
  photoURL?: string
}

export function useRegisteredUsers() {
  const [users, setUsers] = useState<RegisteredUser[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<RegisteredUser, 'uid'>) }))
          .sort((a, b) => a.username.localeCompare(b.username)),
      )
      setLoaded(true)
    })
  }, [])

  return { users, loaded }
}

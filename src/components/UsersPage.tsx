import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'

interface UserRecord {
  id: string
  username: string
  createdAt: number
  banned: boolean
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as UserRecord))
          .sort((a, b) => a.username.localeCompare(b.username)),
      )
      setLoading(false)
    })
  }, [])

  async function toggleBan(u: UserRecord) {
    await updateDoc(doc(db, 'users', u.id), { banned: !u.banned })
  }

  if (loading) return <div className="text-neutral-500 text-center py-20">Loading…</div>

  return (
    <div className="p-4 flex flex-col gap-3 max-w-2xl mx-auto">
      <p className="text-neutral-500 text-sm">{users.length} account{users.length !== 1 ? 's' : ''}</p>
      {users.map((u) => (
        <div key={u.id} className="bg-neutral-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className={`font-medium ${u.banned ? 'text-neutral-500 line-through' : 'text-white'}`}>
              {u.username}
              {u.id === user?.uid && <span className="text-neutral-600 text-xs ml-2">(you)</span>}
            </p>
            <p className="text-neutral-600 text-xs mt-0.5">
              Joined {new Date(u.createdAt).toISOString().slice(0, 10)}
            </p>
          </div>
          {u.id !== user?.uid && u.id !== import.meta.env.VITE_ADMIN_UID && (
            <button
              onClick={() => toggleBan(u)}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                u.banned
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {u.banned ? 'Unban' : 'Ban'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

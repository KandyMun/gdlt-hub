import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { useSiteConfig, setSiteFrozen } from '../useSiteConfig'

interface UserRecord {
  id: string
  username: string
  createdAt: number
  banned: boolean
}

export default function UsersPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { frozen } = useSiteConfig()
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

  if (loading) return <div className="text-neutral-500 text-center py-20">{t.loading}</div>

  return (
    <div className="p-4 flex flex-col gap-3 max-w-2xl mx-auto">
      <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${frozen ? 'bg-red-950/50 border border-red-800' : 'bg-neutral-900'}`}>
        <div>
          <p className="text-white font-medium text-sm">{frozen ? t.users_site_frozen : t.users_site_active}</p>
          <p className="text-neutral-500 text-xs mt-0.5">{frozen ? t.users_frozen_desc : t.users_active_desc}</p>
        </div>
        <button
          onClick={() => setSiteFrozen(!frozen)}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${frozen ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
        >
          {frozen ? t.users_unfreeze : t.users_freeze}
        </button>
      </div>
      <p className="text-neutral-500 text-sm">{t.users_count(users.length)}</p>
      {users.map((u) => (
        <div key={u.id} className="bg-neutral-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className={`font-medium ${u.banned ? 'text-neutral-500 line-through' : 'text-white'}`}>
              {u.username}
              {u.id === user?.uid && <span className="text-neutral-600 text-xs ml-2">{t.users_you}</span>}
            </p>
            <p className="text-neutral-600 text-xs mt-0.5">
              {t.users_joined(new Date(u.createdAt).toISOString().slice(0, 10))}
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
              {u.banned ? t.users_unban : t.users_ban}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

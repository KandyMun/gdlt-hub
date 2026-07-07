import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../AuthContext'
import { useI18n } from '../../i18n'
import { useCan } from '../../permissions'
import { ROLES, getRole } from '../../roles'
import { useBadges, toggleUserBadge } from '../../badges'
import BadgePill from '../BadgePill'
import Spinner from '../Spinner'

interface UserRecord {
  id: string
  username: string
  displayName?: string
  createdAt: number
  banned: boolean
  roles?: string[]
  badges?: string[]
}

// The user directory: search, role assignment, badge assignment and bans.
// Role/badge editing requires assign_roles; banning requires manage_site.
export default function UsersSection() {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const canAssignRoles = useCan('assign_roles')
  const canManageSite = useCan('manage_site')
  const { badges } = useBadges()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rolesFor, setRolesFor] = useState<string | null>(null)
  const [badgesFor, setBadgesFor] = useState<string | null>(null)

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

  async function toggleRole(uid: string, roleId: string, active: boolean) {
    await updateDoc(doc(db, 'users', uid), {
      roles: active ? arrayRemove(roleId) : arrayUnion(roleId),
    })
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const q = search.toLowerCase().trim()
  const filtered = q
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName ?? '').toLowerCase().includes(q),
      )
    : users

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder={t.users_search_placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-neutral-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />
      <p className="text-neutral-500 text-sm">{t.users_count(filtered.length)}</p>
      {filtered.map((u) => (
        <div key={u.id} className="bg-neutral-900 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`font-medium flex items-center gap-1.5 ${u.banned ? 'text-neutral-500 line-through' : 'text-white'}`}>
                <Link to={`/u/${u.username.toLowerCase()}`} className="hover:text-violet-400 hover:underline">
                  {u.displayName || u.username}
                </Link>
                {u.roles?.map((id) => {
                  const r = getRole(id)
                  return r ? <span key={id} title={r.label[locale]} className="text-base leading-none">{r.icon}</span> : null
                })}
                {u.id === user?.uid && <span className="text-neutral-600 text-xs ml-1">{t.users_you}</span>}
              </p>
              {u.displayName && u.displayName !== u.username && (
                <p className="text-neutral-500 text-xs">@{u.username}</p>
              )}
              <p className="text-neutral-600 text-xs mt-0.5">
                {t.users_joined(new Date(u.createdAt).toISOString().slice(0, 10))}
              </p>
              {u.badges && u.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {u.badges.map((id) => {
                    const b = badges.find((x) => x.id === id)
                    return b ? <BadgePill key={id} badge={b} /> : null
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canAssignRoles && (
                <button
                  onClick={() => { setRolesFor((cur) => (cur === u.id ? null : u.id)); setBadgesFor(null) }}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    rolesFor === u.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {t.users_roles}
                </button>
              )}
              {canAssignRoles && (
                <button
                  onClick={() => { setBadgesFor((cur) => (cur === u.id ? null : u.id)); setRolesFor(null) }}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    badgesFor === u.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {t.users_badges}
                </button>
              )}
              {canManageSite && u.id !== user?.uid && u.id !== import.meta.env.VITE_ADMIN_UID && (
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
          </div>
          {canAssignRoles && rolesFor === u.id && (
            <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-wrap gap-2">
              {ROLES.map((r) => {
                const active = u.roles?.includes(r.id) ?? false
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRole(u.id, r.id, active)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active ? r.badge : 'border-neutral-700 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{r.label[locale]}
                  </button>
                )
              })}
            </div>
          )}
          {canAssignRoles && badgesFor === u.id && (
            <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-wrap gap-2">
              {badges.length === 0 ? (
                <p className="text-neutral-500 text-xs">{t.users_badges_none}</p>
              ) : (
                badges.map((b) => {
                  const active = u.badges?.includes(b.id) ?? false
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleUserBadge(u.id, b.id, active)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                        active ? 'border-violet-500 bg-violet-600/20 text-white' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{b.icon && <span>{/^https?:\/\//.test(b.icon) ? '🖼️' : b.icon}</span>}{b.name}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

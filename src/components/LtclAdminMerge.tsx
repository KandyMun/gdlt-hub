import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import {
  useLtclLevels,
  buildLeaderboard,
  countLtclProfileMatches,
  mergeLtclProfile,
  type LbEntry,
} from '../ltclLevels'
import Spinner from './Spinner'

interface UserRow {
  id: string
  username: string
  displayName?: string
}

// Dropdown picker over LTCL leaderboard handles (the "profile" being merged).
function ProfilePicker({
  label, entries, value, onPick,
}: {
  label: string
  entries: LbEntry[]
  value: string | null
  onPick: (handle: string | null) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = entries.find((e) => e.handle === value) ?? null

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    return entries.filter((e) => !s || e.handle.includes(s))
  }, [entries, q])

  function close() { setOpen(false); setQ('') }

  return (
    <div className="flex-1 min-w-[12rem] flex flex-col gap-1.5">
      <p className="text-neutral-400 text-xs font-medium">{label}</p>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-left"
        >
          <span className={`text-sm truncate ${selected ? 'text-white' : 'text-neutral-500'}`}>
            {selected ? `@${selected.handle}` : t.ltcl_merge_select_profile}
          </span>
          <span className="flex items-center gap-2 shrink-0 ml-2">
            {selected && (
              <span
                onClick={(e) => { e.stopPropagation(); onPick(null) }}
                className="text-neutral-400 hover:text-red-400 text-xs"
                aria-label="clear"
              >✕</span>
            )}
            <span className="text-neutral-500 text-xs">▾</span>
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute left-0 right-0 mt-1 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-2 flex flex-col gap-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.ltcl_merge_search_profiles}
                className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
              />
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-neutral-600 text-xs px-2 py-1.5">{t.ltcl_merge_no_profiles}</p>
                ) : (
                  filtered.map((e) => (
                    <button
                      key={e.handle}
                      onClick={() => { onPick(e.handle); close() }}
                      className={`flex items-center justify-between gap-2 w-full min-h-9 text-left text-sm rounded-lg px-3 py-2 transition-colors ${
                        e.handle === value ? 'bg-violet-600/20 text-white' : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate">@{e.handle}</span>
                      <span className="text-neutral-600 text-xs shrink-0">
                        {t.ltcl_merge_counts(e.completed.length, e.created.length, e.verified.length)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Dropdown picker over real site accounts (the merge target).
function AccountPicker({
  label, users, value, onPick,
}: {
  label: string
  users: UserRow[]
  value: string | null
  onPick: (id: string | null) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = users.find((u) => u.id === value) ?? null

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    return users.filter(
      (u) => !s || u.username.toLowerCase().includes(s) || (u.displayName ?? '').toLowerCase().includes(s),
    )
  }, [users, q])

  function close() { setOpen(false); setQ('') }

  return (
    <div className="flex-1 min-w-[12rem] flex flex-col gap-1.5">
      <p className="text-neutral-400 text-xs font-medium">{label}</p>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-left"
        >
          <span className={`text-sm truncate ${selected ? 'text-white' : 'text-neutral-500'}`}>
            {selected ? (
              <>
                {selected.displayName || selected.username}
                <span className="text-neutral-500 ml-1">@{selected.username}</span>
              </>
            ) : (
              t.ltcl_merge_select_account
            )}
          </span>
          <span className="flex items-center gap-2 shrink-0 ml-2">
            {selected && (
              <span
                onClick={(e) => { e.stopPropagation(); onPick(null) }}
                className="text-neutral-400 hover:text-red-400 text-xs"
                aria-label="clear"
              >✕</span>
            )}
            <span className="text-neutral-500 text-xs">▾</span>
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute left-0 right-0 mt-1 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-2 flex flex-col gap-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.ltcl_merge_search_accounts}
                className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
              />
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-neutral-600 text-xs px-2 py-1.5">{t.ltcl_merge_no_accounts}</p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { onPick(u.id); close() }}
                      className={`flex items-center justify-between gap-2 w-full min-h-9 text-left text-sm rounded-lg px-3 py-2 transition-colors ${
                        u.id === value ? 'bg-violet-600/20 text-white' : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate">
                        {u.displayName || u.username}
                        <span className="text-neutral-500 ml-1">@{u.username}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Lets list admins link an LTCL leaderboard identity (a raw name string that
// shows up in level records/creators/verifier, with no account of its own) to
// a real gdlt-hub account — rewriting every occurrence of that name across
// all levels to the account's canonical username, so profile links and
// display names resolve correctly everywhere going forward.
export default function LtclAdminMerge() {
  const { t } = useI18n()
  const { levels, loaded } = useLtclLevels()
  const entries = useMemo(() => buildLeaderboard(levels), [levels])

  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, 'id'>) }))
          .sort((a, b) => a.username.localeCompare(b.username)),
      )
      setUsersLoaded(true)
    })
  }, [])

  const [sourceHandle, setSourceHandle] = useState<string | null>(null)
  const [targetUid, setTargetUid] = useState<string | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  function pickSource(h: string | null) { setSourceHandle(h); setPreview(null); setDone(null); setError('') }
  function pickTarget(id: string | null) { setTargetUid(id); setPreview(null); setDone(null); setError('') }

  const targetUser = users.find((u) => u.id === targetUid) ?? null
  const alreadySame = !!sourceHandle && !!targetUser && sourceHandle === targetUser.username.trim().toLowerCase()
  const ready = !!sourceHandle && !!targetUser && !alreadySame

  async function run(dryRun: boolean) {
    if (!sourceHandle || !targetUser) return
    setRunning(true)
    setError('')
    try {
      if (dryRun) {
        setPreview(countLtclProfileMatches(levels, sourceHandle))
      } else {
        const n = await mergeLtclProfile(levels, sourceHandle, targetUser.username)
        setDone(n)
        setPreview(null)
        setSourceHandle(null)
        setTargetUid(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.ltcl_merge_failed)
    } finally {
      setRunning(false)
    }
  }

  if (!loaded || !usersLoaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-neutral-900 rounded-2xl px-4 py-3 flex flex-col gap-2">
        <p className="text-white font-medium text-sm">{t.ltcl_merge_title}</p>
        <p className="text-neutral-500 text-xs">{t.ltcl_merge_desc}</p>
      </div>

      <div className="bg-neutral-900 rounded-2xl px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-start">
          <ProfilePicker label={t.ltcl_merge_source} entries={entries} value={sourceHandle} onPick={pickSource} />
          <div className="text-neutral-500 text-lg self-center pt-4">→</div>
          <AccountPicker label={t.ltcl_merge_target} users={users} value={targetUid} onPick={pickTarget} />
        </div>

        {alreadySame && <p className="text-neutral-500 text-xs">{t.ltcl_merge_already_linked}</p>}
        {error && <p className="text-red-400 text-xs">{error}</p>}

        {preview === null && (
          <button
            onClick={() => run(true)}
            disabled={!ready || running}
            className="self-start bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {running ? t.ltcl_merge_running : t.ltcl_merge_preview}
          </button>
        )}

        {preview !== null && (
          <div className="border border-amber-800/60 bg-amber-950/30 rounded-xl px-4 py-3 flex flex-col gap-2">
            {preview === 0 ? (
              <p className="text-amber-200 text-sm">{t.ltcl_merge_none_found}</p>
            ) : (
              <>
                <p className="text-amber-200 text-sm font-medium">{t.ltcl_merge_preview_heading(preview)}</p>
                <p className="text-amber-300/90 text-xs">
                  {t.ltcl_merge_warning(`@${sourceHandle}`, targetUser!.displayName || targetUser!.username)}
                </p>
              </>
            )}
            <div className="flex gap-2 pt-1">
              {preview > 0 && (
                <button
                  onClick={() => run(false)}
                  disabled={running}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {running ? t.ltcl_merge_running : t.ltcl_merge_confirm}
                </button>
              )}
              <button
                onClick={() => setPreview(null)}
                disabled={running}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium px-4 py-2 rounded-lg"
              >
                {t.ltcl_merge_cancel}
              </button>
            </div>
          </div>
        )}

        {done !== null && (
          <div className="border border-emerald-800/60 bg-emerald-950/30 rounded-xl px-4 py-3">
            <p className="text-emerald-300 text-sm font-medium">{t.ltcl_merge_done(done)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

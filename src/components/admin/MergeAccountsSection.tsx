import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useI18n } from '../../i18n'
import Spinner from '../Spinner'

interface UserRow {
  id: string
  username: string
  displayName?: string
  createdAt?: number
}

// Discord-linked accounts use the numeric Discord id as their uid; legacy
// username/password accounts (and their leftover "ghost" docs) use a random
// Firebase uid containing letters. This tells the two apart in the picker.
const isDiscordId = (id: string) => /^\d+$/.test(id)

interface MergeResult {
  dryRun: boolean
  fromUid: string
  toUid: string
  targetUsername: string
  postsReassigned: number
  likeArrays: number
  comments: number
  notifications: number
  rolesAfter: string[]
}

const mergeAccountsFn = httpsCallable<
  { fromUid: string; toUid: string; dryRun: boolean },
  MergeResult
>(functions, 'mergeAccounts')

// A dropdown account picker: click to open a scrollable list of all users,
// filterable via the search box at the top.
function AccountPicker({
  label, users, value, exclude, onPick,
}: {
  label: string
  users: UserRow[]
  value: string | null
  exclude: string | null
  onPick: (id: string | null) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = users.find((u) => u.id === value) ?? null

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    return users
      .filter((u) => u.id !== exclude)
      .filter((u) => !s || u.username.toLowerCase().includes(s) || (u.displayName ?? '').toLowerCase().includes(s))
  }, [users, q, exclude])

  function close() { setOpen(false); setQ('') }

  return (
    <div className="flex-1 min-w-[12rem] flex flex-col gap-1.5">
      <p className="text-neutral-400 text-xs font-medium">{label}</p>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-left"
        >
          <span className={`text-sm truncate flex items-center gap-2 ${selected ? 'text-white' : 'text-neutral-500'}`}>
            {selected
              ? <>
                  <span className="truncate">{selected.displayName || selected.username}<span className="text-neutral-500 ml-1">@{selected.username}</span></span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                    isDiscordId(selected.id) ? 'border-indigo-500/40 text-indigo-300' : 'border-amber-500/40 text-amber-300'
                  }`}>
                    {isDiscordId(selected.id) ? t.merge_tag_discord : t.merge_tag_legacy}
                  </span>
                </>
              : t.merge_select}
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
                placeholder={t.merge_search}
                className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
              />
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-neutral-600 text-xs px-2 py-1.5">{t.merge_no_match}</p>
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
                      <span className="flex items-center gap-2 shrink-0">
                        {u.createdAt && (
                          <span className="text-neutral-600 text-xs">{new Date(u.createdAt).toISOString().slice(0, 10)}</span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          isDiscordId(u.id)
                            ? 'border-indigo-500/40 text-indigo-300'
                            : 'border-amber-500/40 text-amber-300'
                        }`}>
                          {isDiscordId(u.id) ? t.merge_tag_discord : t.merge_tag_legacy}
                        </span>
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

// Merge one account into another (transfer content, then delete the source).
// Calls the admin-only `mergeAccounts` Cloud Function. Always previews (dry run)
// before the destructive run.
export default function MergeAccountsSection() {
  const { t } = useI18n()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fromUid, setFromUid] = useState<string | null>(null)
  const [toUid, setToUid] = useState<string | null>(null)
  const [preview, setPreview] = useState<MergeResult | null>(null)
  const [done, setDone] = useState<MergeResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, 'id'>) }))
          .sort((a, b) => a.username.localeCompare(b.username)),
      )
      setLoading(false)
    })
  }, [])

  // Changing either selection invalidates a stale preview / result.
  function pickFrom(id: string | null) { setFromUid(id); setPreview(null); setDone(null); setError('') }
  function pickTo(id: string | null) { setToUid(id); setPreview(null); setDone(null); setError('') }

  const ready = !!fromUid && !!toUid && fromUid !== toUid
  const label = (id: string | null) => {
    const u = users.find((x) => x.id === id)
    return u ? (u.displayName || u.username) : ''
  }

  async function run(dryRun: boolean) {
    if (!ready) return
    setRunning(true)
    setError('')
    try {
      const res = await mergeAccountsFn({ fromUid: fromUid!, toUid: toUid!, dryRun })
      if (dryRun) setPreview(res.data)
      else { setDone(res.data); setPreview(null); setFromUid(null); setToUid(null) }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.merge_failed)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-neutral-900 rounded-2xl px-4 py-3 flex flex-col gap-2">
        <p className="text-white font-medium text-sm">{t.merge_title}</p>
        <p className="text-neutral-500 text-xs">{t.merge_desc}</p>
      </div>

      <div className="bg-neutral-900 rounded-2xl px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-start">
          <AccountPicker label={t.merge_from} users={users} value={fromUid} exclude={toUid} onPick={pickFrom} />
          <div className="text-neutral-500 text-lg self-center pt-4">→</div>
          <AccountPicker label={t.merge_to} users={users} value={toUid} exclude={fromUid} onPick={pickTo} />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {!preview && (
          <button
            onClick={() => run(true)}
            disabled={!ready || running}
            className="self-start bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {running ? t.merge_running : t.merge_preview}
          </button>
        )}

        {preview && (
          <div className="border border-amber-800/60 bg-amber-950/30 rounded-xl px-4 py-3 flex flex-col gap-2">
            <p className="text-amber-200 text-sm font-medium">{t.merge_preview_heading}</p>
            <ul className="text-neutral-300 text-xs flex flex-col gap-0.5">
              <li>{t.merge_stat_posts}: {preview.postsReassigned}</li>
              <li>{t.merge_stat_comments}: {preview.comments}</li>
              <li>{t.merge_stat_likes}: {preview.likeArrays}</li>
              <li>{t.merge_stat_notifs}: {preview.notifications}</li>
              <li>{t.merge_stat_roles}: {preview.rolesAfter.join(', ') || '—'}</li>
            </ul>
            <p className="text-amber-300/90 text-xs">{t.merge_warning(label(fromUid), label(toUid))}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => run(false)}
                disabled={running}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {running ? t.merge_running : t.merge_confirm}
              </button>
              <button
                onClick={() => setPreview(null)}
                disabled={running}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium px-4 py-2 rounded-lg"
              >
                {t.merge_cancel}
              </button>
            </div>
          </div>
        )}

        {done && (
          <div className="border border-emerald-800/60 bg-emerald-950/30 rounded-xl px-4 py-3">
            <p className="text-emerald-300 text-sm font-medium">{t.merge_done(done.targetUsername)}</p>
            <p className="text-neutral-400 text-xs mt-1">
              {t.merge_stat_posts}: {done.postsReassigned} · {t.merge_stat_comments}: {done.comments} · {t.merge_stat_likes}: {done.likeArrays} · {t.merge_stat_notifs}: {done.notifications}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

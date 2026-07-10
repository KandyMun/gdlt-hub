import { useMemo, useState } from 'react'
import { AuthorLink } from './AuthorLink'
import Avatar from './Avatar'
import { useI18n } from '../i18n'
import type { RegisteredUser } from '../registeredUsers'
import { emptyPersonEntry, type PersonRef, type PersonEntry } from '../personRef'

// Read-only rendering: a linked avatar + display name when it points at a real
// account, otherwise the plain fallback text (or nothing when unset).
export function PersonRefView({
  person,
  avatarSize = 20,
  className = '',
}: {
  person: PersonRef
  avatarSize?: number
  className?: string
}) {
  if (person.handle) {
    return <AuthorLink handle={person.handle} avatarSize={avatarSize} className={`inline-flex items-center gap-1.5 hover:text-violet-400 ${className}`} />
  }
  if (person.text) {
    return <span className={`text-neutral-300 ${className}`}>{person.text}</span>
  }
  return null
}

// Admin control: a free-text name field with an optional "link to a registered
// user" dropdown. Linking a user takes precedence over the text on display; the
// text is kept as a fallback for when no account is linked.
export function PersonRefPicker({
  value,
  onChange,
  users,
}: {
  value: PersonRef
  onChange: (p: PersonRef) => void
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const linked = value.handle ? users.find((u) => u.username === value.handle) ?? null : null

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    return users.filter(
      (u) => !s || u.username.toLowerCase().includes(s) || (u.displayName ?? '').toLowerCase().includes(s),
    )
  }, [users, q])

  function close() {
    setOpen(false)
    setQ('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={value.text ?? ''}
        onChange={(e) => onChange({ ...value, text: e.target.value || null })}
        placeholder={t.person_name_placeholder}
        className="flex-1 min-w-[10rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />

      <div className="relative shrink-0">
        {linked || value.handle ? (
          <span className="flex items-center gap-1.5 bg-violet-600/20 text-violet-200 rounded-lg pl-2 pr-1.5 py-1.5 text-sm">
            <Avatar username={value.handle!} size={18} />
            <span className="truncate max-w-[8rem]">{linked?.displayName || linked?.username || value.handle}</span>
            <button
              onClick={() => onChange({ ...value, handle: null })}
              className="text-violet-300 hover:text-red-400 text-xs"
              aria-label={t.person_unlink}
              title={t.person_unlink}
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            🔗 {t.person_link_user} <span className="text-neutral-500 text-xs">▾</span>
          </button>
        )}

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute right-0 mt-1 z-50 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-2 flex flex-col gap-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.person_search}
                className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
              />
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-neutral-600 text-xs px-2 py-1.5">{t.person_no_match}</p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => {
                        onChange({ ...value, handle: u.username })
                        close()
                      }}
                      className="flex items-center gap-2 w-full text-left text-sm rounded-lg px-2 py-1.5 text-neutral-200 hover:bg-neutral-800"
                    >
                      <Avatar username={u.username} photoURL={u.photoURL ?? ''} size={22} />
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

// Admin control for an entry's list of people, each with their own attempt
// count. Rows can be added and removed; at least one empty row is always shown
// so there's somewhere to type.
export function PeopleEditor({
  value,
  onChange,
  users,
}: {
  value: PersonEntry[]
  onChange: (people: PersonEntry[]) => void
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const rows = value.length ? value : [emptyPersonEntry()]

  const setRow = (i: number, next: PersonEntry) => onChange(rows.map((r, j) => (j === i ? next : r)))
  const removeRow = (i: number) => {
    const left = rows.filter((_, j) => j !== i)
    onChange(left.length ? left : [emptyPersonEntry()])
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[12rem]">
            <PersonRefPicker value={row.person} onChange={(person) => setRow(i, { ...row, person })} users={users} />
          </div>
          <input
            value={row.attempts}
            onChange={(e) => setRow(i, { ...row, attempts: e.target.value })}
            placeholder={t.people_attempts_placeholder}
            className="w-40 bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <button
            onClick={() => removeRow(i)}
            className="text-neutral-500 hover:text-red-400 text-sm px-1 shrink-0"
            aria-label={t.people_remove}
            title={t.people_remove}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, emptyPersonEntry()])}
        className="self-start text-xs text-neutral-400 hover:text-white border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg px-2.5 py-1 transition-colors"
      >
        ＋ {t.people_add}
      </button>
    </div>
  )
}

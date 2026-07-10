import { useState } from 'react'
import { useI18n } from '../i18n'
import {
  addAchievement,
  updateAchievement,
  deleteAchievement,
  moveAchievement,
  type Achievement,
} from '../achievements'
import type { RegisteredUser } from '../registeredUsers'
import { PeopleEditor, PersonRefView } from './PersonRef'
import { personRefIsEmpty, type PersonEntry } from '../personRef'

// One "top 10" list rendered as a ranked list of cards. When `canEdit` is set
// (admin / super-admin), each row gains reorder/edit/delete controls and an
// add-entry form appears at the bottom.
export default function AchievementListPanel({
  listId,
  entries,
  canEdit,
  users,
}: {
  listId: string
  entries: Achievement[]
  canEdit: boolean
  users: RegisteredUser[]
}) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-neutral-600 text-sm py-8 text-center">{t.achievements_empty}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {entries.map((a, i) => (
            <EntryRow key={a.id} item={a} index={i} total={entries.length} entries={entries} canEdit={canEdit} users={users} />
          ))}
        </ol>
      )}

      {canEdit && <AddEntryForm listId={listId} entries={entries} users={users} />}
    </div>
  )
}

// Parse the leading number out of a free-form attempts string ("255 021",
// "~80 000", "100 000+") so the suffix can agree with it grammatically.
function attemptCount(s: string): number {
  const digits = s.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : NaN
}

// Read-only "person — attempts" line(s) for an entry.
function PeopleView({ people }: { people: PersonEntry[] }) {
  const { t } = useI18n()
  const shown = people.filter((p) => !personRefIsEmpty(p.person) || p.attempts.trim())
  if (shown.length === 0) return null
  return (
    <ul className="flex flex-col gap-0.5 mt-0.5">
      {shown.map((p, i) => (
        <li key={i} className="text-neutral-400 text-xs flex items-center gap-1.5 flex-wrap">
          <PersonRefView person={p.person} avatarSize={16} />
          {p.attempts.trim() && <span className="text-neutral-500">— {p.attempts.trim()} {t.people_attempts_suffix(attemptCount(p.attempts))}</span>}
        </li>
      ))}
    </ul>
  )
}

function EntryRow({
  item,
  index,
  total,
  entries,
  canEdit,
  users,
}: {
  item: Achievement
  index: number
  total: number
  entries: Achievement[]
  canEdit: boolean
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [link, setLink] = useState(item.link)
  const [people, setPeople] = useState<PersonEntry[]>(item.people)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await updateAchievement(item.id, { title, link, people })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setTitle(item.title)
    setLink(item.link)
    setPeople(item.people)
    setEditing(false)
  }

  return (
    <li className="flex gap-2.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
      <span className="shrink-0 w-5 h-5 mt-0.5 rounded-md bg-violet-600/20 text-violet-300 text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>

      {editing ? (
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.achievements_field_title}
            className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t.achievements_field_link}
            className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <p className="text-neutral-500 text-xs">{t.people_label}</p>
          <PeopleEditor value={people} onChange={setPeople} users={users} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !title.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg">{t.achievements_save}</button>
            <button onClick={cancel} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium px-3 py-1.5 rounded-lg">{t.achievements_cancel}</button>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="text-white text-sm font-medium leading-snug hover:text-violet-300 hover:underline inline-flex items-center gap-1 w-fit"
            >
              {item.title}
              <span className="text-neutral-500 text-[10px]" aria-hidden="true">↗</span>
            </a>
          ) : (
            <h3 className="text-white text-sm font-medium leading-snug">{item.title}</h3>
          )}
          <PeopleView people={item.people} />
        </div>
      )}

      {canEdit && !editing && (
        <div className="flex items-start gap-1 shrink-0">
          <button onClick={() => moveAchievement(entries, item.id, -1)} disabled={index === 0} className="text-neutral-500 hover:text-white disabled:opacity-30 text-sm px-1" aria-label={t.hub_move_up}>▲</button>
          <button onClick={() => moveAchievement(entries, item.id, 1)} disabled={index === total - 1} className="text-neutral-500 hover:text-white disabled:opacity-30 text-sm px-1" aria-label={t.hub_move_down}>▼</button>
          <button onClick={() => setEditing(true)} className="text-neutral-400 hover:text-violet-300 text-xs px-1.5" aria-label={t.achievements_edit}>{t.achievements_edit}</button>
          <button onClick={() => deleteAchievement(entries, item.id)} className="text-neutral-500 hover:text-red-400 text-sm px-1" aria-label={t.achievements_delete}>✕</button>
        </div>
      )}
    </li>
  )
}

function AddEntryForm({
  listId,
  entries,
  users,
}: {
  listId: string
  entries: Achievement[]
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [people, setPeople] = useState<PersonEntry[]>([])
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await addAchievement(entries, listId, { title, link, people })
      setTitle('')
      setLink('')
      setPeople([])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-2xl px-4 py-3 flex flex-col gap-2">
      <p className="text-neutral-400 text-xs font-medium">{t.achievements_add_entry}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.achievements_field_title}
        className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder={t.achievements_field_link}
        className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />
      <p className="text-neutral-500 text-xs">{t.people_label}</p>
      <PeopleEditor value={people} onChange={setPeople} users={users} />
      <button
        onClick={handleAdd}
        disabled={saving || !title.trim()}
        className="self-start bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        {t.achievements_add}
      </button>
    </div>
  )
}

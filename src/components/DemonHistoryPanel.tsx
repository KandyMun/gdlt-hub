import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import {
  useDemonHistory,
  addDemonEntry,
  updateDemonEntry,
  deleteDemonEntry,
  type DemonEntry,
} from '../demonHistory'
import type { RegisteredUser } from '../registeredUsers'
import { PersonRefPicker, PersonRefView } from './PersonRef'
import { EMPTY_PERSON, personRefIsEmpty, type PersonRef } from '../personRef'
import Markdown from './Markdown'
import Spinner from './Spinner'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Date input that always shows/accepts the `YYYY-MM-DD` format (regardless of
// browser locale), with a calendar button that opens the native picker. The
// hidden `type="date"` input feeds picked values back as `YYYY-MM-DD`.
function DateField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  const pickerRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative w-40">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="YYYY-MM-DD"
        aria-label={ariaLabel}
        className="w-full bg-neutral-800 text-white rounded-lg pl-3 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={ISO_DATE.test(value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0 [color-scheme:dark]"
      />
      <button
        type="button"
        onClick={() => pickerRef.current?.showPicker?.()}
        aria-label={ariaLabel}
        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
    </div>
  )
}

// The hardest-extreme-demon history timeline (newest-first; the top entry is the
// current holder). When `canEdit` is set, each entry gains reorder/edit/delete
// controls and an add-entry form appears at the bottom.
export default function DemonHistoryPanel({
  canEdit,
  users,
}: {
  canEdit: boolean
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const { items, loaded } = useDemonHistory()

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-neutral-600 text-sm py-8 text-center">{t.demon_empty}</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-neutral-800 pl-6 ml-1">
          {items.map((d, i) => (
            <EntryRow key={d.id} item={d} index={i} entries={items} canEdit={canEdit} users={users} />
          ))}
        </ol>
      )}

      {canEdit && <AddEntryForm entries={items} users={users} />}
    </div>
  )
}

function EntryRow({
  item,
  index,
  entries,
  canEdit,
  users,
}: {
  item: DemonEntry
  index: number
  entries: DemonEntry[]
  canEdit: boolean
  users: RegisteredUser[]
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [levelName, setLevelName] = useState(item.levelName)
  const [date, setDate] = useState(item.date)
  const [note, setNote] = useState(item.note)
  const [person, setPerson] = useState<PersonRef>(item.person)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!levelName.trim() || busy) return
    setBusy(true)
    try {
      await updateDemonEntry(item.id, { levelName, date, note, person })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setLevelName(item.levelName)
    setDate(item.date)
    setNote(item.note)
    setPerson(item.person)
    setEditing(false)
  }

  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.72rem] top-1.5 w-3 h-3 rounded-full ring-4 ring-neutral-950 ${
          index === 0 ? 'bg-amber-400' : 'bg-neutral-600'
        }`}
        aria-hidden="true"
      />
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-4 flex items-start gap-2">
        {editing ? (
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                placeholder={t.demon_field_level}
                className="flex-1 min-w-[12rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
              />
              <DateField value={date} onChange={setDate} ariaLabel={t.demon_field_date} />
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.demon_field_note}
              rows={2}
              className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-y"
            />
            <PersonRefPicker value={person} onChange={setPerson} users={users} />
            <div className="flex gap-2">
              <button onClick={save} disabled={busy || !levelName.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg">{t.demon_save}</button>
              <button onClick={cancel} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium px-3 py-1.5 rounded-lg">{t.demon_cancel}</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-white font-semibold leading-snug">{item.levelName}</h3>
              {index === 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded px-1.5 py-0.5">
                  {t.demon_current}
                </span>
              )}
              {item.date && <span className="text-neutral-500 text-xs">{item.date}</span>}
            </div>
            {!personRefIsEmpty(item.person) && (
              <div className="text-neutral-400 text-sm mt-1 flex items-center gap-1.5">
                <span className="text-neutral-500">{t.demon_verified_by}</span>
                <PersonRefView person={item.person} />
              </div>
            )}
            {item.note && <div className="mt-1"><Markdown text={item.note} /></div>}
          </div>
        )}

        {canEdit && !editing && (
          <div className="flex items-start gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="text-neutral-400 hover:text-violet-300 text-xs px-1.5" aria-label={t.demon_edit}>{t.demon_edit}</button>
            <button onClick={() => deleteDemonEntry(entries, item.id)} className="text-neutral-500 hover:text-red-400 text-sm px-1" aria-label={t.demon_delete}>✕</button>
          </div>
        )}
      </div>
    </li>
  )
}

function AddEntryForm({ entries, users }: { entries: DemonEntry[]; users: RegisteredUser[] }) {
  const { t } = useI18n()
  const [levelName, setLevelName] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [person, setPerson] = useState<PersonRef>(EMPTY_PERSON)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!levelName.trim() || saving) return
    setSaving(true)
    try {
      await addDemonEntry(entries, { levelName, date, note, person })
      setLevelName('')
      setDate('')
      setNote('')
      setPerson(EMPTY_PERSON)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-2xl px-4 py-3 flex flex-col gap-2">
      <p className="text-neutral-400 text-xs font-medium">{t.demon_add_entry}</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          placeholder={t.demon_field_level}
          className="flex-1 min-w-[12rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <DateField value={date} onChange={setDate} ariaLabel={t.demon_field_date} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.demon_field_note}
        rows={2}
        className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-y"
      />
      <PersonRefPicker value={person} onChange={setPerson} users={users} />
      <button
        onClick={handleAdd}
        disabled={saving || !levelName.trim()}
        className="self-start bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        {t.demon_add}
      </button>
    </div>
  )
}

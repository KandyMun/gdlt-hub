import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import {
  type LtclLevel,
  type LtclRecord,
  pointsForPlacement,
  uploadLevelThumbnail,
} from '../ltclLevels'
import { useAuth } from '../AuthContext'
import { useFileDrop } from '../useFileDrop'

interface Props {
  level: LtclLevel | null // null = adding a new level
  levels: LtclLevel[] // current (draft) full list, for reorder/add math
  canManageLevels: boolean // false = records-only editor (moderator)
  onClose: () => void
  // Metadata/record edits save immediately; placement changes (add/move/remove)
  // are staged on the parent's draft and only written when the admin commits.
  onSaveMeta: (level: LtclLevel) => Promise<void>
  onStageAdd: (level: LtclLevel, placement: number) => void
  onStageMove: (levelId: number, placement: number) => void
  onStageRemove: (levelId: number) => void
}

// While editing, record fields are held as plain strings so partial input like
// "7." types cleanly; they're parsed back to numbers on save.
type EditRecord = { username: string; enjoyment: string; video: string }

interface UserRow {
  id: string
  username: string
  displayName?: string
}

// Record "username" is a plain Discord-username string (see ltclLevels.ts) —
// this just helps type it in faster. Typing filters a dropdown of matching
// site accounts; picking one fills in their raw username (the leaderboard /
// profile link resolution elsewhere shows their chosen display name for it).
// Nothing stops typing a name that matches no account, for players without a
// site account — it's saved as plain text same as before.
function UsernameField({
  value,
  onChange,
  users,
  placeholder,
  className,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  users: UserRow[]
  placeholder: string
  className: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const s = value.toLowerCase().trim()
    const matches = s
      ? users.filter((u) => u.username.toLowerCase().includes(s) || (u.displayName ?? '').toLowerCase().includes(s))
      : users
    return matches.slice(0, 8)
  }, [users, value])

  function pick(u: UserRow) {
    onChange(u.username)
    setOpen(false)
  }

  return (
    <div className="relative min-w-0">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && !disabled && filtered.length > 0 && <UserOptions users={filtered} onPick={pick} />}
    </div>
  )
}

// The shared dropdown of matching site accounts. onPick fires on mousedown so it
// runs before the input's onBlur closes the list.
function UserOptions({ users, onPick }: { users: UserRow[]; onPick: (u: UserRow) => void }) {
  return (
    <div className="absolute left-0 right-0 mt-1 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onPick(u) }}
          className="flex items-center gap-1.5 w-full text-left text-sm px-3 py-1.5 text-neutral-200 hover:bg-neutral-800 truncate"
        >
          <span className="truncate">{u.displayName || u.username}</span>
          <span className="text-neutral-500 text-xs shrink-0">@{u.username}</span>
        </button>
      ))}
    </div>
  )
}

// Creators is a comma-separated list of names. Autocomplete works on the segment
// after the last comma, so several people can be picked or typed in a row;
// picking one replaces that trailing segment with the account's username and
// appends ", " ready for the next. Free text is preserved for people with no
// site account, exactly like plain typing.
function CreatorsField({
  value,
  onChange,
  users,
  placeholder,
  className,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  users: UserRow[]
  placeholder: string
  className: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const lastSegment = value.slice(value.lastIndexOf(',') + 1).toLowerCase().trim()
    // Names already entered — don't suggest them again.
    const chosen = new Set(value.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean))
    const matches = users.filter((u) => {
      if (chosen.has(u.username.toLowerCase())) return false
      if (!lastSegment) return true
      return u.username.toLowerCase().includes(lastSegment) || (u.displayName ?? '').toLowerCase().includes(lastSegment)
    })
    return matches.slice(0, 8)
  }, [users, value])

  function pick(u: UserRow) {
    const head = value.slice(0, value.lastIndexOf(',') + 1)
    const prefix = head ? `${head.replace(/\s*$/, '')} ` : ''
    onChange(`${prefix}${u.username}, `)
    setOpen(true) // keep open so the next creator can be added
  }

  return (
    <div className="relative min-w-0">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && !disabled && filtered.length > 0 && <UserOptions users={filtered} onPick={pick} />}
    </div>
  )
}

const blank: LtclLevel = {
  levelId: 0,
  name: '',
  publisher: '',
  creators: [],
  verifier: '',
  songId: null,
  songLink: null,
  isNong: false,
  password: null,
  verificationUrl: null,
  youtubeId: null,
  placement: null,
  points: null,
  thumbnail: null,
  records: [],
}

export default function LtclLevelEditor({
  level,
  levels,
  canManageLevels,
  onClose,
  onSaveMeta,
  onStageAdd,
  onStageMove,
  onStageRemove,
}: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const isNew = level === null
  const base = level ?? blank
  // Moderators (records-only) can't change level metadata, placement, or delete.
  const metaLocked = !canManageLevels

  const [name, setName] = useState(base.name)
  const [levelId, setLevelId] = useState(base.levelId ? String(base.levelId) : '')
  const [publisher, setPublisher] = useState(base.publisher)
  const [verifier, setVerifier] = useState(base.verifier)
  const [creators, setCreators] = useState(base.creators.join(', '))
  const [verificationUrl, setVerificationUrl] = useState(base.verificationUrl ?? '')
  const [songId, setSongId] = useState(base.songId != null ? String(base.songId) : '')
  const [songLink, setSongLink] = useState(base.songLink ?? '')
  const [isNong, setIsNong] = useState(base.isNong)
  const [password, setPassword] = useState(base.password ?? '')
  const [placement, setPlacement] = useState(
    base.placement != null ? String(base.placement) : String(levels.length + 1),
  )
  const [records, setRecords] = useState<EditRecord[]>(
    base.records.map((r) => ({
      username: r.username,
      enjoyment: r.enjoyment == null ? '' : String(r.enjoyment),
      video: r.video ?? '',
    })),
  )

  const [thumbnail, setThumbnail] = useState(base.thumbnail ?? '')
  const [thumbUploading, setThumbUploading] = useState(false)

  const [users, setUsers] = useState<UserRow[]>([])
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, 'id'>) })))
    })
  }, [])

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  async function handleThumbUpload(file: File | undefined) {
    if (!file || !user) return
    setError('')
    setThumbUploading(true)
    try {
      setThumbnail(await uploadLevelThumbnail(file, user.uid))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg === 'too-large' ? t.ltcl_edit_thumb_big : t.ltcl_edit_thumb_failed)
    } finally {
      setThumbUploading(false)
    }
  }

  const { dragging: thumbDragging, dropProps: thumbDropProps } = useFileDrop(handleThumbUpload)

  const placementNum = Math.max(1, Number(placement) || 1)
  const previewPoints = pointsForPlacement(placementNum)

  function setRecord(i: number, patch: Partial<EditRecord>) {
    setRecords((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function cleanRecords(): LtclRecord[] {
    return records
      .filter((r) => r.username.trim())
      .map((r) => {
        const e = r.enjoyment.trim()
        const n = e === '' ? null : Number(e)
        return {
          username: r.username.trim(),
          enjoyment: n === null || Number.isNaN(n) ? null : n,
          video: r.video.trim() ? r.video.trim() : null,
        }
      })
  }

  async function handleSave() {
    setError('')

    // Records-only editor (moderator): save records immediately, no staging.
    if (metaLocked) {
      setSaving(true)
      try {
        await onSaveMeta({ ...base, records: cleanRecords() })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        setSaving(false)
      }
      return
    }

    const idNum = Number(levelId)
    if (!idNum || !Number.isFinite(idNum)) return setError(t.ltcl_edit_id_required)
    if (isNew && levels.some((l) => l.levelId === idNum)) return setError(t.ltcl_edit_id_taken)

    const next: LtclLevel = {
      ...base,
      levelId: idNum,
      name: name.trim(),
      publisher: publisher.trim(),
      verifier: verifier.trim(),
      creators: creators.split(',').map((c) => c.trim()).filter(Boolean),
      verificationUrl: verificationUrl.trim() || null,
      songId: songId.trim() ? Number(songId) : null,
      songLink: songLink.trim() || null,
      isNong,
      password: password.trim() || null,
      placement: placementNum,
      points: previewPoints,
      thumbnail: thumbnail.trim() || null,
      records: cleanRecords(),
    }

    setSaving(true)
    try {
      if (isNew) {
        // Adds stage entirely (the new level's metadata lives only in the draft
        // until commit).
        onStageAdd(next, placementNum)
      } else {
        // Metadata/records write now; a placement change is staged as a move.
        await onSaveMeta(next)
        if (base.placement !== placementNum) onStageMove(next.levelId, placementNum)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!level) return
    // Removal is staged; it isn't written until the admin commits.
    onStageRemove(level.levelId)
    onClose()
  }

  const inputCls =
    'w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500'
  const labelCls = 'text-xs font-semibold uppercase tracking-wide text-neutral-400'
  // Metadata inputs are read-only for records-only editors (moderators).
  const metaCls = metaLocked ? `${inputCls} opacity-60 cursor-not-allowed` : inputCls

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-neutral-900 flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {isNew ? t.ltcl_edit_add_title : t.ltcl_edit_edit_title}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_edit_name}</label>
              <input className={metaCls} value={name} onChange={(e) => setName(e.target.value)} disabled={metaLocked} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_list_level_id}</label>
              <input
                className={`${inputCls} ${isNew ? '' : 'opacity-60'}`}
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                disabled={!isNew}
                inputMode="numeric"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_list_publisher}</label>
              <UsernameField
                className={metaCls}
                placeholder=""
                value={publisher}
                onChange={setPublisher}
                users={users}
                disabled={metaLocked}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_list_verifier}</label>
              <UsernameField
                className={metaCls}
                placeholder=""
                value={verifier}
                onChange={setVerifier}
                users={users}
                disabled={metaLocked}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>{t.ltcl_list_creators} <span className="text-neutral-600 normal-case">({t.ltcl_edit_creators_hint})</span></label>
            <CreatorsField
              className={metaCls}
              placeholder=""
              value={creators}
              onChange={setCreators}
              users={users}
              disabled={metaLocked}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>{t.ltcl_edit_verification}</label>
            <input className={metaCls} value={verificationUrl} onChange={(e) => setVerificationUrl(e.target.value)} placeholder="https://youtu.be/…" disabled={metaLocked} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            {/* NONG → external download link; otherwise a Newgrounds song ID. */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{isNong ? t.ltcl_edit_song_link : t.ltcl_list_song}</label>
              {isNong ? (
                <input className={metaCls} value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="https://…" disabled={metaLocked} />
              ) : (
                <input className={metaCls} value={songId} onChange={(e) => setSongId(e.target.value)} inputMode="numeric" disabled={metaLocked} />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300 pb-2">
              <input type="checkbox" checked={isNong} onChange={(e) => setIsNong(e.target.checked)} className="accent-violet-500" disabled={metaLocked} />
              {t.ltcl_edit_nong}
            </label>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_edit_password}</label>
              <input className={metaCls} value={password} onChange={(e) => setPassword(e.target.value)} disabled={metaLocked} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_edit_placement}</label>
              <input className={metaCls} value={placement} onChange={(e) => setPlacement(e.target.value)} inputMode="numeric" disabled={metaLocked} />
            </div>
          </div>

          <p className="text-sm text-neutral-400">
            {t.ltcl_list_points}: <span className="text-white font-semibold">{previewPoints}</span>
            {placementNum > 100 && <span className="text-amber-400 ml-2">{t.ltcl_list_legacy}</span>}
          </p>

          {!metaLocked && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>{t.ltcl_edit_thumbnail}</label>
              <div className="flex items-center gap-3" {...thumbDropProps}>
                {thumbnail && (
                  <img src={thumbnail} alt="" className={`w-24 h-14 object-cover rounded-md border transition-colors ${thumbDragging ? 'border-violet-400' : 'border-neutral-700'}`} />
                )}
                <label className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${thumbDragging ? 'bg-violet-800/60 ring-2 ring-violet-400 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'}`}>
                  {thumbUploading ? t.profile_uploading : thumbDragging ? t.new_post_drop_hint : t.ltcl_edit_thumb_upload}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { handleThumbUpload(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {thumbnail && (
                  <button onClick={() => setThumbnail('')} className="text-xs text-neutral-400 hover:text-red-400">
                    ✕ {t.ltcl_edit_thumb_upload}
                  </button>
                )}
              </div>
              <p className="text-neutral-600 text-xs">{t.ltcl_edit_thumb_hint}</p>
            </div>
          )}

          {/* Records */}
          <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
            <div className="flex items-center justify-between">
              <label className={labelCls}>{t.ltcl_list_records}</label>
              <button
                onClick={() => setRecords((rs) => [...rs, { username: '', enjoyment: '', video: '' }])}
                className="text-violet-400 hover:text-violet-300 text-sm font-medium"
              >
                + {t.ltcl_edit_add_record}
              </button>
            </div>
            {records.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_1.25rem] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                <span>{t.ltcl_edit_username}</span>
                <span className="text-center">{t.ltcl_edit_enjoyment}</span>
                <span>{t.ltcl_edit_video}</span>
                <span />
              </div>
            )}
            {records.map((r, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_1.25rem] gap-2 items-center">
                <UsernameField
                  className={`${inputCls} min-w-0`}
                  placeholder={t.ltcl_edit_username}
                  value={r.username}
                  onChange={(v) => setRecord(i, { username: v })}
                  users={users}
                />
                {/* Enjoyment is editable by list admins and moderators. */}
                <input
                  className={`${inputCls} min-w-0 text-center px-1`}
                  placeholder="0–10"
                  value={r.enjoyment}
                  inputMode="decimal"
                  onChange={(e) => setRecord(i, { enjoyment: e.target.value })}
                />
                <input
                  className={`${inputCls} min-w-0`}
                  placeholder={t.ltcl_edit_video}
                  value={r.video}
                  onChange={(e) => setRecord(i, { video: e.target.value })}
                />
                <button
                  onClick={() => setRecords((rs) => rs.filter((_, j) => j !== i))}
                  className="text-neutral-500 hover:text-red-400"
                  aria-label="remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-neutral-900 flex items-center justify-between gap-3 p-5 border-t border-neutral-800">
          <div>
            {!isNew && canManageLevels &&
              (confirmDelete ? (
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {t.ltcl_edit_confirm_delete}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  {t.ltcl_edit_delete}
                </button>
              ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-sm">{t.cancel}</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {saving ? t.profile_saving : t.profile_save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

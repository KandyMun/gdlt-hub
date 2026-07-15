import { useEffect, useState } from 'react'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import {
  fetchPointercrateStats,
  type PointercrateStats as Stats,
  type PointercrateHardest,
} from '../pointercrate'
import { levelThumbnailUrl } from '../aredl'
import Spinner from './Spinner'

type State =
  | { kind: 'idle' } // no pointercrate name linked
  | { kind: 'loading' }
  | { kind: 'none' } // linked name not found on pointercrate
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; stats: Stats }

const fmt = (n: number) => n.toLocaleString('en-US')
const fmtPts = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900/40 backdrop-blur-[7px] border border-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
      <p className="text-white text-lg font-semibold leading-tight">{value}</p>
      <p className="text-neutral-400 text-xs mt-1">{label}</p>
    </div>
  )
}

// Blurred, darkened backdrop of the hardest demon's thumbnail — same treatment
// as the AREDL card (AredlStats.tsx). Fades in on load; shows nothing on error
// so the plain card background shows through instead.
function HardestBackdrop({ levelId }: { levelId: number }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { setOk(false) }, [levelId])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img
        src={levelThumbnailUrl(levelId)}
        alt=""
        onLoad={() => setOk(true)}
        className={`w-full h-full object-cover scale-105 transition-opacity duration-500 ${ok ? 'opacity-60' : 'opacity-0'}`}
      />
      <div className="absolute inset-0 bg-neutral-950/50" />
    </div>
  )
}

// Segmented panel naming the hardest demon and its current list placement.
function HardestBanner({ hardest }: { hardest: PointercrateHardest | null }) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px] px-4 py-3">
      <p className="text-sky-300/90 text-[11px] font-semibold uppercase tracking-wider">
        {t.pc_hardest}
      </p>
      {hardest ? (
        <div className="flex items-baseline justify-between gap-3 mt-1">
          <span className="text-white text-xl font-bold truncate">{hardest.name}</span>
          <span className="shrink-0 text-neutral-200 text-sm">#{hardest.position}</span>
        </div>
      ) : (
        <p className="text-neutral-500 text-sm italic mt-1">{t.pc_no_records}</p>
      )}
    </div>
  )
}

// Pointercrate player-name editor (owner only). Saving an empty value unlinks.
// Pointercrate has no Discord link to verify against, so we only confirm the
// name resolves to a real player before saving.
function UsernameEditor({
  uid,
  initial,
  onSaved,
  onCancel,
}: {
  uid: string
  initial: string
  onSaved: (name: string) => void
  onCancel?: () => void
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const trimmed = value.trim()

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (trimmed !== '') {
        let stats: Stats | null
        try {
          stats = await fetchPointercrateStats(trimmed)
        } catch (err) {
          setError(t.pc_error_detail(err instanceof Error ? err.message : String(err)))
          return
        }
        if (!stats) {
          setError(t.pc_not_found(trimmed))
          return
        }
      }
      await updateDoc(doc(db, 'users', uid), {
        pointercrateUsername: trimmed === '' ? deleteField() : trimmed,
      })
      onSaved(trimmed)
    } catch {
      setError(t.pc_error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 50))}
          placeholder={t.pc_username_placeholder}
          maxLength={50}
          className="flex-1 bg-neutral-800 text-white text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-neutral-500"
        />
        {onCancel && (
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-200 text-sm px-2">
            {t.cancel}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? t.profile_saving : t.profile_save}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <p className="text-neutral-600 text-xs">{t.pc_username_hint}</p>
    </div>
  )
}

export default function PointercrateStats({
  uid,
  pointercrateUsername,
  isOwner,
  onSaved,
  onVisibilityChange,
}: {
  uid: string
  pointercrateUsername?: string
  isOwner: boolean
  onSaved: (name: string) => void
  onVisibilityChange?: (visible: boolean) => void
}) {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [editing, setEditing] = useState(false)

  const handleSaved = (v: string) => {
    setEditing(false)
    onSaved(v)
  }

  useEffect(() => {
    setEditing(false)
    if (!pointercrateUsername) {
      setState({ kind: 'idle' })
      return
    }
    let active = true
    setState({ kind: 'loading' })
    fetchPointercrateStats(pointercrateUsername)
      .then((stats) => {
        if (!active) return
        setState(stats ? { kind: 'loaded', stats } : { kind: 'none' })
      })
      .catch((err: unknown) => {
        if (active) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
        }
      })
    return () => {
      active = false
    }
  }, [pointercrateUsername, uid])

  // Owners always see the slide (to add/manage their name); visitors only see it
  // once real stats have loaded.
  const visible = isOwner || state.kind === 'loaded'
  useEffect(() => {
    onVisibilityChange?.(visible)
  }, [visible, onVisibilityChange])

  if (!visible) return null

  // Level-thumbnail backdrop, shown only once loaded and the hardest demon has a
  // resolvable level id (mirrors the AREDL card).
  const hardestLevelId =
    state.kind === 'loaded' && state.stats.hardest?.levelId != null
      ? state.stats.hardest.levelId
      : undefined

  return (
    <div className={`relative rounded-2xl overflow-hidden ${hardestLevelId !== undefined ? '' : 'bg-neutral-900'}`}>
      {hardestLevelId !== undefined && <HardestBackdrop levelId={hardestLevelId} />}
      <div className="relative p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-neutral-300 font-medium">{t.pc_title}</h2>
          {state.kind === 'loaded' && (
            <div className="flex items-center gap-3">
              {isOwner && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  title={t.pc_username_label}
                  className="text-neutral-500 hover:text-sky-400 text-sm transition-colors"
                >
                  ✎
                </button>
              )}
              <a
                href={state.stats.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 text-sm"
              >
                {t.pc_view} ↗
              </a>
            </div>
          )}
        </div>

        {editing && isOwner ? (
          <UsernameEditor
            uid={uid}
            initial={pointercrateUsername ?? ''}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        ) : state.kind === 'idle' ? (
          <UsernameEditor uid={uid} initial="" onSaved={handleSaved} />
        ) : state.kind === 'loading' ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : state.kind === 'none' || state.kind === 'error' ? (
          <div className="flex flex-col gap-3">
            <p className="text-neutral-500 text-sm">
              {state.kind === 'none'
                ? t.pc_not_found(pointercrateUsername ?? '')
                : t.pc_error_detail(state.message)}
            </p>
            {isOwner && (
              <UsernameEditor uid={uid} initial={pointercrateUsername ?? ''} onSaved={handleSaved} />
            )}
          </div>
        ) : (
          <>
            <HardestBanner hardest={state.stats.hardest} />

            <div className="grid grid-cols-2 gap-2">
              <Stat label={t.pc_points} value={fmtPts(state.stats.listPoints)} />
              <Stat label={t.pc_rank} value={state.stats.rank ? `#${fmt(state.stats.rank)}` : '—'} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label={t.pc_main} value={fmt(state.stats.mainCount)} />
              <Stat label={t.pc_extended} value={fmt(state.stats.extendedCount)} />
              <Stat label={t.pc_legacy} value={fmt(state.stats.legacyCount)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

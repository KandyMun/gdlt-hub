import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../AuthContext'
import { useFileDrop } from '../useFileDrop'
import {
  useLtclLevels,
  uploadLevelThumbnail,
  updateLevelThumbnail,
  saveLevelMeta,
  applyAdd,
  applyMove,
  applyRemove,
  commitStagedChanges,
  LEGACY_AFTER,
  type LtclLevel,
  type ChangelogEntry,
} from '../ltclLevels'
import { useCan } from '../permissions'
import { useDraftGuard } from './draftGuardContext'
import LtclLevelEditor from './LtclLevelEditor'
import Spinner from './Spinner'

// A single level row in the admin list. Split out from the parent so each row
// can own its own drag-and-drop state (useFileDrop is a hook — it can't be
// called once per item inside a .map()). Dropping an image directly onto the
// row uploads it and replaces the level's thumbnail immediately, without
// opening the full editor; dropping is only wired up for staff who can
// actually manage level metadata.
function LevelRow({
  level,
  rank,
  canManageLevels,
  onOpen,
}: {
  level: LtclLevel
  rank: number
  canManageLevels: boolean
  onOpen: () => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleDrop(file?: File) {
    if (!file || !user) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadLevelThumbnail(file, user.uid)
      await updateLevelThumbnail(level.levelId, url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg === 'too-large' ? t.ltcl_edit_thumb_big : t.ltcl_edit_thumb_failed)
    } finally {
      setUploading(false)
    }
  }

  const { dragging, dropProps } = useFileDrop(handleDrop)
  const showThumbSlot = level.thumbnail || uploading

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onOpen}
        {...(canManageLevels ? dropProps : {})}
        className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-lg text-sm text-neutral-200 bg-neutral-800/50 hover:bg-neutral-800 transition-colors ${
          dragging ? 'ring-2 ring-violet-400 bg-violet-950/40' : ''
        }`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          <span className="text-neutral-500 shrink-0">#{rank}</span>
          {showThumbSlot && (
            <span className="relative w-8 h-8 shrink-0">
              {level.thumbnail && (
                <img
                  src={level.thumbnail}
                  alt=""
                  className={`w-8 h-8 object-cover rounded transition-opacity ${uploading ? 'opacity-40' : ''}`}
                />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                </span>
              )}
            </span>
          )}
          <span className="font-medium truncate">{level.name}</span>
          {rank > LEGACY_AFTER && (
            <span className="text-[10px] uppercase tracking-wide text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded-full shrink-0">
              {t.ltcl_list_legacy}
            </span>
          )}
        </span>
        <span className="text-neutral-500 text-xs shrink-0">
          {t.ltcl_admin_recs(level.records.length)} · {t.ltcl_admin_edit}
        </span>
      </button>
      {error && <p className="text-red-400 text-xs px-3">{error}</p>}
    </div>
  )
}

// Level management for the LTCL admin panel: add, edit, delete and reorder
// levels (and their records) via the shared level editor. Moderators with only
// manage_records get the records-only editor; the editor enforces that.
//
// Placement changes (add / move / remove) don't write straight to Firestore —
// they stack up on an in-memory `draft` and are only written when the admin hits
// Commit. Metadata/record edits still save immediately. The pending bar + the
// DraftGuard (exit alert) surface un-committed work.
export default function LtclAdminLevels() {
  const { t } = useI18n()
  const canManageLevels = useCan('manage_levels')
  const { levels, loaded } = useLtclLevels()
  const guard = useDraftGuard()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<LtclLevel | null>(null)
  const [adding, setAdding] = useState(false)

  // The working copy shown + edited. Staged edits mutate it; when there's
  // nothing staged it mirrors the live list.
  const [draft, setDraft] = useState<LtclLevel[]>([])
  const [log, setLog] = useState<ChangelogEntry[]>([])
  const [committing, setCommitting] = useState(false)
  const pending = log.length > 0

  // Keep the draft in sync with the live list while nothing is staged. This is
  // a deliberate external→state sync (Firestore snapshot → editable draft).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending) setDraft(levels)
  }, [levels, pending])

  // ── Staging handlers ──
  const onSaveMeta = useCallback(async (lvl: LtclLevel) => {
    await saveLevelMeta(lvl)
    // Keep the draft's copy in step (metadata only — placement stays draft-owned).
    setDraft((d) =>
      d.map((l) => (l.levelId === lvl.levelId ? { ...lvl, placement: l.placement, points: l.points } : l)),
    )
  }, [])

  // Compute the plan from the current draft, then dispatch the two state updates
  // separately. (Calling setLog inside a setDraft updater double-appends, since
  // React invokes updaters more than once — e.g. under StrictMode.)
  const onStageAdd = useCallback(
    (lvl: LtclLevel, placement: number) => {
      const { list, entries } = applyAdd(draft, lvl, placement)
      setDraft(list)
      setLog((p) => [...p, ...entries])
    },
    [draft],
  )

  const onStageMove = useCallback(
    (levelId: number, placement: number) => {
      const { list, entries } = applyMove(draft, levelId, placement)
      setDraft(list)
      setLog((p) => [...p, ...entries])
    },
    [draft],
  )

  const onStageRemove = useCallback(
    (levelId: number) => {
      const { list, entries } = applyRemove(draft, levelId)
      setDraft(list)
      setLog((p) => [...p, ...entries])
    },
    [draft],
  )

  const commit = useCallback(async () => {
    setCommitting(true)
    try {
      await commitStagedChanges(levels, draft, log)
      setLog([])
    } finally {
      setCommitting(false)
    }
  }, [levels, draft, log])

  const discard = useCallback(() => {
    setLog([])
    setDraft(levels)
  }, [levels])

  // Report staging state + how to commit/discard to the exit guard.
  useEffect(() => {
    guard.setPending(pending)
  }, [guard, pending])
  useEffect(() => {
    guard.registerHandlers({ commit, discard })
  }, [guard, commit, discard])
  useEffect(() => () => guard.setPending(false), [guard])

  const ranked = useMemo(
    () => draft.map((level, i) => ({ level, rank: level.placement ?? i + 1 })),
    [draft],
  )
  const q = search.toLowerCase().trim()
  const visible = q ? ranked.filter((r) => r.level.name.toLowerCase().includes(q)) : ranked

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {canManageLevels && (
          <button
            onClick={() => setAdding(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + {t.ltcl_admin_add}
          </button>
        )}
        <input
          type="text"
          placeholder={t.ltcl_list_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[10rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
      </div>

      {pending && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-amber-300 text-sm font-medium">{t.ltcl_stage_pending(log.length)}</span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={discard}
                disabled={committing}
                className="text-neutral-300 hover:text-white disabled:opacity-50 text-sm px-3 py-1.5 rounded-lg"
              >
                {t.ltcl_stage_discard}
              </button>
              <button
                onClick={commit}
                disabled={committing}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
              >
                {committing ? t.ltcl_stage_committing : t.ltcl_stage_commit}
              </button>
            </div>
          </div>
          <p className="text-neutral-500 text-xs">{t.ltcl_stage_hint}</p>
          <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {log.map((e, i) => (
              <li key={i} className="text-xs text-neutral-400">
                {e.level && <span className="text-neutral-200 font-medium">{e.level}</span>}{' '}
                {e.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-neutral-500 text-sm">{t.ltcl_admin_count(visible.length)}</p>

      <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
        {visible.map(({ level, rank }) => (
          <LevelRow
            key={level.levelId}
            level={level}
            rank={rank}
            canManageLevels={canManageLevels}
            onOpen={() => setEditing(level)}
          />
        ))}
      </div>

      {(adding || editing) && (
        <LtclLevelEditor
          level={adding ? null : editing}
          levels={draft}
          canManageLevels={canManageLevels}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaveMeta={onSaveMeta}
          onStageAdd={onStageAdd}
          onStageMove={onStageMove}
          onStageRemove={onStageRemove}
        />
      )}
    </div>
  )
}

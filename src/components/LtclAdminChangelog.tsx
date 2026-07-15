import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { commitChangelogEntries, type ChangelogEntry } from '../ltclLevels'
import { useDraftGuard } from './draftGuardContext'
import LtclChangelogEntryForm from './LtclChangelogEntryForm'

// The Changelog admin tab: hand-write LTCL changelog entries using the same
// phrasing patterns the automatic list edits emit (or free-form custom text).
// Entries stack up on an in-memory list and are only written to Firestore when
// committed — mirroring the Levels tab's staged flow, and routed through the
// same exit/DraftGuard so switching away with un-committed entries prompts.
export default function LtclAdminChangelog() {
  const { t } = useI18n()
  const guard = useDraftGuard()
  const [log, setLog] = useState<ChangelogEntry[]>([])
  const [adding, setAdding] = useState(false)
  const [committing, setCommitting] = useState(false)
  const pending = log.length > 0

  const commit = useCallback(async () => {
    setCommitting(true)
    try {
      await commitChangelogEntries(log)
      setLog([])
    } finally {
      setCommitting(false)
    }
  }, [log])

  const discard = useCallback(() => setLog([]), [])

  const removeAt = (idx: number) => setLog((p) => p.filter((_, i) => i !== idx))

  // Report staging state + how to commit/discard to the exit guard.
  useEffect(() => {
    guard.setPending(pending)
  }, [guard, pending])
  useEffect(() => {
    guard.registerHandlers({ commit, discard })
  }, [guard, commit, discard])
  useEffect(() => () => guard.setPending(false), [guard])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          onClick={() => setAdding(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + {t.ltcl_cl_add}
        </button>
      </div>

      {pending ? (
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
          <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {log.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-xs text-neutral-400">
                <span className="min-w-0">
                  {e.level && <span className="text-neutral-200 font-medium">{e.level}</span>}{' '}
                  {e.text}
                </span>
                <button
                  onClick={() => removeAt(i)}
                  aria-label={t.ltcl_stage_discard}
                  className="shrink-0 text-neutral-600 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-neutral-500 text-sm">{t.ltcl_cl_empty}</p>
      )}

      {adding && (
        <LtclChangelogEntryForm
          onAdd={(entry) => setLog((p) => [...p, entry])}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

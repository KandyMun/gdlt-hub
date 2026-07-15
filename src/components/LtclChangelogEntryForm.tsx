import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import {
  MANUAL_PATTERNS,
  splitNames,
  manualAdd,
  manualMove,
  manualSwap,
  manualRemove,
  manualLegacy,
  manualLegacyReturn,
  manualCustom,
  type ManualPattern,
  type ChangelogEntry,
} from '../ltclLevels'

// Hand-write a single LTCL changelog entry from the list admin panel. Picks a
// phrasing pattern (the same ones the automatic list edits emit) or free-form
// custom text, previews the resulting line, and stages it via onAdd — so it
// commits alongside any staged list changes, through the existing flow.
export default function LtclChangelogEntryForm({
  onAdd,
  onClose,
}: {
  onAdd: (entry: ChangelogEntry) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [pattern, setPattern] = useState<ManualPattern>('custom')
  const [f, setF] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const set = (key: string, value: string) => setF((prev) => ({ ...prev, [key]: value }))

  // Build the entry for the current pattern, or null when required fields are
  // missing. Kept pure so it can drive both the live preview and staging.
  const entry = useMemo<ChangelogEntry | null>(() => {
    const name = (f.name ?? '').trim()
    switch (pattern) {
      case 'custom': {
        const text = (f.text ?? '').trim()
        return text ? manualCustom(f.lead ?? '', text) : null
      }
      case 'added': {
        const p = parseInt(f.placement ?? '', 10)
        return name && Number.isFinite(p) ? manualAdd(name, p, f.above, f.below) : null
      }
      case 'moved': {
        const from = parseInt(f.from ?? '', 10)
        const to = parseInt(f.to ?? '', 10)
        return name && Number.isFinite(from) && Number.isFinite(to)
          ? manualMove(name, from, to, f.above, f.below)
          : null
      }
      case 'swapped': {
        const higher = (f.higher ?? '').trim()
        const lower = (f.lower ?? '').trim()
        return higher && lower ? manualSwap(higher, lower) : null
      }
      case 'removed':
        return name ? manualRemove(name) : null
      case 'legacy': {
        const names = splitNames(f.names ?? '')
        return names.length ? manualLegacy(names) : null
      }
      case 'legacyReturn': {
        const names = splitNames(f.names ?? '')
        return names.length ? manualLegacyReturn(names) : null
      }
      default:
        return null
    }
  }, [pattern, f])

  function stage() {
    if (!entry) {
      setError(t.ltcl_cl_incomplete)
      return
    }
    onAdd(entry)
    onClose()
  }

  const inputCls =
    'w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500'
  const labelCls = 'text-neutral-400 text-xs'

  // Rendered inline (not as a <Component/>) so the inputs keep their identity —
  // and focus — across keystrokes.
  const field = (k: string, label: string, type = 'text') => (
    <label className="flex flex-col gap-1">
      <span className={labelCls}>{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? 'numeric' : undefined}
        value={f[k] ?? ''}
        onChange={(e) => set(k, e.target.value)}
        className={inputCls}
      />
    </label>
  )

  const patternLabels: Record<ManualPattern, string> = {
    custom: t.ltcl_cl_type_custom,
    added: t.ltcl_cl_type_added,
    moved: t.ltcl_cl_type_moved,
    swapped: t.ltcl_cl_type_swapped,
    removed: t.ltcl_cl_type_removed,
    legacy: t.ltcl_cl_type_legacy,
    legacyReturn: t.ltcl_cl_type_legacyReturn,
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">{t.ltcl_cl_title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>{t.ltcl_cl_type}</span>
            <select
              value={pattern}
              onChange={(e) => { setPattern(e.target.value as ManualPattern); setError('') }}
              className={inputCls}
            >
              {MANUAL_PATTERNS.map((p) => (
                <option key={p} value={p}>{patternLabels[p]}</option>
              ))}
            </select>
          </label>

          {pattern === 'custom' && (
            <>
              {field('lead', t.ltcl_cl_lead)}
              <label className="flex flex-col gap-1">
                <span className={labelCls}>{t.ltcl_cl_text}</span>
                <textarea
                  value={f.text ?? ''}
                  onChange={(e) => set('text', e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </label>
            </>
          )}

          {pattern === 'added' && (
            <>
              {field('name', t.ltcl_cl_level)}
              {field('placement', t.ltcl_cl_placement, 'number')}
              {field('above', t.ltcl_cl_above)}
              {field('below', t.ltcl_cl_below)}
            </>
          )}

          {pattern === 'moved' && (
            <>
              {field('name', t.ltcl_cl_level)}
              <div className="grid grid-cols-2 gap-3">
                {field('from', t.ltcl_cl_from, 'number')}
                {field('to', t.ltcl_cl_to, 'number')}
              </div>
              {field('above', t.ltcl_cl_above)}
              {field('below', t.ltcl_cl_below)}
            </>
          )}

          {pattern === 'swapped' && (
            <>
              {field('higher', t.ltcl_cl_higher)}
              {field('lower', t.ltcl_cl_lower)}
            </>
          )}

          {pattern === 'removed' && field('name', t.ltcl_cl_level)}

          {(pattern === 'legacy' || pattern === 'legacyReturn') && field('names', t.ltcl_cl_names)}

          <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
            <p className={labelCls}>{t.ltcl_cl_preview}</p>
            <p className="text-sm text-neutral-300 mt-1 min-h-[1.25rem]">
              {entry ? (
                <>
                  {entry.level && <span className="text-white font-medium">{entry.level} </span>}
                  {entry.text}
                </>
              ) : (
                <span className="text-neutral-600">—</span>
              )}
            </p>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-neutral-300 hover:text-white text-sm px-4 py-2 rounded-lg"
            >
              {t.ltcl_stage_discard}
            </button>
            <button
              onClick={stage}
              disabled={!entry}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {t.ltcl_cl_stage}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

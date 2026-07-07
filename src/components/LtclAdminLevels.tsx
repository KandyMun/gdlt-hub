import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useLtclLevels, LEGACY_AFTER, type LtclLevel } from '../ltclLevels'
import { useCan } from '../permissions'
import LtclLevelEditor from './LtclLevelEditor'
import Spinner from './Spinner'

// Level management for the LTCL admin panel: add, edit, delete and reorder
// levels (and their records) via the shared level editor. Moderators with only
// manage_records get the records-only editor; the editor enforces that.
export default function LtclAdminLevels() {
  const { t } = useI18n()
  const canManageLevels = useCan('manage_levels')
  const { levels, loaded } = useLtclLevels()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<LtclLevel | null>(null)
  const [adding, setAdding] = useState(false)

  const ranked = useMemo(
    () => levels.map((level, i) => ({ level, rank: level.placement ?? i + 1 })),
    [levels],
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

      <p className="text-neutral-500 text-sm">{t.ltcl_admin_count(visible.length)}</p>

      <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
        {visible.map(({ level, rank }) => (
          <button
            key={level.levelId}
            onClick={() => setEditing(level)}
            className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-lg text-sm text-neutral-200 bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
          >
            <span className="truncate flex items-center gap-2">
              <span className="text-neutral-500">#{rank}</span>
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
        ))}
      </div>

      {(adding || editing) && (
        <LtclLevelEditor
          level={adding ? null : editing}
          levels={levels}
          canManageLevels={canManageLevels}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

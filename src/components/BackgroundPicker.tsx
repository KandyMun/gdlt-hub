import { useState } from 'react'
import { useI18n } from '../i18n'
import { levelThumbnailUrl } from '../aredl'
import { type LtclLevel } from '../ltclLevels'

// Shared section-card look, matching the boxes on the level list.
const CARD = 'rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px]'

// Picker shown to the profile owner: every level they've beaten (completed or
// verified), plus an "auto (hardest)" option, to choose their LTCL profile
// background. Reused by the LTCL leaderboard page and the hub profile.
export default function BackgroundPicker({
  beaten,
  selectedId,
  onSelect,
  onClose,
  saving,
}: {
  beaten: LtclLevel[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onClose: () => void
  saving: boolean
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const q = search.toLowerCase().trim()
  const shown = q ? beaten.filter((l) => l.name.toLowerCase().includes(q)) : beaten
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`${CARD} bg-neutral-900/95 w-full max-w-md max-h-[80vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-white font-semibold">{t.ltcl_lb_bg_pick}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-3 pb-2">
          <input
            type="text"
            autoFocus
            placeholder={t.ltcl_list_search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
        </div>
        <div className="px-3 pb-3 overflow-y-auto flex flex-col gap-1.5">
          {!q && (
            <button
              onClick={() => onSelect(null)}
              disabled={saving}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 ${selectedId === null ? 'bg-violet-600/30 text-white ring-1 ring-violet-500/60' : 'text-neutral-300 hover:bg-neutral-800'}`}
            >
              {t.ltcl_lb_bg_auto}
            </button>
          )}
          {shown.length === 0 && <p className="text-neutral-500 text-sm text-center py-4">{t.ltcl_lb_none}</p>}
          {shown.map((l) => (
            <button
              key={l.levelId}
              onClick={() => onSelect(l.levelId)}
              disabled={saving}
              className={`flex items-center gap-3 text-left px-2 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 ${selectedId === l.levelId ? 'bg-violet-600/30 text-white ring-1 ring-violet-500/60' : 'text-neutral-300 hover:bg-neutral-800'}`}
            >
              <img
                src={l.thumbnail || levelThumbnailUrl(l.levelId)}
                alt=""
                className="w-14 h-9 object-cover rounded shrink-0 bg-neutral-950"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
              />
              <span className="truncate">{l.name}</span>
              {l.placement != null && <span className="ml-auto text-neutral-500 text-xs shrink-0">#{l.placement}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useLtclLevels, buildLeaderboard, type LtclLevel } from '../ltclLevels'
import { levelThumbnailUrl } from '../aredl'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900/40 backdrop-blur-[7px] border border-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
      <p className="text-white text-lg font-semibold leading-tight">{value}</p>
      <p className="text-neutral-400 text-xs mt-1">{label}</p>
    </div>
  )
}

// Blurred, darkened backdrop of the hardest level's thumbnail — same treatment
// as the level list's backdrop (LtclList.tsx). Fades in on load; shows nothing
// on error so the plain card background shows through instead.
function HardestBackdrop({ src }: { src: string }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { setOk(false) }, [src])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img
        src={src}
        alt=""
        onLoad={() => setOk(true)}
        className={`w-full h-full object-cover scale-105 transition-opacity duration-500 ${ok ? 'opacity-60' : 'opacity-0'}`}
      />
      <div className="absolute inset-0 bg-neutral-950/50" />
    </div>
  )
}

function HardestBanner({ hardest }: { hardest: LtclLevel }) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px] px-4 py-3">
      <p className="text-violet-300/90 text-[11px] font-semibold uppercase tracking-wider">
        {t.ltcl_lb_hardest}
      </p>
      <div className="flex items-baseline justify-between gap-3 mt-1">
        <span className="text-white text-xl font-bold truncate">{hardest.name}</span>
        {hardest.placement != null && (
          <span className="shrink-0 text-neutral-200 text-sm">#{hardest.placement}</span>
        )}
      </div>
    </div>
  )
}

// LTCL summary shown on a hub profile: leaderboard position, points, and hardest
// completed challenge, with a link through to the player's LTCL page. Stays quiet
// for users who have no LTCL completions.
export default function LtclStats({ username }: { username: string }) {
  const { t } = useI18n()
  const { levels, loaded } = useLtclLevels()
  const board = useMemo(() => buildLeaderboard(levels), [levels])

  if (!loaded) return null
  const idx = board.findIndex((e) => e.handle === username.toLowerCase())
  if (idx === -1) return null

  const entry = board[idx]
  // Hardest = the top-placed level the player has beaten, counting verified
  // levels too (the verifier is the first to clear it).
  const hardest = [...entry.completed, ...entry.verified].reduce<LtclLevel | null>(
    (best, l) => (best === null || (l.placement ?? 1e9) < (best.placement ?? 1e9) ? l : best),
    null,
  )
  const hardestSrc = hardest ? hardest.thumbnail || levelThumbnailUrl(hardest.levelId) : null

  return (
    <div className={`relative rounded-2xl overflow-hidden mt-4 ${hardestSrc ? '' : 'bg-neutral-900'}`}>
      {hardestSrc && <HardestBackdrop src={hardestSrc} />}
      <div className="relative p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-neutral-300 font-medium">{t.ltcl_stats_title}</h2>
          <Link
            to={`/ltcl/leaderboard/${entry.handle}`}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            {t.ltcl_stats_view} →
          </Link>
        </div>

        {hardest && <HardestBanner hardest={hardest} />}

        <div className="grid grid-cols-2 gap-2">
          <Stat label={t.ltcl_lb_rank} value={`#${idx + 1}`} />
          <Stat label={t.ltcl_lb_points} value={String(entry.points)} />
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useLtclLevels, buildLeaderboard, LEGACY_AFTER, type LbEntry, type LtclLevel } from '../ltclLevels'
import { useDisplayName } from './AuthorLink'
import { useProfile } from '../userProfiles'
import Spinner from './Spinner'

// Names of challenges, bold for main list and italic for legacy.
function ChallengeNames({ levels }: { levels: LtclLevel[] }) {
  const { t } = useI18n()
  if (levels.length === 0) return <span className="text-neutral-600 italic">{t.ltcl_lb_none}</span>
  return (
    <p className="text-sm text-neutral-400 leading-relaxed text-center">
      {levels.map((l, i) => {
        const legacy = (l.placement ?? 0) > LEGACY_AFTER
        return (
          <span key={l.levelId}>
            {i > 0 && <span className="text-neutral-700"> - </span>}
            <Link
              to={`/ltcl/list?level=${l.levelId}`}
              className={`hover:text-violet-400 hover:underline ${legacy ? 'italic' : 'font-bold text-neutral-300'}`}
            >
              {l.name}
            </Link>
          </span>
        )
      })}
    </p>
  )
}

// One row in the ranked list.
function LbRow({ entry, rank }: { entry: LbEntry; rank: number }) {
  const name = useDisplayName(entry.handle)
  return (
    <Link
      to={`/ltcl/leaderboard/${entry.handle}`}
      className="flex items-center gap-4 bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3 hover:border-violet-500/60 hover:bg-neutral-900 transition"
    >
      <span className="text-neutral-500 font-semibold w-8 text-right">#{rank}</span>
      <span className="text-white font-medium flex-1 truncate">{name}</span>
      <span className="text-violet-300 font-semibold shrink-0">{entry.points}</span>
    </Link>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-neutral-400 text-sm font-semibold">{label}</p>
      <div className="text-white text-lg font-bold mt-1">{children}</div>
    </div>
  )
}

function UserDetail({ entry, rank }: { entry: LbEntry; rank: number }) {
  const { t } = useI18n()
  const name = useDisplayName(entry.handle)
  // Many LTCL names are leftovers from the old list and were never registered
  // here — only link to a gdlt-hub profile when one actually exists.
  const profile = useProfile(entry.handle)
  const main = entry.completed.filter((l) => (l.placement ?? 0) <= LEGACY_AFTER).length
  const legacy = entry.completed.length - main
  // Lists are alphabetical; hardest = the completed level with the top placement.
  const hardest = entry.completed.reduce<LtclLevel | null>(
    (best, l) => (best === null || (l.placement ?? 1e9) < (best.placement ?? 1e9) ? l : best),
    null,
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-bold text-white text-center">{name}</h1>
        {profile && (
          <Link
            to={`/u/${entry.handle}`}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {t.ltcl_lb_view_profile} →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label={t.ltcl_lb_rank}>{rank}</Stat>
        <Stat label={t.ltcl_lb_points}>{entry.points}</Stat>
        <Stat label={t.ltcl_lb_hardest}>
          {hardest ? (
            <Link to={`/ltcl/list?level=${hardest.levelId}`} className="text-violet-300 hover:text-violet-200 hover:underline">
              {hardest.name}
            </Link>
          ) : (
            '–'
          )}
        </Stat>
      </div>

      <section>
        <h2 className="text-xl font-bold text-white text-center mb-3">{t.ltcl_lb_challenges}</h2>
        <p className="text-center text-neutral-400 text-sm mb-3">{t.ltcl_lb_main_legacy(main, legacy)}</p>
        <ChallengeNames levels={entry.completed} />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-bold text-white text-center mb-3">{t.ltcl_lb_created}</h2>
          <ChallengeNames levels={entry.created} />
        </section>
        <section>
          <h2 className="text-lg font-bold text-white text-center mb-3">{t.ltcl_lb_verified}</h2>
          <ChallengeNames levels={entry.verified} />
        </section>
      </div>
    </div>
  )
}

export default function LtclLeaderboard() {
  const { t } = useI18n()
  const { username } = useParams<{ username: string }>()
  const { levels, loaded } = useLtclLevels()
  const board = useMemo(() => buildLeaderboard(levels), [levels])

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  // Detail view for a specific player.
  if (username) {
    const key = username.toLowerCase()
    const idx = board.findIndex((e) => e.handle === key)
    if (idx === -1) return <p className="text-neutral-500 text-center py-20">{t.ltcl_lb_empty}</p>
    return (
      <div className="p-4">
        <Link to="/ltcl/leaderboard" className="text-neutral-400 hover:text-white text-sm">← {t.ltcl_tab_leaderboard}</Link>
        <div className="mt-4">
          <UserDetail entry={board[idx]} rank={idx + 1} />
        </div>
      </div>
    )
  }

  // Ranked list.
  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-white mb-2">{t.ltcl_tab_leaderboard}</h1>
      {board.length === 0 ? (
        <p className="text-neutral-500 text-center py-12">{t.ltcl_lb_empty}</p>
      ) : (
        board.map((entry, i) => <LbRow key={entry.handle} entry={entry} rank={i + 1} />)
      )}
    </div>
  )
}

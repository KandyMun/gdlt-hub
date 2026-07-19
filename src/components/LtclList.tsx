import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useLtclLevels, averageEnjoyment, LEGACY_AFTER, type LtclLevel, type LtclRecord } from '../ltclLevels'
import { useDisplayName } from './AuthorLink'
import { levelThumbnailUrl } from '../aredl'
import Spinner from './Spinner'

// Blurred, darkened backdrop of the selected level's thumbnail — the level's
// custom upload if it has one, otherwise the AREDL-style auto thumbnail by id.
// Fades in on load; shows nothing on error.
function LevelBackdrop({ src }: { src: string }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { setOk(false) }, [src])
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img
        src={src}
        alt=""
        onLoad={() => setOk(true)}
        className={`w-full h-full object-cover scale-125 transition-opacity duration-500 ${ok ? 'opacity-60' : 'opacity-0'}`}
      />
      <div className="absolute inset-0 bg-neutral-950/50" />
    </div>
  )
}

// A player's handle shown as their chosen display name, linking to their LTCL
// stats page — not every credited/completing player has a gdlt-hub account
// (many are leftovers from the old list), but everyone has an LTCL page.
function ProfileLink({ handle, className = 'hover:text-violet-400 hover:underline' }: { handle: string; className?: string }) {
  const name = useDisplayName(handle)
  return (
    <Link to={`/ltcl/leaderboard/${handle.toLowerCase()}`} className={className}>
      {name}
    </Link>
  )
}

// Comma-separated list of profile links (for creators etc).
function ProfileLinks({ handles }: { handles: string[] }) {
  return (
    <span>
      {handles.map((h, i) => (
        <span key={`${h}-${i}`}>
          {i > 0 && ', '}
          <ProfileLink handle={h} />
        </span>
      ))}
    </span>
  )
}

function StatBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-violet-400 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-white text-xl font-bold mt-1">{children}</p>
    </div>
  )
}

function CreditRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-violet-400 font-semibold uppercase text-xs tracking-wide shrink-0 w-24 pt-0.5">
        {label}
      </span>
      <span className="text-neutral-300">{value}</span>
    </div>
  )
}

// A single record row: name links to the player's profile; the (optional)
// completion video shows as a small separate link.
function RecordRow({ record }: { record: LtclRecord }) {
  return (
    <div className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2 text-sm">
      <span className="text-neutral-200 truncate flex items-center gap-1.5">
        <ProfileLink handle={record.username} className="hover:text-violet-400 hover:underline truncate" />
        {record.video && (
          <a href={record.video} target="_blank" rel="noreferrer" title="video" className="text-neutral-500 hover:text-violet-400 shrink-0">
            ▶
          </a>
        )}
      </span>
      <span className="text-neutral-400 shrink-0">
        {typeof record.enjoyment === 'number' ? `${record.enjoyment}/10` : '–'}
      </span>
    </div>
  )
}

function LevelDetails({ level, rank }: { level: LtclLevel; rank: number }) {
  const { t } = useI18n()
  const avg = averageEnjoyment(level)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2 flex-wrap">
        {rank > 0 && <span className="text-neutral-500">#{rank}</span>}
        <span>{level.name}</span>
        {rank > LEGACY_AFTER && (
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-400 border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 rounded-full">
            {t.ltcl_list_legacy}
          </span>
        )}
      </h1>

      <div className="aspect-video w-full rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
        {level.youtubeId ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${level.youtubeId}`}
            title={level.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">▶</div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock label={t.ltcl_list_points}>{level.points ?? '–'}</StatBlock>
        <StatBlock label={t.ltcl_list_level_id}>{level.levelId}</StatBlock>
        <StatBlock label={t.ltcl_list_avg_enjoyment}>
          {avg === null ? '–' : `${avg.toFixed(2)}/10`}
        </StatBlock>
        <StatBlock label={t.ltcl_list_song}>
          {level.isNong ? (
            level.songLink ? (
              <a href={level.songLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 hover:underline">
                NONG <span className="text-xs">↗</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                {level.songId ?? '–'}<span className="text-amber-400 text-xs">NONG</span>
              </span>
            )
          ) : level.songId ? (
            <a
              href={`https://www.newgrounds.com/audio/listen/${level.songId}`}
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 hover:text-violet-200 hover:underline"
            >
              {level.songId}
            </a>
          ) : (
            '–'
          )}
        </StatBlock>
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
        {(() => {
          const creditCls = 'text-neutral-300 hover:text-violet-400 hover:underline'
          const soleCreator = level.creators.length === 1 ? level.creators[0] : null
          // Merge when the single creator is also the publisher.
          const merged =
            soleCreator != null &&
            level.publisher.trim() !== '' &&
            soleCreator.trim().toLowerCase() === level.publisher.trim().toLowerCase()
          const creatorLabel = level.creators.length === 1 ? t.ltcl_list_creator : t.ltcl_list_creators
          const verifierRow = (
            <CreditRow label={t.ltcl_list_verifier} value={<ProfileLink handle={level.verifier} className={creditCls} />} />
          )
          if (merged) {
            return (
              <>
                <CreditRow label={t.ltcl_list_creator_publisher} value={<ProfileLink handle={level.publisher} className={creditCls} />} />
                {verifierRow}
              </>
            )
          }
          return (
            <>
              <CreditRow label={t.ltcl_list_publisher} value={<ProfileLink handle={level.publisher} className={creditCls} />} />
              {verifierRow}
              <CreditRow label={creatorLabel} value={<ProfileLinks handles={level.creators} />} />
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default function LtclList() {
  const { t } = useI18n()
  const { levels, loaded } = useLtclLevels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Mobile carousel: the three panels (list / level / records) sit side by side
  // in a horizontal snap-scroller and are swiped between. `page` tracks which
  // panel is in view (for the tab bar); on lg+ the scroller becomes a static
  // 3-column grid and none of this applies.
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  // Page starts are stride apart (panel width + gap); measuring from the DOM
  // keeps this correct regardless of padding/gap.
  const stride = () => {
    const el = scrollerRef.current
    if (!el || el.children.length < 2) return 0
    return (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft
  }

  const updatePage = useCallback(() => {
    const el = scrollerRef.current
    if (!el || el.children.length < 2) return
    const s = (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft
    if (s > 0) setPage(Math.round(el.scrollLeft / s))
  }, [])

  const goToPage = (i: number) => {
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: i * stride(), behavior: 'smooth' })
  }

  // Select a level from the ?level= param (e.g. linked from the leaderboard).
  const paramLevel = searchParams.get('level')
  useEffect(() => {
    if (paramLevel) setSelectedId(Number(paramLevel))
  }, [paramLevel])

  // Default the selection to the top level once data arrives.
  useEffect(() => {
    if (selectedId === null && !paramLevel && levels.length > 0) setSelectedId(levels[0].levelId)
  }, [levels, selectedId, paramLevel])

  function selectLevel(id: number) {
    setSelectedId(id)
    setSearchParams({ level: String(id) }, { replace: true })
    // On mobile, tapping a level slides over to its info panel. No-op on lg+
    // where the scroller is a static grid.
    goToPage(1)
  }

  // Ranks always reflect list placement; the sort only changes display order.
  const ranked = useMemo(
    () => levels.map((level, i) => ({ level, rank: level.placement ?? i + 1 })),
    [levels],
  )

  const [sort, setSort] = useState<'placement' | 'enjoyment'>('placement')
  const sorted = useMemo(() => {
    if (sort === 'placement') return ranked
    // Highest average enjoyment first; unrated levels sink to the bottom, ties
    // fall back to placement.
    return [...ranked].sort((a, b) => {
      const ea = averageEnjoyment(a.level)
      const eb = averageEnjoyment(b.level)
      if (ea === null && eb === null) return a.rank - b.rank
      if (ea === null) return 1
      if (eb === null) return -1
      return eb - ea || a.rank - b.rank
    })
  }, [ranked, sort])

  const q = search.toLowerCase().trim()
  const visible = q ? sorted.filter((r) => r.level.name.toLowerCase().includes(q)) : sorted
  const current = levels.find((l) => l.levelId === selectedId) ?? levels[0]
  const currentRank = current ? current.placement ?? levels.indexOf(current) + 1 : 0

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="relative">
      {current && <LevelBackdrop src={current.thumbnail || levelThumbnailUrl(current.levelId)} />}

      {/* Mobile-only tab bar, pinned to the bottom of the screen: jumps the
          carousel to a panel and shows which one is in view. Hidden on lg+ where
          all three panels are visible at once. */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto grid grid-cols-3 gap-1 rounded-xl bg-neutral-900/80 backdrop-blur border border-neutral-800/60 p-1 text-xs font-medium shadow-2xl">
          {[t.ltcl_tab_list, t.ltcl_list_tab_level, t.ltcl_list_records].map((label, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`px-2 py-1.5 rounded-lg transition-colors ${
                page === i ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updatePage}
        className="relative z-10 p-4 pb-24 flex items-start gap-4 snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch lg:overflow-visible lg:pb-4"
      >
      {/* Left: ranked list */}
      <div className="snap-start shrink-0 w-full lg:w-auto rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px] p-3 flex flex-col gap-2">
        <input
          type="text"
          placeholder={t.ltcl_list_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <div className="grid grid-cols-2 gap-1 text-xs font-medium">
          {(['placement', 'enjoyment'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-1.5 rounded-lg transition-colors ${
                sort === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {s === 'placement' ? t.ltcl_list_sort_placement : t.ltcl_list_sort_enjoyment}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
          {visible.map(({ level, rank }, i) => {
            const prevRank = i > 0 ? visible[i - 1].rank : 0
            // The Legacy divider only makes sense while ordered by placement.
            const showLegacyDivider =
              sort === 'placement' && rank > LEGACY_AFTER && prevRank <= LEGACY_AFTER
            const avg = averageEnjoyment(level)
            return (
              <div key={level.levelId}>
                {showLegacyDivider && (
                  <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                    <span className="h-px flex-1 bg-neutral-800" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                      {t.ltcl_list_legacy}
                    </span>
                    <span className="h-px flex-1 bg-neutral-800" />
                  </div>
                )}
                <button
                  onClick={() => selectLevel(level.levelId)}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    current?.levelId === level.levelId
                      ? 'bg-violet-600 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span className={current?.levelId === level.levelId ? 'text-white/70' : 'text-neutral-500'}>
                    #{rank}
                  </span>
                  <span className="truncate font-medium">{level.name}</span>
                  <span
                    className={`ml-auto shrink-0 tabular-nums text-xs ${
                      current?.levelId === level.levelId ? 'text-white/80' : 'text-neutral-500'
                    }`}
                    title={t.ltcl_list_avg_enjoyment}
                  >
                    {avg === null ? '–' : `${parseFloat(avg.toFixed(2))}/10`}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Center: selected level details */}
      <div className="snap-start shrink-0 w-full lg:w-auto rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px] p-4 sm:p-6">
        {current ? (
          <LevelDetails level={current} rank={currentRank} />
        ) : (
          <p className="text-neutral-500 text-center py-20">{t.ltcl_list_empty}</p>
        )}
      </div>

      {/* Right: records */}
      <aside className="snap-start shrink-0 w-full lg:w-auto rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px] p-4">
        <h2 className="text-lg font-bold text-white mb-3">{t.ltcl_list_records}</h2>
        {current && current.records.length > 0 ? (
          <div className="flex flex-col gap-2">
            {current.records.map((r) => (
              <RecordRow key={r.username} record={r} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">{t.ltcl_list_no_records}</p>
        )}
      </aside>
      </div>
    </div>
  )
}

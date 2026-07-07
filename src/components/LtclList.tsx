import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useLtclLevels, averageEnjoyment, LEGACY_AFTER, type LtclLevel, type LtclRecord } from '../ltclLevels'
import { useDisplayName } from './AuthorLink'
import { levelThumbnailUrl } from '../aredl'
import Spinner from './Spinner'

// Blurred, darkened backdrop of the selected level's thumbnail — same source as
// the AREDL hardest-demon banner. Fades in on load; shows nothing on error.
function LevelBackdrop({ levelId }: { levelId: number }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { setOk(false) }, [levelId])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img
        src={levelThumbnailUrl(levelId)}
        alt=""
        onLoad={() => setOk(true)}
        className={`w-full h-full object-cover scale-110 blur-2xl transition-opacity duration-500 ${ok ? 'opacity-25' : 'opacity-0'}`}
      />
      <div className="absolute inset-0 bg-neutral-950/70" />
    </div>
  )
}

// A player's handle shown as their chosen display name, linking to their profile.
function ProfileLink({ handle, className = 'hover:text-violet-400 hover:underline' }: { handle: string; className?: string }) {
  const name = useDisplayName(handle)
  return (
    <Link to={`/u/${handle.toLowerCase()}`} className={className}>
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
          {level.songId ? (
            <span className="inline-flex items-center gap-1">
              {level.songId}
              {level.isNong && <span className="text-amber-400 text-xs align-middle">NONG</span>}
            </span>
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
  }

  const ranked = useMemo(
    () => levels.map((level, i) => ({ level, rank: level.placement ?? i + 1 })),
    [levels],
  )
  const q = search.toLowerCase().trim()
  const visible = q ? ranked.filter((r) => r.level.name.toLowerCase().includes(q)) : ranked
  const current = levels.find((l) => l.levelId === selectedId) ?? levels[0]
  const currentRank = current ? current.placement ?? levels.indexOf(current) + 1 : 0

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="relative">
      {current && <LevelBackdrop levelId={current.levelId} />}
      <div className="relative p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-4">
      {/* Left: ranked list */}
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-sm p-3 flex flex-col gap-2">
        <input
          type="text"
          placeholder={t.ltcl_list_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
          {visible.map(({ level, rank }, i) => {
            const prevRank = i > 0 ? visible[i - 1].rank : 0
            const showLegacyDivider = rank > LEGACY_AFTER && prevRank <= LEGACY_AFTER
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
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Center: selected level details */}
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-sm p-6">
        {current ? (
          <LevelDetails level={current} rank={currentRank} />
        ) : (
          <p className="text-neutral-500 text-center py-20">{t.ltcl_list_empty}</p>
        )}
      </div>

      {/* Right: records */}
      <aside className="rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-sm p-4">
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

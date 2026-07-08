import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import { useAuth } from '../AuthContext'
import { useLtclLevels, buildLeaderboard, LEGACY_AFTER, type LbEntry, type LtclLevel } from '../ltclLevels'
import { levelThumbnailUrl } from '../aredl'
import { useDisplayName } from './AuthorLink'
import { useProfile, invalidateProfile } from '../userProfiles'
import Spinner from './Spinner'

// Blurred, darkened full-screen backdrop of a level thumbnail — same treatment
// as the level list (LtclList.tsx). Fades in on load; shows nothing on error.
function ProfileBackdrop({ src }: { src: string }) {
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

// Shared section-card look, matching the boxes on the level list.
const CARD = 'rounded-2xl border border-neutral-800/60 bg-neutral-900/30 backdrop-blur-[7px]'

// Picker shown to the profile owner: every level they've beaten (completed or
// verified), plus an "auto (hardest)" option, to choose the page background.
function BackgroundPicker({
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

function UserDetail({ entry, rank }: { entry: LbEntry; rank: number }) {
  const { t } = useI18n()
  const { user, profile: authProfile } = useAuth()
  const name = useDisplayName(entry.handle)
  // Many LTCL names are leftovers from the old list and were never registered
  // here — only link to a gdlt-hub profile when one actually exists.
  const profile = useProfile(entry.handle)
  const main = entry.completed.filter((l) => (l.placement ?? 0) <= LEGACY_AFTER).length
  const legacy = entry.completed.length - main

  // Every level the player has beaten (completed ∪ verified), deduped and
  // sorted hardest-first — powers both the "hardest" stat and the bg picker.
  const beaten = useMemo(() => {
    const byId = new Map<number, LtclLevel>()
    for (const l of [...entry.completed, ...entry.verified]) byId.set(l.levelId, l)
    return [...byId.values()].sort((a, b) => (a.placement ?? 1e9) - (b.placement ?? 1e9))
  }, [entry])
  const hardest = beaten[0] ?? null

  // The owner (logged-in user viewing their own page) may choose a background.
  const isOwner = !!user && authProfile?.username?.toLowerCase() === entry.handle
  const [bgOverride, setBgOverride] = useState<number | null | undefined>(undefined)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  // Effective choice: local override (if the owner just changed it) else stored.
  const chosenId = bgOverride !== undefined ? bgOverride : profile?.ltclBackgroundLevelId ?? null
  const bgLevel = beaten.find((l) => l.levelId === chosenId) ?? hardest
  const bgSrc = bgLevel ? bgLevel.thumbnail || levelThumbnailUrl(bgLevel.levelId) : null

  async function selectBackground(id: number | null) {
    setBgOverride(id)
    setPicking(false)
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { ltclBackgroundLevelId: id })
      invalidateProfile(entry.handle)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {bgSrc && <ProfileBackdrop src={bgSrc} />}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col gap-6">
        <div className={`${CARD} p-6 flex flex-col items-center gap-3`}>
          <h1 className="text-4xl font-bold text-white text-center">{name}</h1>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {profile && (
              <Link
                to={`/u/${entry.handle}`}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {t.ltcl_lb_view_profile} →
              </Link>
            )}
            {isOwner && beaten.length > 0 && (
              <button
                onClick={() => setPicking(true)}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {saving ? t.ltcl_lb_bg_saving : t.ltcl_lb_bg_change}
              </button>
            )}
          </div>
        </div>

        <div className={`${CARD} p-4 grid grid-cols-3 gap-4`}>
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

        <section className={`${CARD} p-5`}>
          <h2 className="text-xl font-bold text-white text-center mb-3">{t.ltcl_lb_challenges}</h2>
          <p className="text-center text-neutral-400 text-sm mb-3">{t.ltcl_lb_main_legacy(main, legacy)}</p>
          <ChallengeNames levels={entry.completed} />
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section className={`${CARD} p-5`}>
            <h2 className="text-lg font-bold text-white text-center mb-3">{t.ltcl_lb_created}</h2>
            <ChallengeNames levels={entry.created} />
          </section>
          <section className={`${CARD} p-5`}>
            <h2 className="text-lg font-bold text-white text-center mb-3">{t.ltcl_lb_verified}</h2>
            <ChallengeNames levels={entry.verified} />
          </section>
        </div>
      </div>

      {picking && (
        <BackgroundPicker
          beaten={beaten}
          selectedId={chosenId}
          onSelect={selectBackground}
          onClose={() => setPicking(false)}
          saving={saving}
        />
      )}
    </>
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
        <Link to="/ltcl/leaderboard" className="relative z-10 inline-block text-neutral-400 hover:text-white text-sm">← {t.ltcl_tab_leaderboard}</Link>
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

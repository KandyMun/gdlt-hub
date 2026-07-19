import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import { useAuth } from '../AuthContext'
import { useLtclLevels, buildLeaderboard, LEGACY_AFTER, type LbEntry, type LtclLevel } from '../ltclLevels'
import { useLtclPacks, packLevels, packCompletion, type LtclPack } from '../ltclPacks'
import { levelThumbnailUrl } from '../aredl'
import { useDisplayName } from './AuthorLink'
import { useProfile, invalidateProfile } from '../userProfiles'
import BackgroundPicker from './BackgroundPicker'
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

// A pack this player has fully completed, rendered as a background-image banner
// with the pack name on top — the same look as gdlt-hub badges that have a
// background image. Falls back to the pack's first level thumbnail when the
// pack has no background image of its own.
function PackBanner({ pack, levels }: { pack: LtclPack; levels: LtclLevel[] }) {
  const first = packLevels(pack, levels)[0]
  const img = pack.image || (first ? first.thumbnail || levelThumbnailUrl(first.levelId) : '')
  return (
    <Link
      to="/ltcl/packs"
      className="group relative flex items-center justify-center w-[86px] h-[40px] rounded-md overflow-hidden"
    >
      {img && (
        <img
          src={img}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <span className="relative text-center px-1.5 text-xs font-semibold text-white leading-tight [text-shadow:_0_1px_3px_rgb(0_0_0_/_0.95),_0_0_2px_rgb(0_0_0_/_0.9)]">
        {pack.name}
      </span>
    </Link>
  )
}

// The "Completed packs" section: every pack whose every level this player has
// beaten. Hidden entirely when they've completed none.
function CompletedPacks({ packs, levels, handle }: { packs: LtclPack[]; levels: LtclLevel[]; handle: string }) {
  const { t } = useI18n()
  const completed = useMemo(
    () =>
      packs.filter((p) => {
        const total = packLevels(p, levels).length
        return total > 0 && packCompletion(p, levels, handle) === total
      }),
    [packs, levels, handle],
  )
  if (completed.length === 0) return null
  return (
    <section className={`${CARD} p-5`}>
      <h2 className="text-xl font-bold text-white text-center mb-4">{t.ltcl_lb_packs}</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {completed.map((pack) => (
          <PackBanner key={pack.id} pack={pack} levels={levels} />
        ))}
      </div>
    </section>
  )
}

function UserDetail({ entry, rank, levels }: { entry: LbEntry; rank: number; levels: LtclLevel[] }) {
  const { t } = useI18n()
  const { user, profile: authProfile } = useAuth()
  const { packs } = useLtclPacks()
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

        <CompletedPacks packs={packs} levels={levels} handle={entry.handle} />

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
          <UserDetail entry={board[idx]} rank={idx + 1} levels={levels} />
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

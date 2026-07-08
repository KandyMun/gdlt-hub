import { useEffect, useState } from 'react'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import {
  discordMatches,
  fetchGdStats,
  resolveGdStats,
  GD_USERNAME_RE,
  type GdStats as Stats,
} from '../gd'
import Spinner from './Spinner'
import starIcon from '/gd_star.png'
import moonIcon from '/gd_moon.png'
import diamondIcon from '/gd_diamond.png'
import userCoinIcon from '/gd_usercoin.png'
import secretCoinIcon from '/gd_secretcoin.png'
import demonIcon from '/gd_demon.png'
import creatorPointIcon from '/gd_creatorpoint.png'
import trophyIcon from '/gd_trophy.png'
import backgroundImg from '/gd_background.jpg'

type State =
  | { kind: 'idle' } // no gdUsername linked
  | { kind: 'loading' }
  | { kind: 'none' } // linked name not found on the GD servers
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; stats: Stats; auto: boolean; verified: boolean }

const fmt = (n: number) => n.toLocaleString('en-US')

function Stat({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="bg-neutral-900/30 backdrop-blur-[7px] border border-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
      {icon && <img src={icon} alt={label} title={label} className="w-5 h-5 mx-auto mb-1" />}
      <p className="text-white text-lg font-semibold leading-tight">{value}</p>
      {!icon && <p className="text-neutral-400 text-xs mt-1">{label}</p>}
    </div>
  )
}

// Darkened GD background art, always shown behind the card (unlike the LTCL /
// AREDL cards this isn't per-level — GD stats has one fixed backdrop image).
function GdBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img src={backgroundImg} alt="" className="w-full h-full object-cover scale-105" />
      <div className="absolute inset-0 bg-neutral-950/60" />
    </div>
  )
}

// In-game GD username editor (owner only). Saving an empty value unlinks.
// To prevent impersonation, a non-empty name is only saved when the GD
// profile's discord social field matches the logged-in Discord username.
function UsernameEditor({
  uid,
  discordUsername,
  initial,
  onSaved,
  onCancel,
}: {
  uid: string
  discordUsername: string
  initial: string
  onSaved: (gdUsername: string) => void
  onCancel?: () => void
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const trimmed = value.trim()
  const valid = trimmed === '' || GD_USERNAME_RE.test(trimmed)

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      if (trimmed !== '') {
        let stats: Stats | null
        try {
          stats = await fetchGdStats(trimmed)
        } catch (err) {
          setError(t.gd_error_detail(err instanceof Error ? err.message : String(err)))
          return
        }
        if (!stats) {
          setError(t.gd_not_found(trimmed))
          return
        }
        if (!discordMatches(stats.discord, discordUsername)) {
          setError(t.gd_verify_failed(discordUsername))
          return
        }
      }
      await updateDoc(doc(db, 'users', uid), {
        gdUsername: trimmed === '' ? deleteField() : trimmed,
      })
      onSaved(trimmed)
    } catch {
      setError(t.gd_error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 20))}
          placeholder={t.gd_username_placeholder}
          maxLength={20}
          className="flex-1 bg-neutral-800 text-white text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        {onCancel && (
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-200 text-sm px-2">
            {t.cancel}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !valid}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? t.profile_saving : t.profile_save}
        </button>
      </div>
      {!valid && <p className="text-red-400 text-xs">{t.gd_username_invalid}</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <p className="text-neutral-600 text-xs">{t.gd_username_hint}</p>
    </div>
  )
}

export default function GdStats({
  uid,
  discordUsername,
  gdUsername,
  isOwner,
  onSaved,
}: {
  uid: string // Discord id (users/{uid} doc id)
  discordUsername: string
  gdUsername?: string
  isOwner: boolean
  onSaved: (gdUsername: string) => void
}) {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [editing, setEditing] = useState(false)

  // Close the editor even when the saved name is unchanged (the gdUsername
  // prop won't change in that case, so the effect below wouldn't reset it).
  const handleSaved = (v: string) => {
    setEditing(false)
    onSaved(v)
  }

  useEffect(() => {
    setEditing(false)
    let active = true
    setState({ kind: 'loading' })
    // Explicitly linked name wins; otherwise try the Discord handle as the
    // GD name, exact match only ("idle" when nobody matches).
    const lookup = gdUsername
      ? fetchGdStats(gdUsername).then((stats) =>
          stats
            ? ({ kind: 'loaded', stats, auto: false, verified: true } as const)
            : ({ kind: 'none' } as const),
        )
      : resolveGdStats(discordUsername).then((r) =>
          r
            ? ({ kind: 'loaded', stats: r.stats, auto: r.auto, verified: r.verified } as const)
            : ({ kind: 'idle' } as const),
        )
    lookup
      .then((next) => {
        if (active) setState(next)
      })
      .catch((err: unknown) => {
        console.error('GD stats:', err)
        if (active) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
        }
      })
    return () => {
      active = false
    }
  }, [gdUsername, discordUsername, uid])

  // Visitors only see the card when there's a linked account with stats.
  if (!isOwner && (state.kind === 'idle' || state.kind === 'none' || state.kind === 'error')) {
    return null
  }

  return (
    <div className="relative rounded-2xl overflow-hidden mt-4">
      <GdBackdrop />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-neutral-300 font-medium">{t.gd_title}</h2>
          {state.kind === 'loaded' && (
            <div className="flex items-center gap-3">
              {isOwner && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  title={t.gd_username_label}
                  className="text-neutral-500 hover:text-violet-400 text-sm transition-colors"
                >
                  ✎
                </button>
              )}
              <a
                href={`https://gdbrowser.com/u/${encodeURIComponent(state.stats.accountId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 text-sm"
              >
                {t.gd_view} ↗
              </a>
            </div>
          )}
        </div>

        {editing && isOwner ? (
          <UsernameEditor
            uid={uid}
            discordUsername={discordUsername}
            initial={gdUsername ?? ''}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        ) : state.kind === 'idle' ? (
          <UsernameEditor uid={uid} discordUsername={discordUsername} initial="" onSaved={handleSaved} />
        ) : state.kind === 'loading' ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : state.kind === 'none' || state.kind === 'error' ? (
          <div className="flex flex-col gap-3">
            <p className="text-neutral-500 text-sm">
              {state.kind === 'none' ? t.gd_not_found(gdUsername ?? '') : t.gd_error_detail(state.message)}
            </p>
            <UsernameEditor
              uid={uid}
              discordUsername={discordUsername}
              initial={gdUsername ?? ''}
              onSaved={handleSaved}
            />
          </div>
        ) : (
          <>
            <div className="bg-neutral-900/30 backdrop-blur-[7px] border border-neutral-800/60 rounded-xl px-3 py-2.5 text-center mb-2">
              <p className="text-white text-lg font-semibold leading-tight">{state.stats.username}</p>
              {state.auto && !state.verified && (
                <p className="text-neutral-600 text-xs mt-1">{t.gd_auto_note}</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label={t.gd_stars} value={fmt(state.stats.stars)} icon={starIcon} />
              <Stat label={t.gd_moons} value={fmt(state.stats.moons)} icon={moonIcon} />
              <Stat label={t.gd_secret_coins} value={fmt(state.stats.secretCoins)} icon={secretCoinIcon} />
              <Stat label={t.gd_user_coins} value={fmt(state.stats.userCoins)} icon={userCoinIcon} />
              <Stat label={t.gd_demons} value={fmt(state.stats.demons)} icon={demonIcon} />
              <Stat label={t.gd_diamonds} value={fmt(state.stats.diamonds)} icon={diamondIcon} />
              <Stat label={t.gd_creator_points} value={fmt(state.stats.creatorPoints)} icon={creatorPointIcon} />
              <Stat
                label={t.gd_global_rank}
                value={state.stats.rank ? `#${fmt(state.stats.rank)}` : '—'}
                icon={trophyIcon}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

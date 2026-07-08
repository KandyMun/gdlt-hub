import { useMemo, useState } from 'react'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { useCan } from '../permissions'
import { useIsAdmin } from '../useIsAdmin'
import { useBounties, cancelBounty, reopenBounty, type Bounty } from '../bounties'
import { levelThumbnailUrl } from '../aredl'
import { AuthorLink, useDisplayName } from './AuthorLink'
import NewBountyModal from './NewBountyModal'
import CompleteBountyModal from './CompleteBountyModal'
import Spinner from './Spinner'

// A raw username string (like LTCL records) resolved to a display name — the
// person who completed a bounty doesn't necessarily have a gdlt-hub account.
function CompletedByName({ handle }: { handle: string }) {
  return <>{useDisplayName(handle)}</>
}

function StatusBadge({ status }: { status: Bounty['status'] }) {
  const { t } = useI18n()
  const cls =
    status === 'completed'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${cls}`}>
      {status === 'completed' ? t.bounty_status_completed : t.bounty_status_open}
    </span>
  )
}

function BountyCard({
  bounty,
  canManage,
  isOwner,
  onEdit,
  onComplete,
}: {
  bounty: Bounty
  canManage: boolean
  isOwner: boolean
  onEdit: () => void
  onComplete: () => void
}) {
  const { t } = useI18n()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleCancel() {
    setBusy(true)
    try {
      await cancelBounty(bounty.id)
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen() {
    if (!window.confirm(t.bounty_reopen_confirm)) return
    setBusy(true)
    try {
      await reopenBounty(bounty.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-4 flex gap-4">
      {bounty.levelId != null && (
        <img
          src={levelThumbnailUrl(bounty.levelId)}
          alt=""
          className="w-20 h-20 object-cover rounded-xl shrink-0 bg-neutral-950"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{bounty.levelName}</h3>
            {bounty.levelId != null && (
              <p className="text-neutral-500 text-xs">{t.bounty_level_id(bounty.levelId)}</p>
            )}
            {bounty.aredlUrl && (
              <a
                href={bounty.aredlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 text-xs inline-flex items-center gap-1"
              >
                {/aredl\.net/i.test(bounty.aredlUrl) ? t.bounty_aredl_link : t.bounty_info_link} ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={bounty.status} />
            <span className="text-amber-300 font-bold text-lg">{t.bounty_amount(bounty.amount)}</span>
          </div>
        </div>

        {bounty.description && <p className="text-neutral-400 text-sm whitespace-pre-wrap">{bounty.description}</p>}

        <div className="text-neutral-500 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
          <AuthorLink handle={bounty.posterUsername} avatarSize={16} className="flex items-center gap-1.5 hover:text-violet-400" />
          <span>{t.bounty_posted_on(new Date(bounty.createdAt).toLocaleDateString())}</span>
        </div>

        {bounty.status === 'completed' && (
          <div className="bg-neutral-800/60 rounded-lg px-3 py-2 text-sm text-neutral-300 flex flex-col gap-0.5">
            {bounty.completedBy && (
              <p>{t.bounty_completed_by(bounty.completedBy)} <CompletedByName handle={bounty.completedBy} /></p>
            )}
            {bounty.completedNote && <p className="text-neutral-400">{t.bounty_note}: {bounty.completedNote}</p>}
            <p className="text-neutral-500 text-xs">
              {bounty.confirmedByUsername && t.bounty_confirmed_by(bounty.confirmedByUsername)}
              {bounty.completedAt && ` · ${t.bounty_completed_on(new Date(bounty.completedAt).toLocaleDateString())}`}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          {isOwner && bounty.status === 'open' && (
            <>
              <button
                onClick={onEdit}
                className="text-neutral-400 hover:text-white text-xs border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                {t.edit}
              </button>
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  {t.bounty_cancel}
                </button>
              ) : (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">{t.bounty_cancel_confirm}</span>
                  <button onClick={() => setConfirmCancel(false)} className="text-neutral-400 hover:text-white">{t.cancel}</button>
                  <button
                    onClick={handleCancel}
                    disabled={busy}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium px-3 py-1 rounded-lg transition-colors"
                  >
                    {busy ? t.deleting : t.delete}
                  </button>
                </span>
              )}
            </>
          )}
          {canManage && bounty.status === 'open' && (
            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {t.bounty_mark_completed}
            </button>
          )}
          {canManage && bounty.status === 'completed' && (
            <button
              onClick={handleReopen}
              disabled={busy}
              className="text-neutral-400 hover:text-white text-xs border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              {t.bounty_reopen}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface PatronEntry {
  posterId: string
  username: string
  total: number
  count: number
}

// The leaderboard ranks posters by how much money they've actually given out —
// i.e. the sum of their completed (confirmed-paid) bounties.
function PatronsLeaderboard({ patrons }: { patrons: PatronEntry[] }) {
  const { t } = useI18n()
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wide">{t.bounty_leaderboard_title}</h2>
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 divide-y divide-neutral-800/60">
        {patrons.map((p, i) => (
          <div key={p.posterId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-6 text-center text-sm font-semibold text-neutral-400 shrink-0">
              {medals[i] ?? i + 1}
            </span>
            <AuthorLink handle={p.username} avatarSize={20} className="flex items-center gap-1.5 min-w-0 hover:text-violet-400 text-sm text-neutral-200" />
            <span className="ml-auto text-neutral-500 text-xs shrink-0">{t.bounty_leaderboard_count(p.count)}</span>
            <span className="text-amber-300 font-bold text-sm shrink-0 w-16 text-right">{t.bounty_amount(p.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BountyBoardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const isAdmin = useIsAdmin()
  const canManageBounties = useCan('manage_bounties')
  const canManage = isAdmin || canManageBounties
  const { bounties, loaded } = useBounties()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<Bounty | null>(null)
  const [completing, setCompleting] = useState<Bounty | null>(null)

  const open = useMemo(() => bounties.filter((b) => b.status === 'open'), [bounties])
  const completed = useMemo(() => bounties.filter((b) => b.status === 'completed'), [bounties])

  // Rank posters by total money given out on completed (paid-out) bounties.
  const patrons = useMemo(() => {
    const byPoster = new Map<string, PatronEntry>()
    for (const b of completed) {
      const entry = byPoster.get(b.posterId) ?? {
        posterId: b.posterId,
        username: b.posterUsername,
        total: 0,
        count: 0,
      }
      entry.total += b.amount
      entry.count += 1
      byPoster.set(b.posterId, entry)
    }
    return [...byPoster.values()].sort((a, b) => b.total - a.total)
  }, [completed])

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="p-4 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t.bounty_board_title}</h1>
          <p className="mt-2 text-neutral-400 text-sm max-w-xl">{t.bounty_board_subtitle}</p>
        </div>
        {user ? (
          <button
            onClick={() => setShowNew(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            {t.bounty_post}
          </button>
        ) : (
          <p className="text-neutral-500 text-sm">{t.bounty_sign_in_to_post}</p>
        )}
      </div>

      {bounties.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">{t.bounty_empty}</p>
      ) : (
        <>
          {patrons.length > 0 && <PatronsLeaderboard patrons={patrons} />}

          {open.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wide">{t.bounty_open_title}</h2>
              {open.map((b) => (
                <BountyCard
                  key={b.id}
                  bounty={b}
                  canManage={canManage}
                  isOwner={b.posterId === user?.uid}
                  onEdit={() => setEditing(b)}
                  onComplete={() => setCompleting(b)}
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wide">{t.bounty_completed_title}</h2>
              {completed.map((b) => (
                <BountyCard
                  key={b.id}
                  bounty={b}
                  canManage={canManage}
                  isOwner={b.posterId === user?.uid}
                  onEdit={() => setEditing(b)}
                  onComplete={() => setCompleting(b)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showNew && <NewBountyModal onClose={() => setShowNew(false)} />}
      {editing && <NewBountyModal bounty={editing} onClose={() => setEditing(null)} />}
      {completing && <CompleteBountyModal bounty={completing} onClose={() => setCompleting(null)} />}
    </div>
  )
}

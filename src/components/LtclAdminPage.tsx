import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useCan } from '../permissions'
import { useIsAdmin } from '../useIsAdmin'
import { DraftGuardProvider } from './DraftGuard'
import { useDraftGuard } from './draftGuardContext'
import LtclAdminLevels from './LtclAdminLevels'
import LtclAdminChangelog from './LtclAdminChangelog'
import LtclAdminPacks from './LtclAdminPacks'
import LtclAdminRules from './LtclAdminRules'
import LtclAdminMerge from './LtclAdminMerge'

type Tab = 'levels' | 'changelog' | 'packs' | 'rules' | 'merge'

interface Caps {
  canLevels: boolean
  canChangelog: boolean
  canPacks: boolean
  canRules: boolean
  canMerge: boolean
}

// The tab bar + panel body. Split out from the page so it sits *inside* the
// DraftGuardProvider and can route sub-tab switches through the exit guard —
// switching away from Levels with un-committed changes prompts first.
function AdminPanel({ canLevels, canChangelog, canPacks, canRules, canMerge }: Caps) {
  const { t } = useI18n()
  const { guard } = useDraftGuard()
  const [tab, setTab] = useState<Tab>(canLevels ? 'levels' : canRules ? 'rules' : 'merge')

  const tabs: { id: Tab; label: string }[] = [
    ...(canLevels ? [{ id: 'levels' as Tab, label: t.ltcl_admin_levels }] : []),
    ...(canChangelog ? [{ id: 'changelog' as Tab, label: t.ltcl_admin_changelog }] : []),
    ...(canPacks ? [{ id: 'packs' as Tab, label: t.ltcl_admin_packs }] : []),
    ...(canRules ? [{ id: 'rules' as Tab, label: t.ltcl_admin_rules }] : []),
    ...(canMerge ? [{ id: 'merge' as Tab, label: t.ltcl_admin_merge }] : []),
  ]

  return (
    <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      <h1 className="text-white font-bold text-xl">{t.ltcl_admin_title}</h1>
      <div className="flex gap-2 border-b border-neutral-800">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => guard(() => setTab(tb.id))}
            className={`text-sm font-medium px-3 py-2 -mb-px border-b-2 transition-colors ${
              tab === tb.id
                ? 'border-violet-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'levels' && canLevels && <LtclAdminLevels />}
      {tab === 'changelog' && canChangelog && <LtclAdminChangelog />}
      {tab === 'packs' && canPacks && <LtclAdminPacks />}
      {tab === 'rules' && canRules && <LtclAdminRules />}
      {tab === 'merge' && canMerge && <LtclAdminMerge />}
    </div>
  )
}

// The LTCL staff panel, mounted at /ltcl/admin. Consolidates every LTCL admin
// function (level/record management, rules) in one place. Each tab is gated by
// the matching capability; the whole page redirects away if the user has none.
export default function LtclAdminPage() {
  // Site admin / super-admin always get the full panel. Otherwise fall back to
  // the individual LTCL capabilities. Each hook is called unconditionally, then
  // combined (short-circuiting would break the rules of hooks).
  const isAdmin = useIsAdmin()
  const canManageLevels = useCan('manage_levels')
  const canManageRecords = useCan('manage_records')
  const canEditRules = useCan('edit_rules')
  const canLevels = isAdmin || canManageLevels || canManageRecords
  const canRules = isAdmin || canEditRules
  // Merging rewrites publisher/creators/verifier fields, not just records, so
  // it needs the same access level as level management (list-admin), not the
  // records-only capability moderators get — matches firestore.rules.
  const canMerge = isAdmin || canManageLevels
  // Packs group levels, so managing them needs the same access as levels.
  const canPacks = isAdmin || canManageLevels
  // Writing changelog docs requires list-admin (or site admin) per firestore
  // rules — the same access level as managing levels, not records-only.
  const canChangelog = isAdmin || canManageLevels

  if (!canLevels && !canRules && !canMerge) return <Navigate to="/ltcl" replace />

  return (
    <DraftGuardProvider>
      <AdminPanel
        canLevels={canLevels}
        canChangelog={canChangelog}
        canPacks={canPacks}
        canRules={canRules}
        canMerge={canMerge}
      />
    </DraftGuardProvider>
  )
}

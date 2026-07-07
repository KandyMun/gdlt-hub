import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useCan } from '../permissions'
import { useIsAdmin } from '../useIsAdmin'
import LtclAdminLevels from './LtclAdminLevels'
import LtclAdminRules from './LtclAdminRules'

type Tab = 'levels' | 'rules'

// The LTCL staff panel, mounted at /ltcl/admin. Consolidates every LTCL admin
// function (level/record management, rules) in one place. Each tab is gated by
// the matching capability; the whole page redirects away if the user has none.
export default function LtclAdminPage() {
  const { t } = useI18n()
  // Site admin / super-admin always get the full panel. Otherwise fall back to
  // the individual LTCL capabilities. Each hook is called unconditionally, then
  // combined (short-circuiting would break the rules of hooks).
  const isAdmin = useIsAdmin()
  const canManageLevels = useCan('manage_levels')
  const canManageRecords = useCan('manage_records')
  const canEditRules = useCan('edit_rules')
  const canLevels = isAdmin || canManageLevels || canManageRecords
  const canRules = isAdmin || canEditRules
  const [tab, setTab] = useState<Tab>(canLevels ? 'levels' : 'rules')

  if (!canLevels && !canRules) return <Navigate to="/ltcl" replace />

  const tabs: { id: Tab; label: string }[] = [
    ...(canLevels ? [{ id: 'levels' as Tab, label: t.ltcl_admin_levels }] : []),
    ...(canRules ? [{ id: 'rules' as Tab, label: t.ltcl_admin_rules }] : []),
  ]

  return (
    <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      <h1 className="text-white font-bold text-xl">{t.ltcl_admin_title}</h1>
      <div className="flex gap-2 border-b border-neutral-800">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
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
      {tab === 'rules' && canRules && <LtclAdminRules />}
    </div>
  )
}

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useCan } from '../../permissions'
import SiteControlsSection from './SiteControlsSection'
import UsersSection from './UsersSection'
import BadgesSection from './BadgesSection'
import MergeAccountsSection from './MergeAccountsSection'

type Tab = 'users' | 'accounts' | 'site' | 'badges'

// Hub-wide admin control panel, mounted at /admin. Gated by the manage_site
// capability (super-admin + administrator role). Organised into sections so new
// hub-level tools (e.g. LTCL list-admin management) can slot in as extra tabs.
export default function AdminPage() {
  const { t } = useI18n()
  const canManageSite = useCan('manage_site')
  const canAssignRoles = useCan('assign_roles')
  const [tab, setTab] = useState<Tab>('users')

  // Anyone without site admin has no business here — send them home.
  if (!canManageSite) return <Navigate to="/" replace />

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: t.admin_tab_users },
    { id: 'accounts', label: t.admin_tab_accounts },
    { id: 'site', label: t.admin_tab_site },
    ...(canAssignRoles ? [{ id: 'badges' as Tab, label: t.admin_tab_badges }] : []),
  ]

  return (
    <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <h1 className="text-white font-bold text-xl">{t.admin_title}</h1>
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
      {tab === 'users' && <UsersSection />}
      {tab === 'accounts' && <MergeAccountsSection />}
      {tab === 'site' && <SiteControlsSection />}
      {tab === 'badges' && canAssignRoles && <BadgesSection />}
    </div>
  )
}

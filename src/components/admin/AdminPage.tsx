import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useCan } from '../../permissions'
import SiteControlsSection from './SiteControlsSection'
import UsersSection from './UsersSection'
import BadgesSection from './BadgesSection'
import MergeAccountsSection from './MergeAccountsSection'
import MotdSection from './MotdSection'

type Tab = 'users' | 'accounts' | 'site' | 'badges' | 'motd'

// Hub-wide admin control panel, mounted at /admin. Full site admins
// (super-admin + administrator role) see every tab. Single-purpose managers
// only get their own tab — e.g. the motd-manager role reaches just the MOTD
// tab, nothing else.
export default function AdminPage() {
  const { t } = useI18n()
  const canManageSite = useCan('manage_site')
  const canAssignRoles = useCan('assign_roles')
  const canManageMotd = useCan('manage_motd')

  // Build the set of tabs this user is allowed to see, in display order.
  const tabs: { id: Tab; label: string }[] = [
    ...(canManageSite
      ? ([
          { id: 'users', label: t.admin_tab_users },
          { id: 'accounts', label: t.admin_tab_accounts },
          { id: 'site', label: t.admin_tab_site },
        ] as { id: Tab; label: string }[])
      : []),
    ...(canManageSite && canAssignRoles ? [{ id: 'badges' as Tab, label: t.admin_tab_badges }] : []),
    ...(canManageSite || canManageMotd ? [{ id: 'motd' as Tab, label: t.admin_tab_motd }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.id ?? 'motd')

  // No tabs available means no business here — send them home.
  if (tabs.length === 0) return <Navigate to="/" replace />

  // If the selected tab isn't one they can see (e.g. state left over), fall back.
  const activeTab = tabs.some((tb) => tb.id === tab) ? tab : tabs[0].id

  return (
    <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <h1 className="text-white font-bold text-xl">{t.admin_title}</h1>
      <div className="flex gap-2 border-b border-neutral-800">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`text-sm font-medium px-3 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tb.id
                ? 'border-violet-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'accounts' && <MergeAccountsSection />}
      {activeTab === 'site' && <SiteControlsSection />}
      {activeTab === 'badges' && canAssignRoles && <BadgesSection />}
      {activeTab === 'motd' && <MotdSection />}
    </div>
  )
}

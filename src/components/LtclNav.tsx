import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useCan } from '../permissions'
import { useIsAdmin } from '../useIsAdmin'

// The middle-of-bar navigation shown while inside LTCL.
export default function LtclNav() {
  const { t } = useI18n()
  // Site admin / super-admin, or anyone with an LTCL staff capability, gets the
  // admin panel link. Each hook is called unconditionally (short-circuiting
  // would violate the rules of hooks).
  const isAdmin = useIsAdmin()
  const canManageLevels = useCan('manage_levels')
  const canManageRecords = useCan('manage_records')
  const canEditRules = useCan('edit_rules')
  const isStaff = isAdmin || canManageLevels || canManageRecords || canEditRules

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
      isActive ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
    }`

  return (
    <>
      <NavLink to="/ltcl" end className={navClass}>{t.ltcl_tab_home}</NavLink>
      <NavLink to="/ltcl/rules" className={navClass}>{t.ltcl_tab_rules}</NavLink>
      <NavLink to="/ltcl/list" className={navClass}>{t.ltcl_tab_list}</NavLink>
      <NavLink to="/ltcl/leaderboard" className={navClass}>{t.ltcl_tab_leaderboard}</NavLink>
      <NavLink to="/ltcl/packs" className={navClass}>{t.ltcl_tab_packs}</NavLink>
      {isStaff && <NavLink to="/ltcl/admin" className={navClass}>{t.ltcl_tab_admin}</NavLink>}
    </>
  )
}

import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'

// The middle-of-bar navigation shown while inside freepost.
export default function FreepostNav() {
  const { t } = useI18n()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`

  return (
    <>
      <NavLink to="/freepost" end className={navClass}>{t.nav_feed}</NavLink>
    </>
  )
}

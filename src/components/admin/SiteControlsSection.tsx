import { useI18n } from '../../i18n'
import { useSiteConfig, setSiteFrozen } from '../../useSiteConfig'

// Site-wide controls (currently the freeze switch). Lives in the hub admin panel.
export default function SiteControlsSection() {
  const { t } = useI18n()
  const { frozen } = useSiteConfig()

  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${frozen ? 'bg-red-950/50 border border-red-800' : 'bg-neutral-900'}`}>
      <div>
        <p className="text-white font-medium text-sm">{frozen ? t.users_site_frozen : t.users_site_active}</p>
        <p className="text-neutral-500 text-xs mt-0.5">{frozen ? t.users_frozen_desc : t.users_active_desc}</p>
      </div>
      <button
        onClick={() => setSiteFrozen(!frozen)}
        className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${frozen ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
      >
        {frozen ? t.users_unfreeze : t.users_freeze}
      </button>
    </div>
  )
}

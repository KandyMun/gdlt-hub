import VERSION from '../version'
import { useI18n } from '../i18n'
import { parseChangelog, CHANGELOG_GROUP_COLORS as GROUP_COLORS } from '../changelog'
import rawLt from '../../CHANGELOG.md?raw'
import rawEn from '../../CHANGELOG.en.md?raw'

export default function ChangelogPage() {
  const { t, locale } = useI18n()
  const sections = parseChangelog(locale === 'en' ? rawEn : rawLt)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-baseline gap-3 mb-8">
        <h1 className="text-2xl font-bold text-white">{t.changelog_title}</h1>
        <span className="text-sm text-neutral-500">{t.changelog_current(VERSION)}</span>
      </div>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.version} className="border border-neutral-800 rounded-xl p-5">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-lg font-semibold text-white">{section.version}</span>
              <span className="text-sm text-neutral-500">{section.date}</span>
            </div>
            {Object.entries(section.groups).map(([group, items]) => (
              <div key={group} className="mb-3 last:mb-0">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${GROUP_COLORS[group] ?? 'text-neutral-400'}`}>
                  {group}
                </p>
                <ul className="flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-sm text-neutral-300 flex gap-2">
                      <span className="text-neutral-600 select-none">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

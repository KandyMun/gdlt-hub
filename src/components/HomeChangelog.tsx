import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { parseChangelog, CHANGELOG_GROUP_COLORS } from '../changelog'
import rawLt from '../../CHANGELOG.md?raw'

const RECENT_COUNT = 3
const MAX_ITEMS_PER_VERSION = 4

// Compact "recent changes" card for the homepage sidebar — the last few
// changelog entries, condensed. Links through to the full changelog page.
export default function HomeChangelog() {
  const { t } = useI18n()
  const sections = parseChangelog(rawLt).slice(0, RECENT_COUNT)

  if (sections.length === 0) return null

  return (
    <aside className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{t.home_changelog_title}</h2>
        <Link to="/changelog" className="text-xs text-violet-400 hover:text-violet-300 shrink-0">
          {t.home_changelog_view_all} →
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section) => {
          const allItems = Object.entries(section.groups).flatMap(([group, items]) =>
            items.map((item) => ({ group, item })),
          )
          const shown = allItems.slice(0, MAX_ITEMS_PER_VERSION)
          const more = allItems.length - shown.length

          return (
            <div key={section.version} className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-semibold text-white">{section.version}</span>
                <span className="text-xs text-neutral-500">{section.date}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {shown.map(({ group, item }, i) => (
                  <li key={i} className="text-xs text-neutral-400 flex gap-1.5">
                    <span
                      className={`shrink-0 select-none ${CHANGELOG_GROUP_COLORS[group] ?? 'text-neutral-600'}`}
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span className="line-clamp-2">{item}</span>
                  </li>
                ))}
              </ul>
              {more > 0 && (
                <Link to="/changelog" className="text-xs text-neutral-600 hover:text-violet-400 mt-1 inline-block">
                  {t.home_changelog_more(more)}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

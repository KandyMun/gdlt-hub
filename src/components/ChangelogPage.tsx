import VERSION from '../version'
import { useI18n } from '../i18n'
import raw from '../../CHANGELOG.md?raw'

function parseChangelog(text: string) {
  const sections: { version: string; date: string; groups: Record<string, string[]> }[] = []
  let current: (typeof sections)[0] | null = null

  for (const line of text.split('\n')) {
    const versionMatch = line.match(/^## \[(.+?)\] - (.+)/)
    if (versionMatch) {
      current = { version: versionMatch[1], date: versionMatch[2], groups: {} }
      sections.push(current)
      continue
    }
    const groupMatch = line.match(/^### (.+)/)
    if (groupMatch && current) {
      current.groups[groupMatch[1]] = []
      continue
    }
    const itemMatch = line.match(/^- (.+)/)
    if (itemMatch && current) {
      const keys = Object.keys(current.groups)
      const group = keys[keys.length - 1] ?? 'Changes'
      if (!current.groups[group]) current.groups[group] = []
      current.groups[group].push(itemMatch[1])
    }
  }
  return sections
}

const GROUP_COLORS: Record<string, string> = {
  Added: 'text-emerald-400',
  Changed: 'text-blue-400',
  Fixed: 'text-yellow-400',
  Removed: 'text-red-400',
  Security: 'text-violet-400',
  // Lithuanian
  Pridėta: 'text-emerald-400',
  Pakeista: 'text-blue-400',
  Pataisyta: 'text-yellow-400',
  Pašalinta: 'text-red-400',
  Saugumas: 'text-violet-400',
  Pataisymai: 'text-yellow-400',
  Pakeitimai: 'text-blue-400',
}

export default function ChangelogPage() {
  const { t } = useI18n()
  const sections = parseChangelog(raw)

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

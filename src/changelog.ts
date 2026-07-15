// Shared changelog markdown parsing — used by the full changelog page and the
// homepage "recent changes" widget so both read CHANGELOG.md the same way.

export interface ChangelogSection {
  version: string
  date: string
  groups: Record<string, string[]>
}

export function parseChangelog(text: string): ChangelogSection[] {
  const sections: ChangelogSection[] = []
  let current: ChangelogSection | null = null

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

export const CHANGELOG_GROUP_COLORS: Record<string, string> = {
  Added: 'text-emerald-400',
  Changed: 'text-blue-400',
  Fixed: 'text-yellow-400',
  Removed: 'text-red-400',
  Security: 'text-violet-400',
  'System changes': 'text-violet-400',
  // Lithuanian
  Pridėta: 'text-emerald-400',
  Pakeista: 'text-blue-400',
  Pataisyta: 'text-yellow-400',
  Pašalinta: 'text-red-400',
  Saugumas: 'text-violet-400',
  Pataisymai: 'text-yellow-400',
  Pakeitimai: 'text-blue-400',
  'Sisteminiai pokyčiai': 'text-violet-400',
}

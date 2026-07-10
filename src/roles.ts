// Assignable member roles. Edit this list to add/remove/recolor roles.
// `id` is what gets stored on the user doc (users/{uid}.roles: string[]);
// `label` is what's shown on the badge; `badge` are the Tailwind classes.
// Keep full class strings literal so Tailwind doesn't purge them.

export interface Role {
  id: string
  label: { en: string; lt: string }
  badge: string
  icon: string // small emoji shown next to the username
}

export const ROLES: Role[] = [
  { id: 'administrator', label: { en: 'Administrator', lt: 'Administratorius' }, badge: 'bg-red-500/15 text-red-300 border-red-500/40', icon: '🛡️' },
  { id: 'list-admin', label: { en: 'List Admin', lt: 'Sąrašo administratorius' }, badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40', icon: '🗂️' },
  { id: 'list-moderator', label: { en: 'List Moderator', lt: 'Sąrašo moderatorius' }, badge: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: '🛠️' },
  { id: 'creator', label: { en: 'Creator', lt: 'Kūrėjas' }, badge: 'bg-pink-500/15 text-pink-300 border-pink-500/40', icon: '🎨' },
  { id: 'developer', label: { en: 'Developer', lt: 'Programuotojas' }, badge: 'bg-violet-500/15 text-violet-300 border-violet-500/40', icon: '💻' },
  { id: 'bounty-board-manager', label: { en: 'Bounty Board Manager', lt: 'Premijų lentos vadovas' }, badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40', icon: '💰' },
  { id: 'achievement-board-manager', label: { en: 'Achievement Board Manager', lt: 'Pasiekimų lentos vadovas' }, badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: '🏅' },
  { id: 'achievement-announcement-manager', label: { en: 'Achievement Announcement Manager', lt: 'Pasiekimų skelbimų vadovas' }, badge: 'bg-teal-500/15 text-teal-300 border-teal-500/40', icon: '📣' },
  { id: 'motd-manager', label: { en: 'MOTD Manager', lt: 'Dienos žinutės vadovas' }, badge: 'bg-orange-500/15 text-orange-300 border-orange-500/40', icon: '📢' },
]

const roleMap: Record<string, Role> = Object.fromEntries(ROLES.map((r) => [r.id, r]))

export function getRole(id: string): Role | undefined {
  return roleMap[id]
}

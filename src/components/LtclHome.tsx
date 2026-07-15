import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useLtclLevels, deleteChangelogEntry } from '../ltclLevels'
import { useCan } from '../permissions'
import { useI18n } from '../i18n'
import crownIcon from '/crown.svg'
import userGearIcon from '/user-gear.svg'
import codeIcon from '/code.svg'
import userShieldIcon from '/user-shield.svg'

// LTCL-specific Discord server invite.
const LTCL_DISCORD_URL = 'https://discord.gg/DcyRWRSfDp'

// LTCL landing page: welcome blurb, a live level changelog and the list staff.
// The changelog is generated automatically: every list edit appends a doc to the
// `changelog` collection (see the logging helpers in ltclLevels.ts), which the
// hook below streams in. The staff list is resolved live from user roles.

type ChangeEntry = { id?: string; level: string; text: string; raw?: boolean }
type ChangeDay = { date: string; entries: ChangeEntry[] }

// One stored changelog event. `level` is the bolded lead level ('' for list-wide
// lines like Legacy pushes), `text` the rest of the sentence, `date` the day it
// happened (YYYY-MM-DD), `ts` a millisecond timestamp used only for ordering.
type ChangelogDoc = { level: string; text: string; date: string; ts: number; raw?: boolean }

// Stream the changelog newest-first and group it by day for display.
function useChangelog(): ChangeDay[] {
  const [docs, setDocs] = useState<(ChangelogDoc & { id: string })[]>([])
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'changelog'), orderBy('ts', 'desc'), limit(1000)),
      (snap) => setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChangelogDoc) }))),
    )
  }, [])
  return useMemo(() => {
    const days: ChangeDay[] = []
    const byDate = new Map<string, ChangeEntry[]>()
    for (const d of docs) {
      let entries = byDate.get(d.date)
      if (!entries) {
        entries = []
        byDate.set(d.date, entries)
        days.push({ date: d.date, entries })
      }
      entries.push({ id: d.id, level: d.level, text: d.text, raw: d.raw })
    }
    return days
  }, [docs])
}

// ─── Changelog entry highlighting ────────────────────────────────────────────
// Renders a changelog line with two things emphasized in white: placement
// numbers (shown as #N, dropping the "vietą/vietos/..." word) and every level
// name. Level names have no delimiters, so we highlight by exclusion — anything
// that isn't a placement phrase or a connector word (STOPWORDS) is a level name.
// A name that matches a level currently on the list links to that level's page;
// new levels need no upkeep, only add a STOPWORD if a connector renders white.

// Placement phrases, captured so they can be re-rendered as "#N":
//   A: "iš/į/iki 20 vietos"   B: "17 ir 18 vietos"   C: bare "į 18"
const POSITION_RE =
  /(iš|į|iki) (\d+) viet(?:os|ą|ų|a)|(\d+) ir (\d+) vietos|(į) (\d+)(?=[,.]| |$)/g

const STOPWORDS = new Set([
  'į', 'iš', 'iki', 'virš', 'po', 'ir', 'tarp', 'dabar', 'aukščiau', 'dėl',
  'reikalavimų', 'neatitikimo', 'nes', 'buvo', 'ištrintas', 'gd', 'serverių',
  'yra', 'neįmanomas', 'vietomis', 'lieka', 'tam', 'pačiam', 'tik', 'trūksta',
  'nuomonių', 'vieta', 'vietą', 'vietos', 'vietų', 'gali', 'keistis', 'sąrašas',
  'pratęstas', 'legacy', 'sąrašą', 'sąrašo', 'grįžta', 'įdėtas', 'įdėti',
  'perkeltas', 'pakeltas', 'nuleistas', 'pašalintas', 'sukeisti', 'išstumiamas',
  'išstumiami', "spot'e",
])

// Fold Lithuanian diacritics + case so text spellings match list level names.
function fold(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const isSep = (t: string) => /^(?:\s+|[.,()])$/.test(t)

// One level name: a link if it's on the list, otherwise plain white.
function nameNode(name: string, levels: Map<string, number>, key: string): ReactNode {
  const id = levels.get(fold(name))
  if (id !== undefined) {
    return (
      <Link
        key={key}
        to={`/ltcl/list?level=${id}`}
        className="text-white font-medium hover:text-violet-300 hover:underline"
      >
        {name}
      </Link>
    )
  }
  return <span key={key} className="text-white font-medium">{name}</span>
}

// Highlight level names in a placement-free run, grouping consecutive
// non-connector words into one name so multi-word titles link as a single unit.
function highlightNames(text: string, key: string, levels: Map<string, number>): ReactNode[] {
  const parts = text.split(/(\s+|[.,()])/).filter((p) => p !== '')
  const nodes: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < parts.length) {
    const tok = parts[i]
    if (!isSep(tok) && !STOPWORDS.has(tok.toLowerCase())) {
      const words = [tok]
      let j = i + 1
      while (
        j + 1 < parts.length &&
        /^\s+$/.test(parts[j]) &&
        !isSep(parts[j + 1]) &&
        !STOPWORDS.has(parts[j + 1].toLowerCase())
      ) {
        words.push(parts[j + 1])
        j += 2
      }
      nodes.push(nameNode(words.join(' '), levels, `${key}-n${k++}`))
      i = j
    } else {
      nodes.push(<span key={`${key}-s${k++}`}>{tok}</span>)
      i++
    }
  }
  return nodes
}

// Render a full line: placements as white #N, level names highlighted/linked.
function highlightLine(text: string, levels: Map<string, number>): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let seg = 0
  let m: RegExpExecArray | null
  POSITION_RE.lastIndex = 0
  const num = (n: string, key: string) => (
    <span key={key} className="text-white font-medium">#{n}</span>
  )
  while ((m = POSITION_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(...highlightNames(text.slice(last, m.index), `s${seg}`, levels))
    if (m[1] !== undefined) {
      nodes.push(<span key={`pp${seg}`}>{m[1]} </span>, num(m[2], `pn${seg}`))
    } else if (m[3] !== undefined) {
      nodes.push(num(m[3], `pa${seg}`), <span key={`pi${seg}`}> ir </span>, num(m[4], `pb${seg}`))
    } else {
      nodes.push(<span key={`pp${seg}`}>{m[5]} </span>, num(m[6], `pn${seg}`))
    }
    last = m.index + m[0].length
    seg++
  }
  if (last < text.length) nodes.push(...highlightNames(text.slice(last), `s${seg}`, levels))
  return nodes
}

function renderEntry(e: ChangeEntry, levels: Map<string, number>): ReactNode[] {
  // Free-form custom entries: only the lead level is highlighted (and linked if
  // it's on the list); the rest is plain prose. Structured pattern/auto entries
  // run through the full highlighter that finds placements and level names.
  if (e.raw) {
    const nodes: ReactNode[] = []
    if (e.level) nodes.push(nameNode(e.level, levels, 'raw-lvl'), <span key="raw-sp"> </span>)
    nodes.push(<span key="raw-txt">{e.text}</span>)
    return nodes
  }
  return highlightLine(e.level ? `${e.level} ${e.text}` : e.text, levels)
}

type StaffUser = { username: string; displayName?: string; roles: string[] }

// Staff groups, resolved live from the roles users hold. Everyone with the
// group's role is listed (a user with several roles appears in each group).
// "Owner" maps to the top-level `administrator` role — there is no separate
// owner role.
const STAFF_GROUPS: { role: string; label: { en: string; lt: string }; icon: string }[] = [
  { role: 'administrator', label: { en: 'Owners', lt: 'Savininkai' }, icon: crownIcon },
  { role: 'list-admin', label: { en: 'List Admins', lt: 'Sąrašo administratoriai' }, icon: userGearIcon },
  { role: 'list-moderator', label: { en: 'List Moderators', lt: 'Sąrašo moderatoriai' }, icon: userShieldIcon },
  { role: 'developer', label: { en: 'Developers', lt: 'Programuotojai' }, icon: codeIcon },
]

const STAFF_ROLES = STAFF_GROUPS.map((g) => g.role)

// One query fetches every user holding any staff role. Reading the users
// collection requires being signed in (Firestore rules), so logged-out
// visitors simply see no staff.
function useStaff(): StaffUser[] {
  const [staff, setStaff] = useState<StaffUser[]>([])
  useEffect(() => {
    let active = true
    getDocs(query(collection(db, 'users'), where('roles', 'array-contains-any', STAFF_ROLES)))
      .then((snap) => {
        if (!active) return
        setStaff(
          snap.docs
            // Hide the super-admin (site owner) account from the public staff list.
            .filter((d) => d.id !== import.meta.env.VITE_ADMIN_UID)
            .map((d) => {
              const u = d.data() as { username?: string; displayName?: string; roles?: string[] }
              return { username: u.username ?? '', displayName: u.displayName, roles: u.roles ?? [] }
            })
            .filter((u) => u.username),
        )
      })
      .catch(() => { if (active) setStaff([]) })
    return () => { active = false }
  }, [])
  return staff
}

// One staff chip: shows the member's chosen display name (falling back to their
// handle) and the role icon, linking to their hub profile.
function StaffChip({ user, icon }: { user: StaffUser; icon: string }) {
  return (
    <Link
      to={`/u/${user.username.toLowerCase()}`}
      className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm px-3 py-1 rounded-lg transition-colors"
    >
      <img src={icon} alt="" aria-hidden="true" className="w-3.5 h-3.5 opacity-80" />
      {user.displayName || user.username}
    </Link>
  )
}

export default function LtclHome() {
  const { t, locale } = useI18n()
  const staff = useStaff()
  const canDelete = useCan('manage_levels')
  const { levels } = useLtclLevels()
  const changelog = useChangelog()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const levelMap = useMemo(
    () => new Map(levels.map((l) => [fold(l.name), l.levelId])),
    [levels],
  )

  const groups = STAFF_GROUPS
    .map((g) => ({
      ...g,
      members: staff
        .filter((u) => u.roles.includes(g.role))
        .sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username)),
    }))
    .filter((g) => g.members.length > 0)

  return (
    <div className="w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left / main column */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Welcome */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {t.ltcl_welcome_title}
          </h1>
          <p className="mt-3 text-sm text-neutral-400 max-w-xl mx-auto">{t.ltcl_welcome_desc}</p>
          <p className="mt-3 text-sm text-neutral-400 max-w-xl mx-auto">
            <span className="font-semibold text-neutral-200">{t.ltcl_disclaimer_label}</span>{' '}
            {t.ltcl_disclaimer}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/ltcl/list"
              className="inline-block bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {t.ltcl_view_list}
            </Link>
            <Link
              to="/ltcl/rules"
              className="inline-block bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {t.ltcl_tab_rules}
            </Link>
            <a
              href={LTCL_DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z" />
              </svg>
              {t.ltcl_discord}
            </a>
          </div>
        </section>

        {/* Changelog */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t.ltcl_changelog_title}</h2>
          {changelog.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              {locale === 'lt' ? 'Kol kas pakeitimų nėra.' : 'No changes yet.'}
            </p>
          ) : (
          <div className="flex flex-col gap-5 max-h-[32rem] overflow-y-auto pr-2">
            {changelog.map((day) => (
              <div key={day.date}>
                <p className="text-violet-400 font-semibold text-sm mb-1.5">{day.date}</p>
                <ul className="flex flex-col gap-1.5">
                  {day.entries.map((e, i) => (
                    <li key={e.id ?? i} className="group flex items-start gap-2 text-sm text-neutral-400">
                      <span className="flex-1 min-w-0">{renderEntry(e, levelMap)}</span>
                      {canDelete && e.id && (
                        confirmDeleteId === e.id ? (
                          <span className="flex items-center gap-1.5 shrink-0 text-xs">
                            <button
                              onClick={() => { deleteChangelogEntry(e.id!); setConfirmDeleteId(null) }}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              {locale === 'lt' ? 'Ištrinti' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-neutral-500 hover:text-neutral-300"
                            >
                              {locale === 'lt' ? 'Atšaukti' : 'Cancel'}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(e.id!)}
                            aria-label={locale === 'lt' ? 'Ištrinti įrašą' : 'Delete entry'}
                            className="shrink-0 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          )}
        </section>
      </div>

      {/* Right column: staff */}
      <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-lg font-bold text-white text-center mb-4">{t.ltcl_staff_title}</h2>
        {groups.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center">{t.ltcl_staff_empty}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.role} className="text-center">
                <p className="text-neutral-300 font-semibold text-sm mb-2">{group.label[locale]}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {group.members.map((m) => (
                    <StaffChip key={m.username} user={m} icon={group.icon} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

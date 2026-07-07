import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import crownIcon from '/crown.svg'
import userGearIcon from '/user-gear.svg'
import codeIcon from '/code.svg'
import userShieldIcon from '/user-shield.svg'

// LTCL landing page: welcome blurb, a level changelog and the list staff.
// The changelog is placeholder data for now — edit the array below (or wire it
// to Firestore later). The staff list is resolved live from user roles.

type ChangeEntry = { level: string; text: string }
type ChangeDay = { date: string; entries: ChangeEntry[] }

// Newest first. `text` is the placement note shown after the level name.
const CHANGELOG: ChangeDay[] = [
  {
    date: '2026-07-04',
    entries: [
      { level: 'Placeholder Challenge', text: 'was placed at #1 to start the list.' },
    ],
  },
]

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

  const groups = STAFF_GROUPS
    .map((g) => ({
      ...g,
      members: staff
        .filter((u) => u.roles.includes(g.role))
        .sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username)),
    }))
    .filter((g) => g.members.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          </div>
        </section>

        {/* Changelog */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t.ltcl_changelog_title}</h2>
          <div className="flex flex-col gap-5">
            {CHANGELOG.map((day) => (
              <div key={day.date}>
                <p className="text-violet-400 font-semibold text-sm mb-1.5">{day.date}</p>
                <ul className="flex flex-col gap-1.5">
                  {day.entries.map((e, i) => (
                    <li key={i} className="text-sm text-neutral-400">
                      <span className="text-white font-medium">{e.level}</span> {e.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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

import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import HomeChangelog from './HomeChangelog'

// The hub home page. The top bar (login, language, notifications) is shared via
// Layout, so this only owns the landing content. Add entries as things get built.
type AppLink = { name: string; description: string; to: string; emoji: string }

export default function HomePage() {
  const { t } = useI18n()

  const apps: AppLink[] = [
    {
      name: 'freepost',
      description: t.home_freepost_desc,
      to: '/freepost',
      emoji: '🖼️',
    },
    {
      name: 'LTCL',
      description: t.home_ltcl_desc,
      to: '/ltcl',
      emoji: '🏆',
    },
    {
      name: t.user_search_title,
      description: t.home_search_desc,
      to: '/user-search',
      emoji: '🔍',
    },
  ]

  return (
    <div className="flex flex-col items-center px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          <span className="flag-text">GDLT</span> Hub
        </h1>
        <p className="mt-3 text-neutral-400 max-w-md mx-auto">
          {t.home_tagline}
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <main className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {apps.map((app) => (
            <Link
              key={app.name}
              to={app.to}
              className="group block rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 transition hover:border-violet-500/60 hover:bg-neutral-900 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {app.emoji}
                </span>
                <h2 className="text-lg font-semibold text-white group-hover:text-violet-300">
                  {app.name}
                </h2>
              </div>
              <p className="mt-2 text-sm text-neutral-400">{app.description}</p>
            </Link>
          ))}
        </main>

        <HomeChangelog />
      </div>

      <footer className="mt-16 text-xs text-neutral-600">
        &copy; {new Date().getFullYear()} KandyMan
      </footer>
    </div>
  )
}

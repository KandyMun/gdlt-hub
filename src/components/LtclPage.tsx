import { Routes, Route } from 'react-router-dom'
import { useI18n } from '../i18n'
import LtclHome from './LtclHome'
import LtclRules from './LtclRules'
import LtclList from './LtclList'
import LtclLeaderboard from './LtclLeaderboard'
import LtclAdminPage from './LtclAdminPage'

// A tab section of LTCL. Swap these placeholders for real content as it's built.
function Placeholder({ emoji, title }: { emoji: string; title: string }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <span className="text-5xl mb-6" aria-hidden="true">{emoji}</span>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-4 text-neutral-400">{t.ltcl_coming_soon}</p>
    </div>
  )
}

// The Lithuanian Challenge List (LTCL), mounted at /ltcl/* under the shared
// Layout. The tab nav (List, Leaderboard, Roulette, Packs) lives in the top bar
// via LtclNav; this owns the body for each tab.
export default function LtclPage() {
  const { t } = useI18n()

  return (
    <main className="max-w-7xl mx-auto">
      <Routes>
        <Route path="" element={<LtclHome />} />
        <Route path="rules" element={<LtclRules />} />
        <Route path="list" element={<LtclList />} />
        <Route path="leaderboard" element={<LtclLeaderboard />} />
        <Route path="leaderboard/:username" element={<LtclLeaderboard />} />
        <Route path="admin" element={<LtclAdminPage />} />
        <Route path="roulette" element={<Placeholder emoji="🎰" title={t.ltcl_tab_roulette} />} />
        <Route path="packs" element={<Placeholder emoji="📦" title={t.ltcl_tab_packs} />} />
      </Routes>
    </main>
  )
}

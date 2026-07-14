import { Routes, Route } from 'react-router-dom'
import LtclHome from './LtclHome'
import LtclRules from './LtclRules'
import LtclList from './LtclList'
import LtclLeaderboard from './LtclLeaderboard'
import LtclPacks from './LtclPacks'
import LtclAdminPage from './LtclAdminPage'

// The Lithuanian Challenge List (LTCL), mounted at /ltcl/* under the shared
// Layout. The tab nav (List, Leaderboard, Packs) lives in the top bar via
// LtclNav; this owns the body for each tab.
export default function LtclPage() {
  return (
    <main className="w-full">
      <Routes>
        <Route path="" element={<LtclHome />} />
        <Route path="rules" element={<LtclRules />} />
        <Route path="list" element={<LtclList />} />
        <Route path="leaderboard" element={<LtclLeaderboard />} />
        <Route path="leaderboard/:username" element={<LtclLeaderboard />} />
        <Route path="admin" element={<LtclAdminPage />} />
        <Route path="packs" element={<LtclPacks />} />
      </Routes>
    </main>
  )
}

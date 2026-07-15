// Pointercrate (Geometry Dash Demonlist) stats for a user's profile.
// Unlike AREDL — which we can resolve automatically from a freepost account's
// Discord id — pointercrate identifies players by their own internal ids and
// exposes no Discord link, so a user must tell us their exact pointercrate
// player name (stored as `pointercrateUsername` on their users/{uid} doc).
//
// Flow: resolve the name to a player id via /players/ranking (which also carries
// the list score + global rank), then GET /players/{id} for the completed
// records used to derive the hardest demon and per-section completion counts.

const API = 'https://pointercrate.com/api/v1'
// v2 demon objects additionally expose the in-game `level_id`, which v1 omits —
// we need it to fetch the hardest demon's level thumbnail (see fetchLevelId).
const API_V2 = 'https://pointercrate.com/api/v2'

// NOTE: we deliberately do NOT send the Pointercrate access token from the
// browser. Only the /players/ listing endpoint needs EXTENDED_ACCESS; the
// ranking and player-detail endpoints we use here are public. Adding an
// `Authorization` header would turn each request into a CORS "preflighted"
// request (an OPTIONS call pointercrate doesn't answer), which the browser
// blocks. A bare GET with only the safelisted `Accept` header stays a "simple"
// request and needs no preflight. If pointercrate ever stops sending CORS
// headers on these GETs, the calls would have to move behind a server proxy.

// Standard pointercrate list sections, by current demon position:
//   Main list   = positions 1–75
//   Extended    = positions 76–150
//   Legacy      = positions 151+
const MAIN_LIST_MAX = 75
const EXTENDED_LIST_MAX = 150

export interface PointercrateHardest {
  name: string
  position: number // current list placement (1 = hardest in the world)
  levelId: number | null // in-game GD level id, for the thumbnail backdrop
}

export interface PointercrateStats {
  playerId: number
  name: string
  listPoints: number // demonlist score
  rank: number | null // global ranking position
  hardest: PointercrateHardest | null
  mainCount: number // completed demons currently in the main list (1–75)
  extendedCount: number // completed demons currently in the extended list (76–150)
  legacyCount: number // completed demons currently in the legacy list (151+)
  profileUrl: string
}

interface RankedPlayer {
  id: number
  name: string
  banned: boolean
  score: number
  rank: number
}

interface PlayerRecord {
  progress: number
  status: string
  demon: { id: number; name: string; position: number }
}

// Cache successful lookups (including genuine "no player" nulls) per name so
// revisiting a profile doesn't refetch. Errors are not cached.
const resolved = new Map<string, PointercrateStats | null>()
const inflight = new Map<string, Promise<PointercrateStats | null>>()

const norm = (s: string) => s.toLowerCase().trim()

// Only the safelisted `Accept` header — no `Authorization` — so the request
// stays "simple" and the browser skips the CORS preflight (see note above).
const REQUEST_INIT: RequestInit = { headers: { Accept: 'application/json' } }

export function profileUrlFor(playerId: number): string {
  return `https://pointercrate.com/demonlist/statsviewer/?player=${playerId}`
}

// Resolve a player name to its ranking entry (id + score + rank). The ranking
// endpoint filters by substring, so we require an exact (case-insensitive) name
// match to avoid picking up unrelated players.
async function findPlayer(name: string): Promise<RankedPlayer | null> {
  const res = await fetch(
    `${API}/players/ranking/?name_contains=${encodeURIComponent(name)}&limit=100`,
    REQUEST_INIT,
  )
  if (!res.ok) throw new Error(`Pointercrate ranking search failed (${res.status})`)
  const list = (await res.json()) as RankedPlayer[]
  const key = norm(name)
  return list.find((p) => norm(p.name) === key) ?? null
}

async function fetchRecords(playerId: number): Promise<PlayerRecord[]> {
  const res = await fetch(`${API}/players/${playerId}/`, REQUEST_INIT)
  if (!res.ok) throw new Error(`Pointercrate player fetch failed (${res.status})`)
  const body = (await res.json()) as { data?: { records?: PlayerRecord[] } }
  return body.data?.records ?? []
}

// The in-game level id for a pointercrate demon, needed for its thumbnail. Only
// the v2 demon object carries it. Best-effort: a failure just means no backdrop.
async function fetchLevelId(demonId: number): Promise<number | null> {
  try {
    const res = await fetch(`${API_V2}/demons/${demonId}/`, REQUEST_INIT)
    if (!res.ok) return null
    const body = (await res.json()) as { data?: { level_id?: number } }
    return body.data?.level_id ?? null
  } catch {
    return null
  }
}

export function fetchPointercrateStats(name: string): Promise<PointercrateStats | null> {
  const key = norm(name)
  if (!key) return Promise.resolve(null)
  if (resolved.has(key)) return Promise.resolve(resolved.get(key)!)
  if (inflight.has(key)) return inflight.get(key)!

  const p = (async () => {
    try {
      const player = await findPlayer(name)
      if (!player) {
        resolved.set(key, null)
        return null
      }

      const records = await fetchRecords(player.id)

      // Only fully completed, approved records count as beaten demons.
      const beaten = records.filter((r) => r.status === 'approved' && r.progress === 100)

      let hardestDemon: PlayerRecord['demon'] | null = null
      let mainCount = 0
      let extendedCount = 0
      let legacyCount = 0
      for (const r of beaten) {
        const pos = r.demon.position
        if (pos <= MAIN_LIST_MAX) mainCount++
        else if (pos <= EXTENDED_LIST_MAX) extendedCount++
        else legacyCount++
        if (!hardestDemon || pos < hardestDemon.position) {
          hardestDemon = r.demon
        }
      }

      // Resolve the hardest demon's level thumbnail (v2 exposes the level id).
      const hardest: PointercrateHardest | null = hardestDemon
        ? {
            name: hardestDemon.name,
            position: hardestDemon.position,
            levelId: await fetchLevelId(hardestDemon.id),
          }
        : null

      const stats: PointercrateStats = {
        playerId: player.id,
        name: player.name,
        listPoints: player.score,
        rank: player.rank ?? null,
        hardest,
        mainCount,
        extendedCount,
        legacyCount,
        profileUrl: profileUrlFor(player.id),
      }
      resolved.set(key, stats)
      return stats
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, p)
  return p
}

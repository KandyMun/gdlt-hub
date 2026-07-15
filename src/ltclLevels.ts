import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

// Placements past this are "Legacy" and worth 0 points.
export const LEGACY_AFTER = 100

// Custom level thumbnail upload cap.
export const LEVEL_THUMB_MAX = 2 * 1024 * 1024 // 2 MB

// Validate + upload a custom level thumbnail to Storage; returns the URL.
export async function uploadLevelThumbnail(file: File, uid: string): Promise<string> {
  if (file.size > LEVEL_THUMB_MAX) throw new Error('too-large')
  if (!file.type.startsWith('image/')) throw new Error('type')
  const path = `level-thumbnails/${uid}/${Date.now()}_${file.name}`
  const r = ref(storage, path)
  await uploadBytes(r, file)
  return getDownloadURL(r)
}

// Set (or replace) just a level's thumbnail, leaving every other field
// untouched — used by the admin list's drag-and-drop-to-replace shortcut.
export async function updateLevelThumbnail(levelId: number, thumbnail: string): Promise<void> {
  await setDoc(doc(db, 'levels', String(levelId)), { thumbnail }, { merge: true })
}

// Point value for a placement (1-based). Legacy positions score 0.
// Curve: 250 * exp(ln(0.04) * (x-1)/99) → #1 = 250, #100 = 10.
export function pointsForPlacement(x: number): number {
  if (x > LEGACY_AFTER) return 0
  return Math.round(250 * Math.exp(Math.log(0.04) * (x - 1) / 99) * 100) / 100
}

// Pull the 11-char YouTube id out of a watch/share/embed URL (null if none).
export function extractYoutubeId(url: string): string | null {
  if (!url) return null
  const m =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    url.match(/embed\/([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

// The LTCL classic level list, stored in Firestore (`levels` collection, doc id
// = GD level id). Seed/import with scripts/seed-levels.mjs. Records store the
// completer's Discord username; the UI resolves it to their chosen display name.

export interface LtclRecord {
  username: string
  enjoyment: number | null
  video?: string | null
}

export interface LtclLevel {
  levelId: number
  name: string
  publisher: string
  creators: string[]
  verifier: string
  songId: number | null // Newgrounds song ID (used when not a NONG)
  songLink?: string | null // external download URL (used when it is a NONG)
  isNong: boolean
  password?: string | null
  verificationUrl?: string | null
  youtubeId?: string | null
  placement: number | null
  points: number | null
  thumbnail?: string | null // custom thumbnail image URL (overrides the auto one)
  records: LtclRecord[]
}

// Average of a level's record enjoyments, ignoring unrated ones (null when none).
export function averageEnjoyment(level: LtclLevel): number | null {
  const rated = level.records.filter((r) => typeof r.enjoyment === 'number')
  if (rated.length === 0) return null
  return rated.reduce((a, r) => a + (r.enjoyment as number), 0) / rated.length
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LbEntry {
  handle: string // lowercased username, used for profile links + display-name lookup
  points: number
  completed: LtclLevel[]
  created: LtclLevel[]
  verified: LtclLevel[]
}

// Aggregate players from the level data. Points come from challenges a player
// has beaten — either as a record holder or as the level's verifier (the
// verifier is the first person to complete it). Created levels are tracked
// separately and score nothing. Sorted by points desc.
export function buildLeaderboard(levels: LtclLevel[]): LbEntry[] {
  const map = new Map<string, LbEntry>()
  const get = (name: string) => {
    const key = name.trim().toLowerCase()
    let e = map.get(key)
    if (!e) { e = { handle: key, points: 0, completed: [], created: [], verified: [] }; map.set(key, e) }
    return e
  }
  for (const lv of levels) {
    for (const r of lv.records) if (r.username?.trim()) get(r.username).completed.push(lv)
    for (const c of lv.creators) if (c?.trim()) get(c).created.push(lv)
    if (lv.verifier?.trim()) get(lv.verifier).verified.push(lv)
  }
  const byName = (a: LtclLevel, b: LtclLevel) => a.name.localeCompare(b.name)
  for (const e of map.values()) {
    // Points count each beaten level once, whether it was completed (record)
    // or verified — so a verifier who also holds a record isn't double-scored.
    const scored = new Map<number, LtclLevel>()
    for (const l of e.completed) scored.set(l.levelId, l)
    for (const l of e.verified) scored.set(l.levelId, l)
    e.points = Math.round([...scored.values()].reduce((a, l) => a + (l.points ?? 0), 0) * 100) / 100
    // Displayed alphabetically; "hardest" is derived by placement separately.
    e.completed.sort(byName)
    e.created.sort(byName)
    e.verified.sort(byName)
  }
  return [...map.values()].sort((a, b) => b.points - a.points || a.handle.localeCompare(b.handle))
}

// ─── Merging LTCL identities into real accounts ────────────────────────────
// LTCL completer/creator/verifier "identities" are just raw name strings (see
// the comment above LtclRecord) — there's no account required to show up on
// the leaderboard. Once a player makes a gdlt-hub account, a list admin can
// merge their LTCL name into it: every occurrence of that name is rewritten
// to the account's canonical username, so profile links + display names
// resolve everywhere (leaderboard, level credits, records) going forward.

// True if a raw LTCL name field refers to the same identity as `handle` (a
// pre-normalized, i.e. trimmed + lowercased, name).
function sameIdentity(name: string, handle: string): boolean {
  return name.trim().toLowerCase() === handle
}

// Number of levels that reference `handle` anywhere in publisher/creators/
// verifier/records — lets the UI preview a merge's scope before writing.
export function countLtclProfileMatches(levels: LtclLevel[], handle: string): number {
  const h = handle.trim().toLowerCase()
  if (!h) return 0
  return levels.filter(
    (lv) =>
      sameIdentity(lv.publisher, h) ||
      sameIdentity(lv.verifier, h) ||
      lv.creators.some((c) => sameIdentity(c, h)) ||
      lv.records.some((r) => sameIdentity(r.username, h)),
  ).length
}

// Rewrite every occurrence of `handle` (case/whitespace-insensitive) across
// all levels' publisher/creators/verifier/records[].username fields to
// `targetUsername`. Returns the number of levels changed.
export async function mergeLtclProfile(
  levels: LtclLevel[],
  handle: string,
  targetUsername: string,
): Promise<number> {
  const h = handle.trim().toLowerCase()
  const dst = targetUsername.trim()
  if (!h || !dst) return 0

  const batch = writeBatch(db)
  let changed = 0
  for (const lv of levels) {
    const publisher = sameIdentity(lv.publisher, h) ? dst : lv.publisher
    const verifier = sameIdentity(lv.verifier, h) ? dst : lv.verifier
    const creators = lv.creators.map((c) => (sameIdentity(c, h) ? dst : c))
    const records = lv.records.map((r) => (sameIdentity(r.username, h) ? { ...r, username: dst } : r))
    const touched =
      publisher !== lv.publisher ||
      verifier !== lv.verifier ||
      creators.some((c, i) => c !== lv.creators[i]) ||
      records.some((r, i) => r.username !== lv.records[i].username)
    if (touched) {
      batch.set(doc(db, 'levels', String(lv.levelId)), { publisher, verifier, creators, records }, { merge: true })
      changed++
    }
  }
  if (changed > 0) await batch.commit()
  return changed
}

// Placement first (nulls last, i.e. unranked at the bottom), then name.
function byPlacement(a: LtclLevel, b: LtclLevel): number {
  const ap = a.placement ?? Number.POSITIVE_INFINITY
  const bp = b.placement ?? Number.POSITIVE_INFINITY
  if (ap !== bp) return ap - bp
  return a.name.localeCompare(b.name)
}

export function useLtclLevels() {
  const [levels, setLevels] = useState<LtclLevel[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'levels'), (snap) => {
      const list = snap.docs.map((d) => d.data() as LtclLevel)
      list.sort(byPlacement)
      setLevels(list)
      setLoaded(true)
    })
  }, [])

  return { levels, loaded }
}

// ─── Changelog phrasing (pure) ───────────────────────────────────────────────
// Each staged list edit yields one or more changelog entries in the same
// Lithuanian phrasing the hand-written log used, so the LTCL home highlighter
// formats them (placements → #N, level names linked). These are pure so the
// admin panel can stack edits on a draft and only commit the writes at the end.

// `raw` marks a free-form (custom) entry: the home page renders its text as
// plain prose and only highlights the lead level, instead of treating every
// word as a level name (which is right only for the structured pattern lines).
export type ChangelogEntry = { level: string; text: string; raw?: boolean }

// Local date in Lithuania as YYYY-MM-DD (groups entries by day on the page).
function changelogDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' })
}

// "virš X ir po Y" clause from the two neighbor names directly. `po` is the
// better-ranked level above it on the list, `virs` the worse-ranked level below
// it. Blanks are dropped. Ends the sentence with a dot.
function neighborClauseNames(po?: string, virs?: string): string {
  const a = po?.trim()
  const b = virs?.trim()
  if (b && a) return `, virš ${b} ir po ${a}.`
  if (b) return `, virš ${b}.`
  if (a) return `, po ${a}.`
  return '.'
}

// Same clause for a level sitting at array index `idx` in an ordered
// (placement-ascending) list.
function neighborClause(ordered: LtclLevel[], idx: number): string {
  return neighborClauseNames(ordered[idx - 1]?.name, ordered[idx + 1]?.name)
}

// "A, B ir C" — comma list with a final "ir", matching the changelog style.
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ir ${names[names.length - 1]}`
}

function legacyEntry(names: string[]): ChangelogEntry {
  return {
    level: '',
    text:
      names.length === 1
        ? `Į legacy sąrašą išstumiamas ${names[0]}.`
        : `Į legacy sąrašą išstumiami ${joinNames(names)}.`,
  }
}

function legacyReturnEntry(names: string[]): ChangelogEntry {
  return { level: '', text: `Į sąrašą grįžta ${joinNames(names)}.` }
}

// ─── Manual changelog builders (pure) ────────────────────────────────────────
// The same phrasing the automatic planners use, exposed so admins can hand-write
// a changelog entry from the list admin panel. Each returns a ChangelogEntry
// that stages and commits exactly like an auto-generated one. `above`/`below`
// are optional neighbor names (above = the level ranked just better, below =
// just worse). A blank field is simply omitted from the sentence.

export const MANUAL_PATTERNS = [
  'custom',
  'added',
  'moved',
  'swapped',
  'removed',
  'legacy',
  'legacyReturn',
] as const
export type ManualPattern = (typeof MANUAL_PATTERNS)[number]

// Split a comma-separated names field into a trimmed, non-empty list.
export function splitNames(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean)
}

export function manualAdd(
  name: string,
  placement: number,
  above?: string,
  below?: string,
): ChangelogEntry {
  return { level: name.trim(), text: `įdėtas į ${placement} vietą${neighborClauseNames(above, below)}` }
}

export function manualMove(
  name: string,
  from: number,
  to: number,
  above?: string,
  below?: string,
): ChangelogEntry {
  const verb = to < from ? 'pakeltas' : 'nuleistas'
  return {
    level: name.trim(),
    text: `${verb} iš ${from} vietos į ${to} vietą${neighborClauseNames(above, below)}`,
  }
}

export function manualSwap(higher: string, lower: string): ChangelogEntry {
  const h = higher.trim()
  const l = lower.trim()
  return { level: '', text: `${h} ir ${l} sukeisti vietomis, ${h} dabar aukščiau.` }
}

export function manualRemove(name: string): ChangelogEntry {
  return { level: name.trim(), text: 'pašalintas iš sąrašo.' }
}

export function manualLegacy(names: string[]): ChangelogEntry {
  return legacyEntry(names)
}

export function manualLegacyReturn(names: string[]): ChangelogEntry {
  return legacyReturnEntry(names)
}

export function manualCustom(level: string, text: string): ChangelogEntry {
  return { level: level.trim(), text: text.trim(), raw: true }
}

// Names of levels shoved from a ranked spot (≤#100) into Legacy (>#100) going
// from `before` to `after`, excluding the level the admin explicitly acted on.
function legacyDropNames(before: LtclLevel[], after: LtclLevel[], excludeId: number): string[] {
  const beforeById = new Map(before.map((l) => [l.levelId, l]))
  const drops: string[] = []
  after.forEach((l, i) => {
    const b = beforeById.get(l.levelId)
    if (
      b &&
      b.placement != null &&
      b.placement <= LEGACY_AFTER &&
      i + 1 > LEGACY_AFTER &&
      l.levelId !== excludeId
    ) {
      drops.push(l.name)
    }
  })
  return drops
}

// Names of levels pulled from Legacy (>#100) back onto the ranked list (≤#100)
// going from `before` to `after` — the mirror of legacyDropNames, e.g. when a
// removal or a downward move shifts everything up.
function legacyReturnNames(before: LtclLevel[], after: LtclLevel[], excludeId: number): string[] {
  const beforeById = new Map(before.map((l) => [l.levelId, l]))
  const returns: string[] = []
  after.forEach((l, i) => {
    const b = beforeById.get(l.levelId)
    if (
      b &&
      b.placement != null &&
      b.placement > LEGACY_AFTER &&
      i + 1 <= LEGACY_AFTER &&
      l.levelId !== excludeId
    ) {
      returns.push(l.name)
    }
  })
  return returns
}

// Renumber an ordered list to placement 1..N and recompute points.
function renumber(ordered: LtclLevel[]): LtclLevel[] {
  return ordered.map((l, i) => ({ ...l, placement: i + 1, points: pointsForPlacement(i + 1) }))
}

// ─── Draft planners (pure) ───────────────────────────────────────────────────
// Each returns the new ordered list plus the changelog entries the edit
// produces. They never touch Firestore — the admin panel applies them to an
// in-memory draft and calls commitStagedChanges() once, at the end.

export interface PlanResult {
  list: LtclLevel[]
  entries: ChangelogEntry[]
}

// Insert a new level at `target` (default: end of the list).
export function applyAdd(list: LtclLevel[], level: LtclLevel, target?: number): PlanResult {
  const before = [...list].sort(byPlacement)
  const t = target ?? before.length + 1
  const idx = Math.max(0, Math.min(before.length, t - 1))
  const inserted = [...before]
  inserted.splice(idx, 0, level)
  const after = renumber(inserted)
  const entries: ChangelogEntry[] = [
    { level: level.name, text: `įdėtas į ${idx + 1} vietą${neighborClause(after, idx)}` },
  ]
  const drops = legacyDropNames(before, after, level.levelId)
  if (drops.length) entries.push(legacyEntry(drops))
  return { list: after, entries }
}

// Move an existing level to a new 1-based placement.
export function applyMove(list: LtclLevel[], levelId: number, target: number): PlanResult {
  const before = [...list].sort(byPlacement)
  const moving = before.find((l) => l.levelId === levelId)
  if (!moving) return { list: before, entries: [] }
  const from = moving.placement
  const without = before.filter((l) => l.levelId !== levelId)
  const idx = Math.max(0, Math.min(without.length, target - 1))
  without.splice(idx, 0, moving)
  const after = renumber(without)
  const to = idx + 1
  const entries: ChangelogEntry[] = []
  if (from != null && from !== to) {
    if (Math.abs(from - to) === 1) {
      // A one-spot move just swaps two adjacent levels. After renumbering they
      // sit at the smaller (higher) and larger (lower) of the two placements.
      const higher = after[Math.min(from, to) - 1].name
      const lower = after[Math.max(from, to) - 1].name
      entries.push({
        level: '',
        text: `${higher} ir ${lower} sukeisti vietomis, ${higher} dabar aukščiau.`,
      })
    } else {
      const verb = to < from ? 'pakeltas' : 'nuleistas'
      entries.push({
        level: moving.name,
        text: `${verb} iš ${from} vietos į ${to} vietą${neighborClause(after, idx)}`,
      })
    }
  }
  const drops = legacyDropNames(before, after, levelId)
  if (drops.length) entries.push(legacyEntry(drops))
  const returns = legacyReturnNames(before, after, levelId)
  if (returns.length) entries.push(legacyReturnEntry(returns))
  return { list: after, entries }
}

// Remove a level, closing the gap so placements stay contiguous.
export function applyRemove(list: LtclLevel[], levelId: number): PlanResult {
  const before = [...list].sort(byPlacement)
  const removed = before.find((l) => l.levelId === levelId)
  const after = renumber(before.filter((l) => l.levelId !== levelId))
  const entries: ChangelogEntry[] = []
  if (removed) entries.push({ level: removed.name, text: 'pašalintas iš sąrašo.' })
  const returns = legacyReturnNames(before, after, levelId)
  if (returns.length) entries.push(legacyReturnEntry(returns))
  return { list: after, entries }
}

// ─── Admin writes ────────────────────────────────────────────────────────────

// Create or overwrite a single level's full document (used when committing a
// newly-added level). youtubeId is derived from the verification url.
export async function saveLevel(level: LtclLevel): Promise<void> {
  const clean: LtclLevel = {
    ...level,
    youtubeId: extractYoutubeId(level.verificationUrl ?? ''),
  }
  await setDoc(doc(db, 'levels', String(level.levelId)), clean)
}

// Save just a level's metadata + records, leaving placement/points untouched —
// those are owned by the staged-reorder flow. Used for immediate (non-staged)
// metadata and record edits.
export async function saveLevelMeta(level: LtclLevel): Promise<void> {
  const meta: Partial<LtclLevel> = {
    ...level,
    youtubeId: extractYoutubeId(level.verificationUrl ?? ''),
  }
  delete meta.placement
  delete meta.points
  await setDoc(doc(db, 'levels', String(level.levelId)), meta, { merge: true })
}

// Delete a single changelog entry by its doc id. Firestore rules restrict this
// to site admins (super-admin / administrator).
export async function deleteChangelogEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, 'changelog', id))
}

// Commit a batch of staged edits: write the difference between the live list and
// the draft (adds → full docs, moves/shifts → placement+points, removals →
// deletes), then append the staged changelog entries in order (later action =
// newer). Changelog writes are best-effort and never undo the list changes.
export async function commitStagedChanges(
  live: LtclLevel[],
  draft: LtclLevel[],
  entries: ChangelogEntry[],
): Promise<void> {
  const liveById = new Map(live.map((l) => [l.levelId, l]))
  const draftById = new Map(draft.map((l) => [l.levelId, l]))

  const batch = writeBatch(db)
  for (const l of live) {
    if (!draftById.has(l.levelId)) batch.delete(doc(db, 'levels', String(l.levelId)))
  }
  for (const l of draft) {
    const before = liveById.get(l.levelId)
    if (!before) {
      // Added in this session — its full metadata lives only in the draft.
      batch.set(doc(db, 'levels', String(l.levelId)), {
        ...l,
        youtubeId: extractYoutubeId(l.verificationUrl ?? ''),
      })
    } else if (before.placement !== l.placement || before.points !== l.points) {
      batch.set(
        doc(db, 'levels', String(l.levelId)),
        { placement: l.placement, points: l.points },
        { merge: true },
      )
    }
  }
  await batch.commit()

  try {
    await commitChangelogEntries(entries)
  } catch {
    // Non-fatal — the list changes already committed.
  }
}

// Append a batch of changelog entries to the `changelog` collection. The page
// shows entries newest-ts first, so within one committed batch the first staged
// entry must get the highest ts to stay on top — this keeps the committed order
// identical to the staged preview (and to the seed script's convention). A later
// commit still sorts above an earlier one, since Date.now() advances between
// commits by far more than a batch's entry count. Used by the staged list flow
// and the manual changelog tab. No-op on an empty list.
export async function commitChangelogEntries(entries: ChangelogEntry[]): Promise<void> {
  if (entries.length === 0) return
  const clBatch = writeBatch(db)
  const base = Date.now()
  const date = changelogDate()
  const n = entries.length
  entries.forEach((e, i) => {
    clBatch.set(doc(collection(db, 'changelog')), {
      level: e.level,
      text: e.text,
      date,
      ts: base + (n - 1 - i),
      // Only stored when true — keeps auto/pattern entries free of the field.
      ...(e.raw ? { raw: true } : {}),
    })
  })
  await clBatch.commit()
}

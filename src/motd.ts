import { useEffect, useRef, useState } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
} from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'

// Message of the day ("dienos žinutė"). The motd-manager role curates a pool of
// short messages in the admin panel. One message is picked per day and shown in
// a banner below the header; when the next day's message is picked the previous
// one is deleted, so each message is shown on only one day. The chosen message
// stays the same all day (it does NOT re-roll on every page refresh) and just
// scrolls across the screen periodically (see MotdBanner).
//
// The current selection is denormalized into config/motd so every visitor —
// logged in or not — sees the same banner without needing read access to the
// whole pool logic. Selecting the day's message (pick next + delete old) is
// driven from any signed-in visitor's client, since deletes require auth.

export interface Motd {
  id: string
  text: string
  createdAt: number
  createdByUsername: string
}

export const MOTD_MAX_LENGTH = 200

// The community's calendar day drives selection, so every visitor agrees on
// "today" regardless of their own clock or timezone.
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

interface MotdConfig {
  currentId: string | null // id of the message currently showing (deleted on next roll)
  text: string | null // denormalized text of the current message (null = show nothing)
  day: string | null // the community day this message was selected for
  selectedAt: number // when it was picked (a stable id for the current selection)
}

const configRef = () => doc(db, 'config', 'motd')

// ---- Admin: curate the pool of messages -----------------------------------

// Live list of all messages, newest first — used by the admin panel.
export function useMotds() {
  const [motds, setMotds] = useState<Motd[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const q = query(collection(db, 'motd'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setMotds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Motd))
      setLoaded(true)
    })
  }, [])
  return { motds, loaded }
}

// The id of the message currently selected for the banner (null when none), so
// the admin list can flag which one is on screen right now.
export function useActiveMotdId(): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    return onSnapshot(configRef(), (snap) => {
      setId(snap.exists() ? ((snap.data() as MotdConfig).currentId ?? null) : null)
    })
  }, [])
  return id
}

export async function addMotd(text: string, createdByUsername: string): Promise<void> {
  const clean = text.trim()
  if (!clean) throw new Error('empty')
  await addDoc(collection(db, 'motd'), {
    text: clean.slice(0, MOTD_MAX_LENGTH),
    createdAt: Date.now(),
    createdByUsername,
  })
}

export async function deleteMotd(id: string): Promise<void> {
  await deleteDoc(doc(db, 'motd', id))
}

// ---- Banner: selection + display ------------------------------------------

// Select the day's message: delete the one that was showing (so it can never be
// picked again) and pick a random one of the remaining, stamping today's date.
// Guarded by a transaction on config/motd so concurrent viewers can't
// double-roll — the transaction re-decides whether a roll is actually due, so
// it's safe to call speculatively. Pass force=true for an immediate manual roll
// regardless of the day.
async function rotate(pool: Motd[], force = false): Promise<void> {
  const today = todayStr()
  const now = Date.now()
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef())
    const cfg = snap.exists() ? (snap.data() as Partial<MotdConfig>) : {}
    const currentId = cfg.currentId ?? null
    const candidates = pool.filter((m) => m.id !== currentId)
    const sameDay = cfg.day === today
    const hasCurrent = !!cfg.text
    // Whether the message currently on screen still exists in the pool.
    const currentGone = !!currentId && !pool.some((m) => m.id === currentId)
    // Roll when: forced, a new day, nothing is showing yet but messages exist,
    // or the shown message was deleted out from under us.
    const shouldRoll =
      force || !sameDay || currentGone || (!hasCurrent && candidates.length > 0)
    if (!shouldRoll) return
    if (currentId) tx.delete(doc(db, 'motd', currentId))
    const pick = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null
    const next: MotdConfig = {
      currentId: pick?.id ?? null,
      text: pick?.text ?? null,
      day: today,
      selectedAt: now,
    }
    tx.set(configRef(), next)
  })
}

// Force an immediate roll: consume the current message and pick a new one right
// away. It then stays until the next day. Used by the admin "roll now" button.
export async function forceRollMotd(pool: Motd[]): Promise<void> {
  await rotate(pool, true)
}

// The banner's view of the world: the current message text (or null when there
// is nothing to show) and `selectedAt`, a stable id for the current selection.
// Also drives the once-a-day roll from signed-in clients (deletes need auth).
export function useMotdBanner(): { text: string | null; selectedAt: number } {
  const { user } = useAuth()
  const [cfg, setCfg] = useState<MotdConfig | null>(null)
  const [cfgLoaded, setCfgLoaded] = useState(false)
  const cfgRef = useRef<MotdConfig | null>(null)
  const poolRef = useRef<Motd[]>([])
  const [poolCount, setPoolCount] = useState(0)
  const rollingRef = useRef(false)

  // Current selection — read by everyone, incl. logged-out visitors.
  useEffect(() => {
    return onSnapshot(configRef(), (snap) => {
      const c = snap.exists() ? (snap.data() as MotdConfig) : null
      cfgRef.current = c
      setCfg(c)
      setCfgLoaded(true)
    })
  }, [])

  // The pool — needed to pick the day's message and to know when it's empty.
  useEffect(() => {
    return onSnapshot(collection(db, 'motd'), (snap) => {
      poolRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Motd)
      setPoolCount(poolRef.current.length)
    })
  }, [])

  // Roll the day's message when needed. Only signed-in clients can (deletes need
  // auth). We check on mount, whenever the config/pool change, and once a minute
  // so a tab left open overnight rolls over shortly after midnight.
  useEffect(() => {
    if (!user || !cfgLoaded) return
    const check = () => {
      if (rollingRef.current) return
      const c = cfgRef.current
      const pool = poolRef.current
      const today = todayStr()
      const currentInPool = !!c?.currentId && pool.some((m) => m.id === c.currentId)
      const needRoll =
        (c?.day !== today && (pool.length > 0 || !!c?.text)) || // a new day
        (!c?.text && pool.length > 0) || // nothing showing but messages exist
        (!!c?.currentId && !currentInPool) // shown message was deleted
      if (!needRoll) return
      rollingRef.current = true
      rotate(pool).finally(() => {
        rollingRef.current = false
      })
    }
    check()
    const id = window.setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [user, cfgLoaded, cfg, poolCount])

  return { text: cfg?.text ?? null, selectedAt: cfg?.selectedAt ?? 0 }
}

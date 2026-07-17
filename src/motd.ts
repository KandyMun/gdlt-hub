import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'

// Message of the day ("dienos žinutė"). The motd-manager role curates a pool of
// short messages in the admin panel. One message is picked per day and shown in
// a banner below the header; when the next day's message is picked the previous
// one is deleted, so each message is shown on only one day. The chosen message
// stays the same all day (it does NOT re-roll on every page refresh) and just
// scrolls across the screen periodically (see MotdBanner).
//
// The current selection is denormalized into config/motd so every visitor —
// logged in or not — sees the same banner. The roll itself (pick next + delete
// old) is authoritative and server-side: the `rollMotdDaily` scheduled Cloud
// Function runs at Vilnius midnight using the server's trusted clock. Clients
// only READ config/motd — they never roll — so a device with a skewed clock
// can't trigger an early/duplicate rollover. Manual rolls go through the
// `rollMotdNow` callable (admin "roll now" button).

export interface Motd {
  id: string
  text: string
  createdAt: number
  createdByUsername: string
}

export const MOTD_MAX_LENGTH = 200

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

// Force an immediate roll: consume the current message and pick a new one right
// away. It then stays until the next day. Used by the admin "roll now" button.
// The roll runs server-side (the `rollMotdNow` Cloud Function) so it uses the
// server's clock and is gated to MOTD managers.
const rollMotdNowFn = httpsCallable<void, { ok: boolean }>(functions, 'rollMotdNow')
export async function forceRollMotd(): Promise<void> {
  await rollMotdNowFn()
}

// The banner's view of the world: the current message text (or null when there
// is nothing to show) and `selectedAt`, a stable id for the current selection.
// Read-only — the daily roll is done by the server (see rollMotdDaily), so this
// hook just mirrors config/motd for every visitor, logged in or not.
export function useMotdBanner(): { text: string | null; selectedAt: number } {
  const [cfg, setCfg] = useState<MotdConfig | null>(null)

  useEffect(() => {
    return onSnapshot(configRef(), (snap) => {
      setCfg(snap.exists() ? (snap.data() as MotdConfig) : null)
    })
  }, [])

  return { text: cfg?.text ?? null, selectedAt: cfg?.selectedAt ?? 0 }
}

import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

// Upload size caps (also enforced in storage rules).
export const BADGE_ICON_MAX = 250 * 1024 // 250 KB
export const BADGE_BG_MAX = 1024 * 1024 // 1 MB

// Custom, purely-cosmetic badges. Admins define them in the `badges` collection
// and assign them to any number of users (users/{uid}.badges: string[]). Unlike
// roles they carry no permissions and are shown separately on profiles.

export interface Badge {
  id: string
  name: string
  icon: string // an emoji, or an image/gif URL (rendered as <img> when it starts with http)
  color?: string // optional hex accent for the pill text/border
  background?: string // optional background image URL, shown at a fixed 86×40
  hideName?: boolean // hide the name text (e.g. when the background art has its own)
  date?: string // optional event date (YYYY-MM-DD) for event badges
}

// Validate + upload a badge image (icon or background) to Storage; returns the URL.
export async function uploadBadgeAsset(
  file: File,
  kind: 'icons' | 'backgrounds',
  uid: string,
): Promise<string> {
  const max = kind === 'icons' ? BADGE_ICON_MAX : BADGE_BG_MAX
  if (file.size > max) throw new Error('too-large')
  if (!file.type.startsWith('image/')) throw new Error('type')
  const path = `badges/${kind}/${uid}/${Date.now()}_${file.name}`
  const r = ref(storage, path)
  await uploadBytes(r, file)
  return getDownloadURL(r)
}

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    return onSnapshot(collection(db, 'badges'), (snap) => {
      setBadges(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Badge)))
      setLoaded(true)
    })
  }, [])
  return { badges, loaded }
}

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'badge'

// Create a badge; returns its generated id.
export async function createBadge(b: Omit<Badge, 'id'>): Promise<string> {
  const id = `${slugify(b.name)}-${Math.random().toString(36).slice(2, 7)}`
  await setDoc(doc(db, 'badges', id), pruneUndefined(b))
  return id
}

// Update a badge. Unlike create, an `undefined` field here clears the stored
// value (so edits can remove an optional icon/colour/background/date).
export async function updateBadge(id: string, patch: Partial<Omit<Badge, 'id'>>): Promise<void> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) out[k] = v === undefined ? deleteField() : v
  await updateDoc(doc(db, 'badges', id), out)
}

// How many users currently wear this badge — shown before deleting.
export async function countBadgeHolders(id: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'users'), where('badges', 'array-contains', id)))
  return snap.size
}

// Delete a badge: first strip it from every user that has it (so no dead
// references linger), then remove the definition itself.
export async function deleteBadge(id: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'users'), where('badges', 'array-contains', id)))
  let batch = writeBatch(db)
  let ops = 0
  for (const d of snap.docs) {
    batch.update(d.ref, { badges: arrayRemove(id) })
    if (++ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0 }
  }
  if (ops) await batch.commit()
  await deleteDoc(doc(db, 'badges', id))
}

export async function toggleUserBadge(uid: string, badgeId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    badges: active ? arrayRemove(badgeId) : arrayUnion(badgeId),
  })
}

function pruneUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T
}

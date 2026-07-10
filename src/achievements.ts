import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { toPeople, personEntryIsEmpty, type PersonEntry } from './personRef'

// Individual entries of the hub's "top 10" lists, stored in the `achievements`
// Firestore collection (one doc per entry). Each entry belongs to a list via
// `listId` (see achievementLists.ts) and is ranked within that list by an
// explicit, per-list `order` (0-based). An entry can credit several people, each
// with their own attempt count. Anyone can read; only admins / super-admins edit.

export interface AchievementInput {
  title: string
  link: string // URL the level name links to (empty = not a link)
  people: PersonEntry[]
}

export interface Achievement extends AchievementInput {
  id: string
  listId: string
  order: number
  createdAt: number
}

export function useAchievements() {
  const [items, setItems] = useState<Achievement[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'achievements'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as Partial<Achievement>
        return {
          id: d.id,
          listId: data.listId ?? '',
          title: data.title ?? '',
          link: data.link ?? '',
          people: toPeople(data as { people?: unknown; person?: unknown }),
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: data.createdAt ?? 0,
        } as Achievement
      })
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      setItems(list)
      setLoaded(true)
    })
  }, [])

  return { items, loaded }
}

// Entries belonging to one list, in rank order. Handy for the page + CRUD calls
// (which operate on a single list's array).
export function entriesForList(all: Achievement[], listId: string): Achievement[] {
  return all
    .filter((a) => a.listId === listId)
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
}

// Drop fully-empty person rows and trim their attempts before persisting.
function cleanPeople(people: PersonEntry[]): PersonEntry[] {
  return people
    .filter((e) => !personEntryIsEmpty(e))
    .map((e) => ({ person: e.person, attempts: e.attempts.trim() }))
}

// ─── Admin writes ───────────────────────────────────────────────────────────

// Renumber the `order` of one list's entries to match their position in
// `ordered`, touching only the docs whose order actually changed.
async function persistOrder(ordered: Achievement[]): Promise<void> {
  const batch = writeBatch(db)
  let changed = 0
  ordered.forEach((it, i) => {
    if (it.order !== i) {
      batch.set(doc(db, 'achievements', it.id), { order: i }, { merge: true })
      changed++
    }
  })
  if (changed > 0) await batch.commit()
}

// `listEntries` is the target list's current entries (used to place the new one
// at the end).
export async function addAchievement(
  listEntries: Achievement[],
  listId: string,
  input: AchievementInput,
): Promise<void> {
  await addDoc(collection(db, 'achievements'), {
    listId,
    title: input.title.trim(),
    link: input.link.trim(),
    people: cleanPeople(input.people),
    order: listEntries.length,
    createdAt: Date.now(),
  })
}

export async function updateAchievement(id: string, input: AchievementInput): Promise<void> {
  await setDoc(
    doc(db, 'achievements', id),
    { title: input.title.trim(), link: input.link.trim(), people: cleanPeople(input.people) },
    { merge: true },
  )
}

// `listEntries` is the entry's list, used to re-close the rank gap after delete.
export async function deleteAchievement(listEntries: Achievement[], id: string): Promise<void> {
  await deleteDoc(doc(db, 'achievements', id))
  await persistOrder(listEntries.filter((it) => it.id !== id))
}

// Move an entry one slot up (dir = -1) or down (dir = +1) within its list.
export async function moveAchievement(listEntries: Achievement[], id: string, dir: -1 | 1): Promise<void> {
  const idx = listEntries.findIndex((it) => it.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= listEntries.length) return
  const next = [...listEntries]
  ;[next[idx], next[swap]] = [next[swap], next[idx]]
  await persistOrder(next)
}

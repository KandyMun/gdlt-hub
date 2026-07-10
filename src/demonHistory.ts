import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { toPersonRef, type PersonRef } from './personRef'

// The history of the hardest extreme demon in Lithuania: a timeline where each
// entry is a level that, at some point, held the crown. Stored in the
// `demonHistory` Firestore collection (one doc per entry). Anyone can read; only
// admins / super-admins edit them. Entries keep an explicit `order` (0-based) —
// the intended convention is newest-first, so entry #0 is the CURRENT hardest.

export interface DemonEntryInput {
  levelName: string
  date: string // free-form, e.g. "2024" or "March 2023"
  note: string // markdown notes / context
  person: PersonRef // who verified it / holds the record
}

export interface DemonEntry extends DemonEntryInput {
  id: string
  order: number
  createdAt: number
}

export function useDemonHistory() {
  const [items, setItems] = useState<DemonEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'demonHistory'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as Partial<DemonEntry>
        return {
          id: d.id,
          levelName: data.levelName ?? '',
          date: data.date ?? '',
          note: data.note ?? '',
          person: toPersonRef(data.person),
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: data.createdAt ?? 0,
        } as DemonEntry
      })
      // Newest event first (latest date = the current holder). Dated entries
      // come before undated ones; ties fall back to creation time.
      list.sort((a, b) => {
        const ad = a.date.trim()
        const bd = b.date.trim()
        if (ad && bd) {
          if (ad !== bd) return bd.localeCompare(ad) // YYYY-MM-DD sorts correctly as text
        } else if (ad !== bd) {
          return ad ? -1 : 1 // an entry with a date outranks one without
        }
        return b.createdAt - a.createdAt
      })
      setItems(list)
      setLoaded(true)
    })
  }, [])

  return { items, loaded }
}

// ─── Admin writes ───────────────────────────────────────────────────────────

async function persistOrder(ordered: DemonEntry[]): Promise<void> {
  const batch = writeBatch(db)
  let changed = 0
  ordered.forEach((it, i) => {
    if (it.order !== i) {
      batch.set(doc(db, 'demonHistory', it.id), { order: i }, { merge: true })
      changed++
    }
  })
  if (changed > 0) await batch.commit()
}

export async function addDemonEntry(current: DemonEntry[], input: DemonEntryInput): Promise<void> {
  await addDoc(collection(db, 'demonHistory'), {
    levelName: input.levelName.trim(),
    date: input.date.trim(),
    note: input.note.trim(),
    person: input.person,
    order: current.length,
    createdAt: Date.now(),
  })
}

export async function updateDemonEntry(id: string, input: DemonEntryInput): Promise<void> {
  await setDoc(
    doc(db, 'demonHistory', id),
    {
      levelName: input.levelName.trim(),
      date: input.date.trim(),
      note: input.note.trim(),
      person: input.person,
    },
    { merge: true },
  )
}

export async function deleteDemonEntry(current: DemonEntry[], id: string): Promise<void> {
  await deleteDoc(doc(db, 'demonHistory', id))
  await persistOrder(current.filter((it) => it.id !== id))
}

export async function moveDemonEntry(current: DemonEntry[], id: string, dir: -1 | 1): Promise<void> {
  const idx = current.findIndex((it) => it.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= current.length) return
  const next = [...current]
  ;[next[idx], next[swap]] = [next[swap], next[idx]]
  await persistOrder(next)
}

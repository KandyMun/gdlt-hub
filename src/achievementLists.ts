import { useEffect, useState } from 'react'
import { collection, addDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { Achievement } from './achievements'

// Named "top 10" lists shown as tabs on the Achievements page. Each list is one
// doc in the `achievementLists` collection; individual achievement entries point
// back at their list via `listId` (see achievements.ts). Anyone can read; only
// admins / super-admins edit. Lists are kept in an explicit `order`.

export interface AchievementList {
  id: string
  name: string
  order: number
  createdAt: number
}

export function useAchievementLists() {
  const [lists, setLists] = useState<AchievementList[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'achievementLists'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as Partial<AchievementList>
        return {
          id: d.id,
          name: data.name ?? '',
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: data.createdAt ?? 0,
        } as AchievementList
      })
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      setLists(list)
      setLoaded(true)
    })
  }, [])

  return { lists, loaded }
}

// ─── Admin writes ───────────────────────────────────────────────────────────

async function persistOrder(ordered: AchievementList[]): Promise<void> {
  const batch = writeBatch(db)
  let changed = 0
  ordered.forEach((it, i) => {
    if (it.order !== i) {
      batch.set(doc(db, 'achievementLists', it.id), { order: i }, { merge: true })
      changed++
    }
  })
  if (changed > 0) await batch.commit()
}

export async function addAchievementList(current: AchievementList[], name: string): Promise<void> {
  await addDoc(collection(db, 'achievementLists'), {
    name: name.trim(),
    order: current.length,
    createdAt: Date.now(),
  })
}

export async function renameAchievementList(id: string, name: string): Promise<void> {
  await setDoc(doc(db, 'achievementLists', id), { name: name.trim() }, { merge: true })
}

// Delete a list and every achievement entry that belonged to it, then close the
// gap in the remaining lists' order.
export async function deleteAchievementList(
  current: AchievementList[],
  id: string,
  entries: Achievement[],
): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'achievementLists', id))
  for (const e of entries) if (e.listId === id) batch.delete(doc(db, 'achievements', e.id))
  await batch.commit()
  await persistOrder(current.filter((l) => l.id !== id))
}

export async function moveAchievementList(current: AchievementList[], id: string, dir: -1 | 1): Promise<void> {
  const idx = current.findIndex((l) => l.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= current.length) return
  const next = [...current]
  ;[next[idx], next[swap]] = [next[swap], next[idx]]
  await persistOrder(next)
}

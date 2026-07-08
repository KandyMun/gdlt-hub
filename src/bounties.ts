import { useEffect, useState } from 'react'
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'

// The Bounty Board: anyone can post a bounty offering a euro reward for
// completing a specific (usually extreme demon) level. Money changes hands
// externally between the poster and whoever completes it — this just tracks
// the offer and lets the bounty-board-manager role confirm, once the
// recipient has actually been paid, that the bounty is done.

export const BOUNTY_MIN_AMOUNT = 2 // EUR

export type BountyStatus = 'open' | 'completed'

export interface Bounty {
  id: string
  levelName: string
  levelId: number | null // optional in-game level id, used for a thumbnail
  aredlUrl: string | null // optional AREDL (or other list) link for the level
  amount: number // EUR
  description: string
  posterId: string
  posterUsername: string
  status: BountyStatus
  createdAt: number
  completedBy?: string | null // username of whoever completed the level
  completedNote?: string | null // optional proof link / note from the manager
  completedAt?: number | null
  confirmedByUsername?: string | null // the bounty-board-manager who confirmed it
}

export interface BountyInput {
  levelName: string
  levelId: number | null
  aredlUrl: string | null
  amount: number
  description: string
}

function cleanInput(input: BountyInput) {
  if (!input.levelName.trim()) throw new Error('name')
  if (!(input.amount >= BOUNTY_MIN_AMOUNT)) throw new Error('amount')
  const aredlUrl = input.aredlUrl?.trim() || null
  if (aredlUrl && !/^https?:\/\//i.test(aredlUrl)) throw new Error('aredlUrl')
  return {
    levelName: input.levelName.trim(),
    levelId: input.levelId,
    aredlUrl,
    amount: input.amount,
    description: input.description.trim(),
  }
}

export function useBounties() {
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'bounties'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setBounties(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bounty)))
      setLoaded(true)
    })
  }, [])

  return { bounties, loaded }
}

// Create a new open bounty.
export async function createBounty(
  input: BountyInput,
  posterId: string,
  posterUsername: string,
): Promise<void> {
  const clean = cleanInput(input)
  await addDoc(collection(db, 'bounties'), {
    ...clean,
    posterId,
    posterUsername,
    status: 'open',
    createdAt: Date.now(),
    completedBy: null,
    completedNote: null,
    completedAt: null,
    confirmedByUsername: null,
  })
}

// Edit an open bounty's details (poster only — enforced in Firestore rules).
export async function updateBounty(id: string, input: BountyInput): Promise<void> {
  const clean = cleanInput(input)
  await updateDoc(doc(db, 'bounties', id), clean)
}

// Cancel (delete) a bounty — poster, bounty-board-manager, or admin.
export async function cancelBounty(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bounties', id))
}

// Bounty-board-manager confirms the reward was actually paid out.
export async function markBountyCompleted(
  id: string,
  completedBy: string,
  completedNote: string,
  confirmedByUsername: string,
): Promise<void> {
  if (!completedBy.trim()) throw new Error('completedBy')
  await updateDoc(doc(db, 'bounties', id), {
    status: 'completed',
    completedBy: completedBy.trim(),
    completedNote: completedNote.trim() || null,
    completedAt: Date.now(),
    confirmedByUsername,
  })
}

// Undo a confirmation, e.g. if it was marked complete by mistake.
export async function reopenBounty(id: string): Promise<void> {
  await updateDoc(doc(db, 'bounties', id), {
    status: 'open',
    completedBy: null,
    completedNote: null,
    completedAt: null,
    confirmedByUsername: null,
  })
}

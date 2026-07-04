import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export interface PublicProfile {
  uid: string
  username: string
  photoURL?: string
  about?: string
}

// Module-level caches so the feed doesn't refetch the same author repeatedly.
// `resolved` holds successful lookups (including genuine "no such user" nulls)
// and lets components render a known avatar synchronously on first paint.
// `inflight` dedupes concurrent requests. Errors are NOT cached, so a transient
// failure on a cold load retries instead of leaving the avatar blank forever.
const resolved = new Map<string, PublicProfile | null>()
const inflight = new Map<string, Promise<PublicProfile | null>>()

const norm = (u: string) => u.toLowerCase().trim()

export function fetchProfileByUsername(username: string): Promise<PublicProfile | null> {
  const key = norm(username)
  if (resolved.has(key)) return Promise.resolve(resolved.get(key)!)
  if (inflight.has(key)) return inflight.get(key)!

  const p = (async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', key)))
      const d = snap.docs[0]
      const profile = d ? ({ uid: d.id, ...d.data() } as PublicProfile) : null
      resolved.set(key, profile) // cache successful result (incl. genuine null)
      return profile
    } catch {
      return null // don't cache errors → retryable on the next mount
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, p)
  return p
}

// Call after a profile edit so the cached copy reflects the new avatar/about.
export function invalidateProfile(username: string) {
  const key = norm(username)
  resolved.delete(key)
  inflight.delete(key)
}

export function useProfile(username?: string): PublicProfile | null {
  const [profile, setProfile] = useState<PublicProfile | null>(() => {
    const key = username ? norm(username) : undefined
    return key && resolved.has(key) ? resolved.get(key)! : null
  })

  useEffect(() => {
    if (!username) {
      setProfile(null)
      return
    }
    let active = true
    fetchProfileByUsername(username).then((p) => {
      if (active) setProfile(p)
    })
    return () => {
      active = false
    }
  }, [username])

  return profile
}

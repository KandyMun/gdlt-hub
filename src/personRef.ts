// A reference to a person that can be attached to hub content (achievements,
// the hardest-demon timeline, …). It's either a real registered account
// (`handle` = their immutable username, which links to /u/handle and resolves
// their chosen display name) or, as a fallback, just a plain-text name for
// people who don't have — or aren't — a hub account. Rendering + editing live
// in components/PersonRef.tsx.
export interface PersonRef {
  handle: string | null // registered user's username (takes precedence)
  text: string | null // fallback plain-text name
}

export const EMPTY_PERSON: PersonRef = { handle: null, text: null }

// Normalize whatever is stored in Firestore (older/partial docs, missing keys)
// into a well-formed PersonRef.
export function toPersonRef(v: unknown): PersonRef {
  const o = (v ?? {}) as Partial<PersonRef>
  return {
    handle: typeof o.handle === 'string' && o.handle.trim() ? o.handle.trim().toLowerCase() : null,
    text: typeof o.text === 'string' && o.text.trim() ? o.text.trim() : null,
  }
}

export function personRefIsEmpty(p: PersonRef): boolean {
  return !p.handle && !p.text
}

// A person credited on an entry, together with how many attempts it took them
// (free-form text so values like "~80 000", "100 000+" or "211 extreme demons"
// are allowed). An entry can list several of these.
export interface PersonEntry {
  person: PersonRef
  attempts: string
}

export const emptyPersonEntry = (): PersonEntry => ({ person: { ...EMPTY_PERSON }, attempts: '' })

export function toPersonEntry(v: unknown): PersonEntry {
  const o = (v ?? {}) as Partial<PersonEntry>
  return {
    person: toPersonRef(o.person),
    attempts: typeof o.attempts === 'string' ? o.attempts : '',
  }
}

// Normalize an entry's people, staying backward-compatible with the older shape
// (a single `person` field + attempts kept in the description).
export function toPeople(data: { people?: unknown; person?: unknown }): PersonEntry[] {
  if (Array.isArray(data.people)) return data.people.map(toPersonEntry)
  if (data.person) return [{ person: toPersonRef(data.person), attempts: '' }]
  return []
}

export function personEntryIsEmpty(e: PersonEntry): boolean {
  return personRefIsEmpty(e.person) && !e.attempts.trim()
}

import { createContext, useContext } from 'react'

// Shared context for the DraftGuard (see DraftGuard.tsx). Kept in its own module
// so the provider component file only exports components (fast-refresh rule).

export type DraftGuardHandlers = { commit: () => Promise<void>; discard: () => void }

export interface DraftGuardCtx {
  // The staged page reports whether it currently has un-committed changes.
  setPending: (pending: boolean) => void
  // The staged page registers how to commit / discard when leaving.
  registerHandlers: (h: DraftGuardHandlers) => void
  // Wrap an in-app navigation that isn't an <a> (e.g. a tab button).
  guard: (proceed: () => void) => void
}

export const DraftGuardContext = createContext<DraftGuardCtx | null>(null)

export function useDraftGuard(): DraftGuardCtx {
  const c = useContext(DraftGuardContext)
  if (!c) throw new Error('useDraftGuard must be used within <DraftGuardProvider>')
  return c
}

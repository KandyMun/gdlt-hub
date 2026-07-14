import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { DraftGuardContext, type DraftGuardHandlers } from './draftGuardContext'

// A guard for a page with un-committed ("staged") changes. While `pending` is
// true it blocks attempts to leave — clicking any navigation link, switching a
// sub-tab (via `guard`), or closing/reloading the tab (native prompt) — and asks
// the user whether to discard, commit-and-leave, or stay.
//
// React Router here runs on a plain <BrowserRouter> (no data router), so the
// built-in blocker isn't available; instead we intercept anchor clicks at the
// document level and expose `guard()` for button-driven in-app navigation.

export function DraftGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [committing, setCommitting] = useState(false)
  const handlers = useRef<DraftGuardHandlers | null>(null)
  const proceed = useRef<(() => void) | null>(null)

  const registerHandlers = useCallback((h: DraftGuardHandlers) => {
    handlers.current = h
  }, [])

  const guard = useCallback(
    (go: () => void) => {
      if (!pending) return go()
      proceed.current = go
      setBlocked(true)
    },
    [pending],
  )

  // Warn on hard unloads (refresh / tab close) — native prompt only.
  useEffect(() => {
    if (!pending) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pending])

  // Intercept clicks on navigation links anywhere on the page.
  useEffect(() => {
    if (!pending) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download') || href.startsWith('#')) return
      const url = new URL(anchor.href, window.location.href)
      // Ignore links that don't actually change the route.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      proceed.current = () => {
        if (url.origin === window.location.origin) navigate(url.pathname + url.search + url.hash)
        else window.location.href = anchor.href
      }
      setBlocked(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pending, navigate])

  const runProceed = () => {
    const go = proceed.current
    proceed.current = null
    setBlocked(false)
    go?.()
  }

  const stay = () => {
    proceed.current = null
    setBlocked(false)
  }

  const discardAndLeave = () => {
    handlers.current?.discard()
    runProceed()
  }

  const commitAndLeave = async () => {
    setCommitting(true)
    try {
      await handlers.current?.commit()
    } finally {
      setCommitting(false)
    }
    runProceed()
  }

  return (
    <DraftGuardContext.Provider value={{ setPending, registerHandlers, guard }}>
      {children}
      {blocked && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl border border-neutral-800 p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">{t.ltcl_exit_title}</h2>
            <p className="text-sm text-neutral-400">{t.ltcl_exit_body}</p>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                onClick={stay}
                disabled={committing}
                className="text-neutral-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {t.ltcl_exit_stay}
              </button>
              <button
                onClick={discardAndLeave}
                disabled={committing}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {t.ltcl_exit_discard}
              </button>
              <button
                onClick={commitAndLeave}
                disabled={committing}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {committing ? t.ltcl_stage_committing : t.ltcl_exit_commit}
              </button>
            </div>
          </div>
        </div>
      )}
    </DraftGuardContext.Provider>
  )
}

import { useEffect, useState } from 'react'
import { useMotdBanner } from '../motd'

// Re-scroll the (same) daily message across the screen every 30–60s.
const SCROLL_MIN_MS = 30_000
const SCROLL_MAX_MS = 60_000
const nextGap = () => SCROLL_MIN_MS + Math.random() * (SCROLL_MAX_MS - SCROLL_MIN_MS)

// The message-of-the-day. The message is chosen once per day (see motd.ts) and
// stays the same all day; here it just scrolls across every 30–60s, taking 15s
// to pass. It renders as an overlay floating just below the header, on top of
// whatever content is there — a zero-height anchor holds an absolutely-
// positioned strip, so no layout space is reserved and clicks pass through.
// Nothing renders when no message is selected.
export default function MotdBanner() {
  const { text, selectedAt } = useMotdBanner()
  const [pass, setPass] = useState(0)

  // Trigger a fresh scroll pass every 30–60s while a message is showing.
  useEffect(() => {
    if (!text) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        setPass((p) => p + 1)
        schedule()
      }, nextGap())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [text, selectedAt])

  if (!text) return null

  return (
    <div className="relative z-30 h-0">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        role="status"
        aria-label="Message of the day"
      >
        {/* key changes on each new selection and on each scroll pass, remounting
            the span so the one-shot scroll animation replays. */}
        <span
          key={`${selectedAt}-${pass}`}
          className="motd-scroll px-4 py-1 text-sm font-semibold text-amber-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
        >
          {text}
        </span>
      </div>
    </div>
  )
}

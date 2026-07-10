import { useState } from 'react'
import { useAuth } from '../../AuthContext'
import { useI18n } from '../../i18n'
import { useMotds, useActiveMotdId, addMotd, deleteMotd, forceRollMotd, MOTD_MAX_LENGTH } from '../../motd'

// Message-of-the-day management: add short messages to the pool and remove any
// you don't want. The banner picks one at random every 30–60s and deletes it
// once shown, so this list is also what's left to be shown. Requires
// manage_motd (the motd-manager role, or an admin).
export default function MotdSection() {
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const { motds, loaded } = useMotds()
  const activeId = useActiveMotdId()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [rolling, setRolling] = useState(false)

  const username = profile?.username ?? user?.email?.split('@')[0] ?? ''

  // Preview the pool sorted alphabetically (locale-aware, so Lithuanian letters
  // order correctly). The message currently on the banner is pulled to the top
  // and highlighted so it's easy to see which one is showing right now.
  const active = motds.find((m) => m.id === activeId) ?? null
  const rest = motds
    .filter((m) => m.id !== activeId)
    .sort((a, b) => a.text.localeCompare(b.text, locale, { sensitivity: 'base' }))
  const ordered = active ? [active, ...rest] : rest

  async function handleAdd() {
    const clean = text.trim()
    if (!clean || saving) return
    setSaving(true)
    try {
      await addMotd(clean, username)
      setText('')
    } finally {
      setSaving(false)
    }
  }

  // Force an immediate roll: consume the current message and pick a new one now.
  async function handleRoll() {
    if (rolling || motds.length === 0) return
    setRolling(true)
    try {
      await forceRollMotd(motds)
    } finally {
      setRolling(false)
    }
  }

  return (
    <div className="bg-neutral-900 rounded-2xl px-4 py-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-medium text-sm">{t.motd_title}</p>
          <p className="text-neutral-500 text-xs mt-0.5">{t.motd_hint}</p>
        </div>
        <button
          onClick={handleRoll}
          disabled={rolling || motds.length === 0}
          title={t.motd_roll_hint}
          className="shrink-0 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          {rolling ? t.motd_rolling : t.motd_roll}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={text}
          maxLength={MOTD_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder={t.motd_placeholder}
          className="flex-1 min-w-[12rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {t.motd_add}
        </button>
      </div>

      {loaded && motds.length === 0 ? (
        <p className="text-neutral-600 text-xs">{t.motd_empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((m) => {
            const isActive = m.id === activeId
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  isActive
                    ? 'bg-amber-500/10 border border-amber-500/40'
                    : 'bg-neutral-800/60'
                }`}
              >
                {isActive && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded px-1.5 py-0.5">
                    {t.motd_active}
                  </span>
                )}
                <span className={`flex-1 text-sm break-words ${isActive ? 'text-amber-100' : 'text-neutral-100'}`}>
                  {m.text}
                </span>
                {m.createdByUsername && (
                  <span className="text-neutral-500 text-xs shrink-0">@{m.createdByUsername}</span>
                )}
                <button
                  onClick={() => deleteMotd(m.id)}
                  className="text-neutral-500 hover:text-red-400 text-sm shrink-0"
                  aria-label={t.motd_delete}
                  title={t.motd_delete}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

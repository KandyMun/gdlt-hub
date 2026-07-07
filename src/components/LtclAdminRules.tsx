import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useLtclRules, setLtclRules, DEFAULT_LTCL_RULES } from '../useLtclRules'
import { RulesView } from './LtclRules'

// Rules editor for the LTCL admin panel. Rules are markdown; a toolbar inserts
// formatting and a live preview shows the rendered result. The public Rules
// page is view-only. Requires edit_rules.
export default function LtclAdminRules() {
  const { t } = useI18n()
  const { rules } = useLtclRules()
  const taRef = useRef<HTMLTextAreaElement>(null)
  // `draft` is null until the admin starts typing, so the textarea always
  // reflects the latest saved rules until it's deliberately edited.
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const value = draft ?? rules
  const dirty = draft !== null && draft !== rules

  function edit(next: string) {
    setDraft(next)
    setSaved(false)
  }

  // Wrap the current selection with markers (bold, italic, code, links).
  function wrap(before: string, after = before, placeholder = '') {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + before + sel + after + value.slice(end)
    edit(next)
    const selStart = start + before.length
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(selStart, selStart + sel.length)
    })
  }

  // Prefix each line touched by the selection (headings, lists, quotes).
  function prefixLines(prefix: string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const nl = value.indexOf('\n', end)
    const lineEnd = nl === -1 ? value.length : nl
    const block = value.slice(lineStart, lineEnd)
    const prefixed = block.split('\n').map((l) => prefix + l).join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    edit(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(lineStart, lineStart + prefixed.length)
    })
  }

  async function save() {
    setSaving(true)
    try {
      await setLtclRules(value.trim() || DEFAULT_LTCL_RULES)
      setDraft(null)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const toolBtn = 'px-2.5 py-1 rounded-md text-sm text-neutral-200 bg-neutral-800 hover:bg-neutral-700 transition-colors'

  return (
    <div className="flex flex-col gap-3">
      <p className="text-neutral-500 text-sm">{t.ltcl_admin_rules_hint}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wide">{t.ltcl_admin_rules_editor}</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => prefixLines('## ')} className={toolBtn} title={t.ltcl_fmt_heading}>H</button>
            <button type="button" onClick={() => wrap('**', '**', t.ltcl_fmt_bold_text)} className={`${toolBtn} font-bold`} title={t.ltcl_fmt_bold}>B</button>
            <button type="button" onClick={() => wrap('*', '*', t.ltcl_fmt_italic_text)} className={`${toolBtn} italic`} title={t.ltcl_fmt_italic}>I</button>
            <button type="button" onClick={() => wrap('~~', '~~', t.ltcl_fmt_strike_text)} className={`${toolBtn} line-through`} title={t.ltcl_fmt_strike}>S</button>
            <button type="button" onClick={() => prefixLines('- ')} className={toolBtn} title={t.ltcl_fmt_list}>• List</button>
            <button type="button" onClick={() => prefixLines('1. ')} className={toolBtn} title={t.ltcl_fmt_numbered}>1. List</button>
            <button type="button" onClick={() => prefixLines('> ')} className={toolBtn} title={t.ltcl_fmt_quote}>❝</button>
            <button type="button" onClick={() => wrap('[', '](https://)', t.ltcl_fmt_link_text)} className={toolBtn} title={t.ltcl_fmt_link}>🔗</button>
          </div>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => edit(e.target.value)}
            rows={20}
            className="w-full h-full bg-neutral-800 text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 resize-y leading-relaxed font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wide">{t.ltcl_admin_rules_preview}</p>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 overflow-y-auto max-h-[34rem] min-h-[8rem]">
            {value.trim()
              ? <RulesView text={value} />
              : <p className="text-neutral-600 text-sm">{t.ltcl_admin_rules_preview_empty}</p>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && !dirty && <span className="text-emerald-400 text-sm">{t.ltcl_admin_rules_saved}</span>}
        <button
          onClick={() => edit(DEFAULT_LTCL_RULES)}
          className="text-neutral-400 hover:text-neutral-200 text-sm"
        >
          {t.ltcl_admin_rules_reset}
        </button>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? t.profile_saving : t.profile_save}
        </button>
      </div>
    </div>
  )
}

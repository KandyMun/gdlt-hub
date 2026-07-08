import { useState } from 'react'
import { useAuth } from '../../AuthContext'
import { useI18n } from '../../i18n'
import { useBadges, createBadge, updateBadge, deleteBadge, countBadgeHolders, uploadBadgeAsset, type Badge } from '../../badges'
import BadgePill from '../BadgePill'
import { useFileDrop } from '../../useFileDrop'

const EMPTY = { name: '', icon: '', color: '', background: '', hideName: false, date: '' }

// Badge management: create, edit (click a badge), preview and delete badges.
// Requires assign_roles.
export default function BadgesSection() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { badges } = useBadges()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [badgeUploading, setBadgeUploading] = useState<'icon' | 'background' | null>(null)
  const [badgeError, setBadgeError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number | null } | null>(null)
  const [deleting, setDeleting] = useState(false)

  function askDelete(b: Badge) {
    setConfirmDelete({ id: b.id, name: b.name, count: null })
    countBadgeHolders(b.id)
      .then((count) => setConfirmDelete((c) => (c && c.id === b.id ? { ...c, count } : c)))
      .catch(() => { /* leave count null — the delete still works */ })
  }

  async function confirmDeleteBadge() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteBadge(confirmDelete.id)
      if (editingId === confirmDelete.id) resetForm()
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  function startEdit(b: Badge) {
    setEditingId(b.id)
    setForm({
      name: b.name ?? '',
      icon: b.icon ?? '',
      color: b.color ?? '',
      background: b.background ?? '',
      hideName: !!b.hideName,
      date: b.date ?? '',
    })
    setBadgeError('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY)
    setBadgeError('')
  }

  async function handleBadgeUpload(kind: 'icon' | 'background', file: File | undefined) {
    if (!file || !user) return
    setBadgeError('')
    setBadgeUploading(kind)
    try {
      const url = await uploadBadgeAsset(file, kind === 'icon' ? 'icons' : 'backgrounds', user.uid)
      setForm((s) => ({ ...s, [kind]: url }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setBadgeError(msg === 'too-large'
        ? (kind === 'icon' ? t.users_badge_icon_big : t.users_badge_bg_big)
        : t.users_badge_upload_failed)
    } finally {
      setBadgeUploading(null)
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
        background: form.background.trim() || undefined,
        hideName: form.hideName || undefined,
        date: form.date || undefined,
      }
      if (editingId) await updateBadge(editingId, payload)
      else await createBadge({ ...payload, icon: payload.icon ?? '' })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const { dragging: iconDragging, dropProps: iconDropProps } = useFileDrop((f) => handleBadgeUpload('icon', f))
  const { dragging: bgDragging, dropProps: bgDropProps } = useFileDrop((f) => handleBadgeUpload('background', f))

  // Badges with a background image render as large art tiles; plain ones render
  // as small pills — group them so the two visual styles don't mix in one row.
  const plain = badges.filter((b) => !b.background)
  const withBg = badges.filter((b) => b.background)
  const showLabels = plain.length > 0 && withBg.length > 0

  const badgeItem = (b: Badge) => (
    <span key={b.id} className={`inline-flex items-center gap-1 rounded-full ${editingId === b.id ? 'ring-2 ring-violet-500' : ''}`}>
      <button onClick={() => startEdit(b)} className="cursor-pointer" title={t.users_badge_edit} aria-label={t.users_badge_edit}>
        <BadgePill badge={b} />
      </button>
      <button
        onClick={() => askDelete(b)}
        className="text-neutral-500 hover:text-red-400 text-xs"
        aria-label="delete badge"
      >
        ✕
      </button>
    </span>
  )

  return (
    <div className="bg-neutral-900 rounded-2xl px-4 py-3 flex flex-col gap-3">
      <p className="text-white font-medium text-sm">{t.users_badges_title}</p>
      {plain.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {showLabels && <p className="text-neutral-500 text-xs">{t.users_badge_group_plain}</p>}
          <div className="flex flex-wrap gap-2 items-center">{plain.map(badgeItem)}</div>
        </div>
      )}
      {withBg.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {showLabels && <p className="text-neutral-500 text-xs">{t.users_badge_group_bg}</p>}
          <div className="flex flex-wrap gap-3 items-center">{withBg.map(badgeItem)}</div>
        </div>
      )}
      {confirmDelete && (
        <div className="border border-red-800/60 bg-red-950/30 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[12rem]">
            <p className="text-red-200 text-sm font-medium">{t.users_badge_delete_q(confirmDelete.name)}</p>
            <p className="text-neutral-400 text-xs mt-0.5">
              {confirmDelete.count === null
                ? t.users_badge_counting
                : confirmDelete.count === 0
                  ? t.users_badge_delete_none
                  : t.users_badge_delete_count(confirmDelete.count)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="text-neutral-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg"
            >
              {t.users_badge_cancel}
            </button>
            <button
              onClick={confirmDeleteBadge}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
            >
              {deleting ? t.deleting : t.users_badge_delete_confirm}
            </button>
          </div>
        </div>
      )}
      {editingId && (
        <p className="text-violet-300 text-xs">{t.users_badge_editing(form.name || '—')}</p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          placeholder={t.users_badge_name}
          className="flex-1 min-w-[8rem] bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <input
          value={/^https?:\/\//.test(form.icon) ? '' : form.icon}
          onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))}
          placeholder={t.users_badge_icon}
          className="w-36 bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
        />
        <input
          type="color"
          value={form.color || '#a78bfa'}
          onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}
          title={t.users_badge_color}
          className="w-9 h-9 bg-neutral-800 rounded-lg cursor-pointer shrink-0"
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label {...iconDropProps} className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${iconDragging ? 'bg-violet-800/60 ring-2 ring-violet-400 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'}`}>
          {badgeUploading === 'icon' ? t.profile_uploading : t.users_badge_icon_upload}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { handleBadgeUpload('icon', e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {/^https?:\/\//.test(form.icon) && (
          <button onClick={() => setForm((s) => ({ ...s, icon: '' }))} className="text-xs text-neutral-400 hover:text-red-400" title={t.users_badge_remove_icon}>✕ {t.users_badge_icon_upload}</button>
        )}
        <label {...bgDropProps} className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${bgDragging ? 'bg-violet-800/60 ring-2 ring-violet-400 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'}`}>
          {badgeUploading === 'background' ? t.profile_uploading : t.users_badge_bg_upload}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { handleBadgeUpload('background', e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {form.background && (
          <button onClick={() => setForm((s) => ({ ...s, background: '' }))} className="text-xs text-neutral-400 hover:text-red-400" title={t.users_badge_remove_bg}>✕ {t.users_badge_bg_upload}</button>
        )}
        <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
          <input type="checkbox" checked={form.hideName} onChange={(e) => setForm((s) => ({ ...s, hideName: e.target.checked }))} className="accent-violet-500" />
          {t.users_badge_hide_name}
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          title={t.users_badge_date}
          className="bg-neutral-800 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-500"
        />
        {(form.name || form.icon || form.background) && (
          <span className="ml-1"><BadgePill badge={{ id: 'preview', name: form.name || '—', icon: form.icon, color: form.color || undefined, background: form.background || undefined, hideName: form.hideName, date: form.date || undefined }} /></span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {editingId && (
            <button
              onClick={resetForm}
              disabled={saving}
              className="text-neutral-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              {t.users_badge_cancel}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {editingId ? t.users_badge_save : t.users_badge_create}
          </button>
        </div>
      </div>
      <p className="text-neutral-600 text-xs">{editingId ? t.users_badge_edit_hint : t.users_badge_hint}</p>
      {badgeError && <p className="text-red-400 text-xs">{badgeError}</p>}
    </div>
  )
}

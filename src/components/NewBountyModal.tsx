import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { createBounty, updateBounty, BOUNTY_MIN_AMOUNT, type Bounty } from '../bounties'

interface Props {
  onClose: () => void
  bounty?: Bounty // present when editing an existing (open) bounty
}

// Shared form for posting a new bounty or editing an existing open one — the
// only difference is which write call fires on submit.
export default function NewBountyModal({ onClose, bounty }: Props) {
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const editing = !!bounty
  const [levelName, setLevelName] = useState(bounty?.levelName ?? '')
  const [levelId, setLevelId] = useState(bounty?.levelId != null ? String(bounty.levelId) : '')
  const [aredlUrl, setAredlUrl] = useState(bounty?.aredlUrl ?? '')
  const [amount, setAmount] = useState(bounty ? String(bounty.amount) : '')
  const [description, setDescription] = useState(bounty?.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')

    if (!levelName.trim()) {
      setError(t.bounty_form_err_name)
      return
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum < BOUNTY_MIN_AMOUNT) {
      setError(t.bounty_form_err_amount)
      return
    }
    if (aredlUrl.trim() && !/^https?:\/\//i.test(aredlUrl.trim())) {
      setError(t.bounty_form_err_aredl)
      return
    }

    const input = {
      levelName,
      levelId: levelId.trim() ? Number(levelId) : null,
      aredlUrl: aredlUrl.trim() || null,
      amount: amountNum,
      description,
    }

    setLoading(true)
    try {
      if (editing) {
        await updateBounty(bounty.id, input)
      } else {
        const posterUsername = profile?.username ?? user.email?.split('@')[0] ?? ''
        await createBounty(input, user.uid, posterUsername)
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.bounty_form_err_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {editing ? t.bounty_edit_title : t.bounty_new_title}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">{t.bounty_form_level_name}</span>
            <input
              type="text"
              placeholder={t.bounty_form_level_name_placeholder}
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              required
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">{t.bounty_form_level_id}</span>
            <input
              type="number"
              inputMode="numeric"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">{t.bounty_form_aredl}</span>
            <input
              type="url"
              inputMode="url"
              placeholder={t.bounty_form_aredl_placeholder}
              value={aredlUrl}
              onChange={(e) => setAredlUrl(e.target.value)}
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
            <span className="text-neutral-500 text-xs">{t.bounty_form_aredl_hint}</span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">{t.bounty_form_amount}</span>
            <input
              type="number"
              min={BOUNTY_MIN_AMOUNT}
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
            />
            <span className="text-neutral-500 text-xs">{t.bounty_form_amount_hint}</span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">{t.bounty_form_description}</span>
            <textarea
              placeholder={t.bounty_form_description_placeholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-none"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !levelName.trim() || !amount}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? t.bounty_form_saving : editing ? t.bounty_form_save : t.bounty_form_submit}
          </button>
        </form>
      </div>
    </div>
  )
}

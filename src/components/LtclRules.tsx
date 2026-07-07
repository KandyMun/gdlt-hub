import { useI18n } from '../i18n'
import { useLtclRules } from '../useLtclRules'
import Markdown from './Markdown'

// Render the rules as markdown. Exported so the admin editor can show a live
// preview with identical formatting.
export function RulesView({ text }: { text: string }) {
  return <Markdown text={text} />
}

export default function LtclRules() {
  const { t } = useI18n()
  const { rules } = useLtclRules()

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-white">{t.ltcl_tab_rules}</h1>
        </div>
        <RulesView text={rules} />
      </div>
    </div>
  )
}

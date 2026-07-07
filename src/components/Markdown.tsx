import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

// Dark-theme element map for rendered markdown. Raw HTML is NOT enabled, so
// user/staff input can't inject scripts. Used for the LTCL rules (and reusable
// for any rich text elsewhere in the hub).
const components: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-5 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-3 mb-1.5 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-neutral-300 leading-relaxed my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 flex flex-col gap-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 flex flex-col gap-1 my-2">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-neutral-300 leading-relaxed marker:text-neutral-500">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">{children}</a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-neutral-500 line-through">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-neutral-700 pl-3 text-neutral-400 italic my-2">{children}</blockquote>
  ),
  hr: () => <hr className="border-neutral-800 my-4" />,
  code: ({ children }) => (
    <code className="bg-neutral-800 text-neutral-200 px-1 py-0.5 rounded text-[0.85em]">{children}</code>
  ),
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{text}</ReactMarkdown>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useCan } from '../permissions'
import { useAchievements, entriesForList } from '../achievements'
import {
  useAchievementLists,
  addAchievementList,
  renameAchievementList,
  deleteAchievementList,
  moveAchievementList,
  type AchievementList,
} from '../achievementLists'
import { useRegisteredUsers } from '../registeredUsers'
import AchievementListPanel from './AchievementListPanel'
import DemonHistoryPanel from './DemonHistoryPanel'
import Spinner from './Spinner'

// How many cards (lists + the hardest-demon timeline) fit on one carousel page.
const CARDS_PER_PAGE = 3

// A card in the carousel: either a "top 10" list or the hardest-demon timeline.
type Card = { key: string; kind: 'list'; list: AchievementList } | { key: string; kind: 'demon' }

// Each carousel page belongs to a category, which drives the header title +
// subtitle shown while that page is in view. The "top 10" lists fill
// 'achievements' pages; the hardest-demon timeline is its own 'history' page.
type Category = 'achievements' | 'history'
type Page = { category: Category; cards: Card[] }

// Public Achievements page: the admin-managed "top 10" lists plus the
// hardest-demon timeline, all shown as cards in a paged carousel (CARDS_PER_PAGE
// per page — extra cards spill onto the next page, reachable via the dot
// controls). Read-only by default; admins / super-admins (manage_hub_pages) flip
// an Edit toggle to reveal inline editing. Each card scrolls vertically on its
// own when its content is taller than the screen.
export default function AchievementsPage() {
  const { t } = useI18n()
  const canEdit = useCan('manage_hub_pages')
  const { lists, loaded: listsLoaded } = useAchievementLists()
  const { items, loaded: itemsLoaded } = useAchievements()
  const { users } = useRegisteredUsers()
  const [editMode, setEditMode] = useState(false)

  const editing = canEdit && editMode

  // Carousel paging: the dots reflect which page is in view; clicking one slides
  // to it. pageCount is known from `pages`, so no width measuring is needed.
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Lists fill the 'achievements' pages (CARDS_PER_PAGE each); the hardest-demon
  // timeline is always its own final 'history' page.
  const listCards: Card[] = lists.map((l) => ({ key: l.id, kind: 'list' as const, list: l }))
  const pages: Page[] = []
  for (let i = 0; i < listCards.length; i += CARDS_PER_PAGE) {
    pages.push({ category: 'achievements', cards: listCards.slice(i, i + CARDS_PER_PAGE) })
  }
  if (pages.length === 0) pages.push({ category: 'achievements', cards: [] })
  pages.push({ category: 'history', cards: [{ key: '__demon__', kind: 'demon' }] })

  // The header title/subtitle follow whichever page is currently in view, and
  // the arrows flanking it hint at the adjacent pages' categories.
  const catLabel = (c: Category) => (c === 'history' ? t.demon_title : t.achievements_title)
  const clampedPage = Math.min(currentPage, pages.length - 1)
  const activeCategory = (pages[clampedPage] ?? pages[0]).category
  const isHistory = activeCategory === 'history'
  const prevLabel = clampedPage > 0 ? catLabel(pages[clampedPage - 1].category) : null
  const nextLabel = clampedPage < pages.length - 1 ? catLabel(pages[clampedPage + 1].category) : null

  const updatePage = useCallback(() => {
    const el = scrollerRef.current
    if (el) setCurrentPage(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updatePage)
    return () => window.removeEventListener('resize', updatePage)
  }, [updatePage])

  function goToPage(i: number) {
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  if (!listsLoaded || !itemsLoaded) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 sm:px-6 py-10">
      <div className="relative mb-6 min-h-[3.25rem]">
        {canEdit && (
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`absolute right-0 top-0 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              editMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            {editMode ? t.hub_done : `✎ ${t.hub_edit}`}
          </button>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-3xl mx-auto px-2">
          <div className="justify-self-end">
            {prevLabel && (
              <button
                onClick={() => goToPage(clampedPage - 1)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
                aria-label={t.carousel_go_to_page(clampedPage)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                <span className="text-xs font-medium hidden sm:inline max-w-[9rem] truncate">{prevLabel}</span>
              </button>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span aria-hidden="true">{isHistory ? '👑' : '🏅'}</span> {isHistory ? t.demon_title : t.achievements_title}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">{isHistory ? t.demon_subtitle : t.achievements_subtitle}</p>
          </div>

          <div className="justify-self-start">
            {nextLabel && (
              <button
                onClick={() => goToPage(clampedPage + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
                aria-label={t.carousel_go_to_page(clampedPage + 2)}
              >
                <span className="text-xs font-medium hidden sm:inline max-w-[9rem] truncate">{nextLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex justify-center items-center gap-2.5 mb-6">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              aria-label={t.carousel_go_to_page(i + 1)}
              aria-current={i === clampedPage}
              className={`h-3 rounded-full transition-all ${
                i === clampedPage ? 'w-8 bg-violet-500' : 'w-3 bg-neutral-600 hover:bg-neutral-500'
              }`}
            />
          ))}
        </div>
      )}

      <div
        ref={scrollerRef}
        onScroll={updatePage}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((pg, pi) => (
          <div key={pi} className="snap-start shrink-0 w-full flex divide-x divide-neutral-800">
            {pg.cards.length === 0 ? (
              <div className="flex-1 px-4">
                <p className="text-neutral-600 text-sm py-8 text-center">{t.list_none}</p>
              </div>
            ) : (
              pg.cards.map((card) => (
                <div key={card.key} className="flex-1 min-w-0 px-4 flex flex-col gap-2 max-h-[72vh]">
                  {card.kind === 'demon' ? (
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                      <DemonHistoryPanel canEdit={editing} users={users} />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-white font-semibold text-base leading-snug">{card.list.name || t.achievements_untitled_list}</h2>
                      {editing && (
                        <ListToolbar list={card.list} lists={lists} entryCount={entriesForList(items, card.list.id).length} />
                      )}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        <AchievementListPanel
                          listId={card.list.id}
                          entries={entriesForList(items, card.list.id)}
                          canEdit={editing}
                          users={users}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {editing && <NewListButton lists={lists} />}
    </div>
  )
}

function NewListButton({ lists }: { lists: AchievementList[] }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await addAchievementList(lists, name)
      setName('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <button onClick={() => setAdding(true)} className="mt-5 text-sm px-3 py-1.5 rounded-lg border border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors">
        ＋ {t.list_new}
      </button>
    )
  }

  return (
    <span className="mt-5 flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setAdding(false) }}
        placeholder={t.list_name_placeholder}
        className="bg-neutral-800 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 w-56"
      />
      <button onClick={create} disabled={saving || !name.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg">{t.list_create}</button>
      <button onClick={() => { setAdding(false); setName('') }} className="text-neutral-500 hover:text-white text-sm px-1">✕</button>
    </span>
  )
}

function ListToolbar({
  list,
  lists,
  entryCount,
}: {
  list: AchievementList
  lists: AchievementList[]
  entryCount: number
}) {
  const { t } = useI18n()
  const { items } = useAchievements()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(list.name)
  const idx = lists.findIndex((l) => l.id === list.id)

  async function saveName() {
    if (!name.trim()) return
    await renameAchievementList(list.id, name)
    setRenaming(false)
  }

  async function handleDelete() {
    if (!confirm(t.list_delete_confirm(list.name || t.achievements_untitled_list, entryCount))) return
    await deleteAchievementList(lists, list.id, items)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900/60 border border-neutral-800 rounded-xl px-2.5 py-1.5">
      {renaming ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setRenaming(false); setName(list.name) } }}
            className="flex-1 min-w-0 bg-neutral-800 text-white rounded-lg px-2.5 py-1 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button onClick={saveName} disabled={!name.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1 rounded-lg">{t.list_save}</button>
          <button onClick={() => { setRenaming(false); setName(list.name) }} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium px-2.5 py-1 rounded-lg">{t.list_cancel}</button>
        </>
      ) : (
        <>
          <button onClick={() => setRenaming(true)} className="text-neutral-300 hover:text-violet-300 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800">{t.list_rename}</button>
          <button onClick={() => moveAchievementList(lists, list.id, -1)} disabled={idx === 0} className="text-neutral-400 hover:text-white disabled:opacity-30 text-sm px-1" aria-label={t.hub_move_left}>◀</button>
          <button onClick={() => moveAchievementList(lists, list.id, 1)} disabled={idx === lists.length - 1} className="text-neutral-400 hover:text-white disabled:opacity-30 text-sm px-1" aria-label={t.hub_move_right}>▶</button>
          <button onClick={handleDelete} className="text-neutral-400 hover:text-red-400 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800 ml-auto">{t.list_delete}</button>
        </>
      )}
    </div>
  )
}

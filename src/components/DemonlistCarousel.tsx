import { useCallback, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import AredlStats from './AredlStats'
import PointercrateStats from './PointercrateStats'

type SlideKey = 'aredl' | 'pointercrate'

// Groups the demon-list stat cards (AREDL + Pointercrate) into a single
// swipeable carousel. Each card reports whether it has anything to show; the
// carousel only renders navigation once at least two are worth displaying, and
// stays out of the layout entirely when none are.
export default function DemonlistCarousel({
  username,
  discordId,
  uid,
  pointercrateUsername,
  isOwner,
  onPointercrateSaved,
}: {
  username: string
  discordId?: string
  uid: string
  pointercrateUsername?: string
  isOwner: boolean
  onPointercrateSaved: (name: string) => void
}) {
  const { t } = useI18n()
  const [visible, setVisible] = useState<Record<SlideKey, boolean>>({
    aredl: false,
    pointercrate: false,
  })
  const [active, setActive] = useState<SlideKey>('aredl')

  const report = useCallback((key: SlideKey, v: boolean) => {
    setVisible((prev) => (prev[key] === v ? prev : { ...prev, [key]: v }))
  }, [])
  const onAredlVis = useCallback((v: boolean) => report('aredl', v), [report])
  const onPcVis = useCallback((v: boolean) => report('pointercrate', v), [report])

  const order: SlideKey[] = ['aredl', 'pointercrate']
  const labels: Record<SlideKey, string> = { aredl: t.aredl_title, pointercrate: t.pc_title }
  const visibleKeys = order.filter((k) => visible[k])

  // Derive the shown slide from what's currently visible so a slide going away
  // (e.g. an owner unlinking) never leaves us on a blank panel.
  const activeKey = visibleKeys.includes(active) ? active : visibleKeys[0]
  const idx = activeKey ? visibleKeys.indexOf(activeKey) : -1

  const go = (dir: number) => {
    if (visibleKeys.length < 2 || idx < 0) return
    setActive(visibleKeys[(idx + dir + visibleKeys.length) % visibleKeys.length])
  }

  // Swipe navigation on touch devices.
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  return (
    <div className={visibleKeys.length ? 'mt-4' : ''}>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Both cards stay mounted so they can load data and report visibility;
            only the active one is shown. */}
        <div className={activeKey === 'aredl' ? '' : 'hidden'}>
          <AredlStats username={username} discordId={discordId} onVisibilityChange={onAredlVis} />
        </div>
        <div className={activeKey === 'pointercrate' ? '' : 'hidden'}>
          <PointercrateStats
            uid={uid}
            pointercrateUsername={pointercrateUsername}
            isOwner={isOwner}
            onSaved={onPointercrateSaved}
            onVisibilityChange={onPcVis}
          />
        </div>
      </div>

      {visibleKeys.length >= 2 && (
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => go(-1)}
            aria-label={t.carousel_prev}
            className="text-neutral-500 hover:text-neutral-200 text-xl leading-none px-1 transition-colors"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            {visibleKeys.map((k) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                title={labels[k]}
                aria-label={labels[k]}
                aria-current={k === activeKey}
                className={`h-2 rounded-full transition-all ${
                  k === activeKey ? 'w-5 bg-violet-400' : 'w-2 bg-neutral-600 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            aria-label={t.carousel_next}
            className="text-neutral-500 hover:text-neutral-200 text-xl leading-none px-1 transition-colors"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

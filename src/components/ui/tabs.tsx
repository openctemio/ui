'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

/**
 * One tab style across the app: `line` (underline) is the default for every
 * Tabs. `segment` (pill) remains only as an explicit opt-in and is not used by
 * pages — mixing the two made tabs look different from screen to screen.
 * Equal-width layouts (`className="grid grid-cols-N"`) work with the underline
 * too: triggers centre their label in the cell.
 */
type TabsVariant = 'segment' | 'line'

const TabsVariantContext = React.createContext<TabsVariant>('line')

/**
 * The underline tab strip, shared by `TabsList` and route-link strips
 * (`SectionTabs`) so both look identical. It scrolls sideways when the tabs do
 * not fit; the fade on an edge (see `useTabStripScroll`) says more are hidden.
 */
export const TAB_STRIP_CLASS =
  'flex h-10 w-full max-w-full items-stretch justify-start gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b text-muted-foreground no-scrollbar data-[fade-end=true]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] data-[fade-start=true]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem)] data-[fade-start=true]:data-[fade-end=true]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)]'

/** One underline tab in a `TAB_STRIP_CLASS` strip. */
export const TAB_CLASS =
  // The active underline is an inset shadow drawn inside the tab, right on top
  // of the strip's border. It used to be a border pulled down 1px (-mb-px),
  // which made every strip 1px taller than its box: on iOS that let the strip
  // scroll vertically and the tabs wobbled under a finger. shrink-0 keeps
  // labels whole; the strip scrolls sideways instead.
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-0.5 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--foreground)] aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--foreground)] [&_svg]:size-4 [&_svg]:shrink-0'

/**
 * Keeps a horizontally scrolling tab strip usable on narrow screens: marks
 * which edges have hidden tabs (drives the fade), and scrolls the active tab
 * (`data-state=active` or `aria-current=page`) into view on load and whenever
 * it changes, so a tab past the edge is never selected but invisible.
 */
export function useTabStripScroll(ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const x = Math.abs(el.scrollLeft)
      const max = el.scrollWidth - el.clientWidth
      el.dataset.fadeStart = String(x > 1)
      el.dataset.fadeEnd = String(max - x > 1)
    }
    const revealActive = () => {
      const active = el.querySelector<HTMLElement>('[data-state="active"], [aria-current="page"]')
      if (!active) return
      const a = active.getBoundingClientRect()
      const s = el.getBoundingClientRect()
      if (a.left < s.left || a.right > s.right) {
        el.scrollBy({ left: a.left - s.left - (s.width - a.width) / 2, behavior: 'auto' })
      }
      update()
    }
    revealActive()
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : undefined
    ro?.observe(el)
    const mo =
      typeof MutationObserver === 'function' ? new MutationObserver(revealActive) : undefined
    mo?.observe(el, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-current'],
    })
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [ref])
}

function TabsList({
  className,
  variant = 'line',
  ref,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  const localRef = React.useRef<HTMLDivElement>(null)
  useTabStripScroll(localRef)
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        ref={setRef}
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          variant === 'line'
            ? TAB_STRIP_CLASS
            : 'inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto no-scrollbar max-w-full',
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext)
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        variant === 'line'
          ? TAB_CLASS
          : 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

/**
 * The count shown in a tab ("Findings 12"). One look everywhere: a quiet pill
 * that follows the tab's own state. `tone="danger"` turns it red only while
 * the value is a positive number, the same rule as MetricStrip: a zero is good
 * news and stays neutral. Pass a string (e.g. "…") while loading; null/undefined
 * renders nothing.
 */
function TabsCount({
  value,
  tone = 'default',
  className,
}: {
  value: number | string | null | undefined
  tone?: 'default' | 'danger'
  className?: string
}) {
  if (value == null) return null
  const alarming = tone === 'danger' && typeof value === 'number' && value > 0
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium leading-none tabular-nums text-muted-foreground',
        alarming && 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsCount }

'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * Faceted filters for list pages (the left panel on Findings). Filters apply as
 * soon as they change — no Apply step — and each section shows how many of its
 * options are on, so a folded section still says it is filtering.
 *
 * Deliberately no per-option counts: counts that ignore the other active facets
 * mislead ("Critical 22" while the list shows 3), and the page's metric strip
 * already carries the overall numbers.
 */
export function FacetPanel({
  activeCount,
  onClearAll,
  children,
  className,
}: {
  activeCount: number
  onClearAll: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex h-9 items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearAll}
          disabled={activeCount === 0}
        >
          Clear all
        </Button>
      </div>
      <div className="divide-y border-y">{children}</div>
    </div>
  )
}

export function FacetSection({
  title,
  selectedCount = 0,
  defaultOpen = true,
  children,
}: {
  title: string
  selectedCount?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen || selectedCount > 0)
  const contentId = useId()
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center gap-2 py-2.5 text-start text-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none rtl:rotate-180',
            open && 'rotate-90 rtl:rotate-90'
          )}
        />
        <span className="flex-1">{title}</span>
        {selectedCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
            {selectedCount}
          </span>
        )}
      </button>
      <div
        id={contentId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-0.5 pb-3 ps-6">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** A labelled sub-group inside a section (e.g. source categories). */
export function FacetGroupLabel({
  children,
  onSelectAll,
}: {
  children: ReactNode
  onSelectAll?: () => void
}) {
  return (
    <div className="flex items-center justify-between pt-2 pb-0.5 first:pt-0">
      <span className="text-xs text-muted-foreground">{children}</span>
      {onSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Select all
        </button>
      )}
    </div>
  )
}

export function FacetOption({
  label,
  checked,
  onCheckedChange,
  adornment,
}: {
  label: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Leading visual (e.g. a severity dot). */
  adornment?: ReactNode
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      {adornment}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </label>
  )
}

export function FacetToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

'use client'

import * as React from 'react'
import { ListFilter, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * The one Filters trigger. Every filter panel, sheet or popover in the app opens
 * from this button, so its look is decided here and nowhere else: an icon-only
 * square (the same size as the toolbar's other icon buttons) with the
 * filter-lines icon, a tooltip, and the active-filter count on its corner.
 *
 * `src/features/shared/components/__tests__/filter-trigger-governance.test.ts`
 * fails the build if a page draws its own filter button.
 */

/** Visible count badge on the button's corner. */
const COUNT_BADGE_CLASS =
  'pointer-events-none absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium tabular-nums text-primary-foreground ring-2 ring-background'

/** Tint when at least one filter is applied (theme tokens: works in dark mode). */
const ACTIVE_CLASS =
  'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/50 dark:bg-primary/15 dark:hover:bg-primary/25'

export interface FilterButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'variant' | 'size' | 'asChild' | 'ref'
> {
  /** Number of filters currently applied; shows the badge and the active tint when > 0. */
  activeCount?: number
  /**
   * Set when the button toggles an inline panel: whether that panel is open.
   * The icon becomes "close panel" and the button reports `aria-pressed`.
   * Leave undefined when the button opens a sheet, popover or dialog.
   */
  panelOpen?: boolean
  /** Accessible name and tooltip. Defaults to "Filters". */
  label?: string
}

export const FilterButton = React.forwardRef<HTMLButtonElement, FilterButtonProps>(
  function FilterButton(
    { activeCount = 0, panelOpen, label = 'Filters', className, ...props },
    ref
  ) {
    const active = activeCount > 0
    const accessibleName = active ? `${label} (${activeCount} active)` : label
    const tooltip = panelOpen ? `Hide ${label.toLowerCase()}` : label
    const Icon = panelOpen ? PanelLeftClose : ListFilter

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            size="icon"
            aria-label={accessibleName}
            aria-pressed={panelOpen}
            data-slot="filter-button"
            data-active={active ? '' : undefined}
            className={cn('relative size-9 shrink-0', active && ACTIVE_CLASS, className)}
            {...props}
          >
            <Icon className="size-4" aria-hidden="true" />
            {active && (
              // The count is read out through the button's accessible name.
              <span data-slot="filter-count" aria-hidden="true" className={COUNT_BADGE_CLASS}>
                {activeCount > 99 ? '99+' : activeCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }
)

export interface FilterPanelToggleProps {
  /** Whether the inline (large-screen) panel is open. */
  open: boolean
  /** Toggle the inline panel (large screens). */
  onToggle: () => void
  /** Open the filter sheet (below `lg`, where there is no room for the panel). */
  onOpenSheet: () => void
  activeCount: number
  /** `id` of the inline panel this button controls. */
  controlsId: string
  label?: string
}

/**
 * The Findings filter layout's trigger pair: from `lg` up it toggles the
 * floating side panel, below `lg` it opens the same filters in a sheet. Use this
 * (or `DataTable`'s `filterToggle` prop, which renders it) for every list page
 * with a facet panel.
 */
export function FilterPanelToggle({
  open,
  onToggle,
  onOpenSheet,
  activeCount,
  controlsId,
  label,
}: FilterPanelToggleProps) {
  return (
    <>
      <FilterButton
        className="hidden lg:inline-flex"
        panelOpen={open}
        onClick={onToggle}
        aria-controls={controlsId}
        activeCount={activeCount}
        label={label}
      />
      <FilterButton
        className="lg:hidden"
        onClick={onOpenSheet}
        aria-haspopup="dialog"
        activeCount={activeCount}
        label={label}
      />
    </>
  )
}

'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

/**
 * The filter panel below `lg`, opened by `FilterPanelToggle`'s sheet button.
 * One markup for every list page (it was the Findings sheet): full width on a
 * phone, top padding that gives the sheet's close button its own row clear of
 * the panel's "Clear all", the facet list scrolling between it and a footer
 * that closes the sheet.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title,
  resultLabel = 'Show results',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible title, e.g. "Finding filters". */
  title: string
  /** Footer button text, e.g. "Show 12 findings". */
  resultLabel?: string
  /** A `FacetPanel`. */
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 p-0" data-slot="filter-sheet">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-14">{children}</div>
        <div className="border-t p-4">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            {resultLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

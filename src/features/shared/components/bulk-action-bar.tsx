'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Actions for the rows selected in a list, as a bar floating at the bottom of
 * the viewport. It appears over the content instead of being inserted above
 * the table, so selecting a row never shifts the list. Escape clears the
 * selection.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
  noun = 'selected',
}: {
  count: number
  onClear: () => void
  children: ReactNode
  /** Text after the count, e.g. "findings selected". */
  noun?: string
}) {
  useEffect(() => {
    if (count === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onClear])

  if (count === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Actions for selected rows"
        className="pointer-events-auto flex max-w-full animate-in items-center gap-1.5 overflow-x-auto rounded-xl border bg-popover p-1.5 ps-4 text-popover-foreground shadow-lg duration-200 fade-in-0 slide-in-from-bottom-2"
      >
        <span className="whitespace-nowrap text-sm font-medium tabular-nums">
          {count} {noun}
        </span>
        <span aria-hidden className="mx-1.5 h-5 w-px shrink-0 bg-border" />
        {children}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClear}
          aria-label="Clear selection"
          title="Clear selection (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StackedCellProps {
  /** Bold top line (name, title, id…). */
  primary: ReactNode
  /** Muted second line (count, subtitle, code…). Hidden when nullish/empty. */
  secondary?: ReactNode
  /** Clamp both lines to one row with ellipsis (for long titles in narrow columns). */
  truncate?: boolean
  className?: string
}

/**
 * Two-line table cell: a bold primary over a muted secondary. Replaces the
 * `<div><div className="font-medium">…</div><div className="text-xs
 * text-muted-foreground">…</div></div>` block hand-rolled across most tables.
 */
export function StackedCell({ primary, secondary, truncate, className }: StackedCellProps) {
  const hasSecondary = secondary !== null && secondary !== undefined && secondary !== ''
  return (
    <div className={cn('min-w-0', className)}>
      <div className={cn('font-medium', truncate && 'line-clamp-1')}>{primary}</div>
      {hasSecondary && (
        <div className={cn('text-xs text-muted-foreground', truncate && 'line-clamp-1')}>
          {secondary}
        </div>
      )}
    </div>
  )
}

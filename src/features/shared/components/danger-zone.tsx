'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DangerZoneProps {
  /** Defaults to "Danger zone". */
  title?: string
  /** Heading level for the page outline: h2 on a page, h3 inside a sheet. */
  as?: 'h2' | 'h3'
  children: ReactNode
  className?: string
}

/**
 * Destructive, hard-to-undo actions, kept apart at the bottom of a page or
 * sheet: a destructive-bordered block with one row per action
 * (DangerZoneItem). One look everywhere (settings, detail pages, sheets), in
 * theme tokens only. Pair the action with a destructive ConfirmDialog, and
 * typeToConfirm for the ones that cannot be undone at all.
 */
export function DangerZone({
  title = 'Danger zone',
  as: Heading = 'h2',
  children,
  className,
}: DangerZoneProps) {
  return (
    <section className={cn('@container rounded-xl border border-destructive/40', className)}>
      <div className="flex items-center gap-2 border-b border-destructive/20 px-4 py-3">
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
        <Heading className="text-sm font-semibold text-destructive">{title}</Heading>
      </div>
      <div className="divide-y divide-destructive/15">{children}</div>
    </section>
  )
}

interface DangerZoneItemProps {
  title: string
  description?: ReactNode
  /** The button(s). Usually one `variant="destructive"` or outline button. */
  action: ReactNode
}

/** One destructive action: what it does on the left, the button on the right (stacked when narrow). */
export function DangerZoneItem({ title, description, action }: DangerZoneItemProps) {
  return (
    <div className="flex flex-col gap-3 p-4 @md:flex-row @md:items-center @md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
    </div>
  )
}

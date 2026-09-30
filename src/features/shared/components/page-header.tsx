'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  /** String or rich node (e.g. inline stat chips) shown under the title. */
  description?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * The title block shrinks and wraps (`flex-1 min-w-0`); the actions keep their
 * size and wrap onto their own line when the row runs out. The title block used
 * to be `shrink-0`, so a long description held it at its one-line width and
 * pushed the actions past the edge of the page, where they were clipped.
 */
export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-3',
        className
      )}
    >
      {/* basis-60: on a phone the title and a couple of icon actions share a
          row; wider actions wrap onto their own line instead of squeezing. */}
      <div className="min-w-0 flex-1 basis-60">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {description && (
          <div className="mt-1 max-w-3xl text-sm text-muted-foreground text-pretty">
            {description}
          </div>
        )}
      </div>
      {children && (
        // Pages often wrap their buttons in their own <div className="flex gap-2">,
        // which does not wrap and pushed the last button off-screen on narrow
        // widths. Direct child groups wrap too, so the actions always fit.
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 [&>div]:max-w-full [&>div]:flex-wrap">
          {children}
        </div>
      )}
    </div>
  )
}

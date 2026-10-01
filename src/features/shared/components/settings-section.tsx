'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  /** Section heading, sentence case. */
  title: string
  /** One line under the heading. */
  description?: ReactNode
  /** Right-aligned actions on the heading row (e.g. a Save button). */
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Heading id, for aria-labelledby / in-page links. */
  id?: string
}

/**
 * A titled block on a settings page: `text-base font-semibold` heading
 * (style contract section 4), optional description and actions, then content.
 * Settings pages and the /settings overview use it instead of hand-rolling
 * heading rows, so every section reads the same.
 */
export function SettingsSection({
  title,
  description,
  actions,
  children,
  className,
  id,
}: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className={cn('space-y-3', className)}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

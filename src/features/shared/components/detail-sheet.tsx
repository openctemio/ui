/**
 * Detail sheet primitives — the one look for a `<Sheet side="right">` detail
 * view, taken from the Finding details drawer:
 *
 *   <SheetDetailToolbar title="Asset details" … />
 *   <DetailSheetHeader icon={Server} title={name} subtitle={…} status={…} badges={…} />
 *   <DetailSections>
 *     <DetailSection title="Description" icon={FileText}>…</DetailSection>
 *     <DetailSection title="Properties">
 *       <DetailFieldGrid>
 *         <DetailField label="Owner reference">team-a</DetailField>
 *       </DetailFieldGrid>
 *     </DetailSection>
 *   </DetailSections>
 *
 * Rules these encode (see docs/ui-style-contract.md): a neutral icon tile, no
 * per-type colour or gradient; sections are separated by dividers, never wrapped
 * in bordered cards; labels are sentence case, small and muted.
 */

'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type IconType = React.ElementType

// ============================================================================
// DetailSheetHeader
// ============================================================================

export interface DetailSheetHeaderProps {
  /** Icon shown in a neutral tile left of the title. */
  icon?: IconType
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-aligned next to the title, e.g. a status badge. */
  status?: React.ReactNode
  /** Row of badges under the title. */
  badges?: React.ReactNode
  /** Row of secondary buttons under the badges. */
  actions?: React.ReactNode
  className?: string
}

export function DetailSheetHeader({
  icon: Icon,
  title,
  subtitle,
  status,
  badges,
  actions,
  className,
}: DetailSheetHeaderProps) {
  return (
    <div className={cn('space-y-3 px-4 pt-2 pb-4 sm:px-6', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            data-slot="detail-sheet-icon"
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-snug font-semibold break-words">{title}</h2>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ============================================================================
// DetailSections — stacks sections with a divider between each
// ============================================================================

export function DetailSections({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-5 [&>*+*]:border-t [&>*+*]:pt-5', className)}
      {...props}
    />
  )
}

// ============================================================================
// DetailSection — heading (optional icon + count + actions) and its content
// ============================================================================

export interface DetailSectionProps {
  title: React.ReactNode
  icon?: IconType
  /** Shown as a small secondary badge after the heading. */
  count?: number
  /** Right-aligned controls in the heading row (edit, view all, …). */
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function DetailSection({
  title,
  icon: Icon,
  count,
  actions,
  children,
  className,
}: DetailSectionProps) {
  return (
    <section className={cn('min-w-0 space-y-3', className)}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {count}
            </Badge>
          )}
        </h3>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

// ============================================================================
// DetailFieldGrid / DetailField — label/value rows
// ============================================================================

export function DetailFieldGrid({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)} {...props} />
  )
}

export interface DetailFieldProps {
  /** Sentence case, e.g. "Owner reference". */
  label: React.ReactNode
  /** The value. Nothing renders when it is null, undefined or ''. */
  children?: React.ReactNode
  /** Span both columns (long text, IDs, lists). */
  full?: boolean
  className?: string
}

export function DetailField({ label, children, full, className }: DetailFieldProps) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className={cn('min-w-0 space-y-0.5', full && 'sm:col-span-2', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

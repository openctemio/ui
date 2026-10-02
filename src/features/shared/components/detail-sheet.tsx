/**
 * Detail sheet primitives — the one look for a `<Sheet side="right">` detail
 * view, taken from the Finding details drawer:
 *
 *   <SheetDetailToolbar title="Asset details" … />
 *   <DetailSheetHeader icon={Server} title={name} subtitle={…} status={…} badges={…} />
 *   <DetailCallout tone="warning" title="What is wrong" actions={…}>Why</DetailCallout>
 *   <DetailStatGrid>
 *     <DetailStat label="Jobs running" value={2} unit="/ 5" meter={…} />
 *   </DetailStatGrid>
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
  // The section is a landmark named by its heading.
  const headingId = React.useId()
  return (
    <section className={cn('min-w-0 space-y-3', className)} aria-labelledby={headingId}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-sm font-semibold">
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

// ============================================================================
// DetailStatGrid / DetailStat — the headline numbers of a detail view
// ============================================================================

/**
 * A row of compact numbers under a detail view's header: one bordered strip
 * split into cells (not a card per number), two per row on phones and one
 * row from `sm`. Give it 2–4 `DetailStat`s and leave out a number the data
 * does not have rather than showing a dash.
 */
export function DetailStatGrid({ className, children, ...props }: React.ComponentProps<'dl'>) {
  const count = React.Children.toArray(children).filter(Boolean).length
  if (count === 0) return null
  return (
    <dl
      data-slot="detail-stat-grid"
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border',
        'sm:grid-cols-[repeat(var(--detail-stat-cols),minmax(0,1fr))]',
        className
      )}
      style={{ '--detail-stat-cols': count } as React.CSSProperties}
      {...props}
    >
      {children}
    </dl>
  )
}

export type DetailStatTone = 'default' | 'success' | 'warning' | 'destructive'

const STAT_TONE: Record<DetailStatTone, string> = {
  default: '',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
}
const METER_TONE: Record<DetailStatTone, string> = {
  default: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

export interface DetailStatProps {
  /** Sentence case, short ("Jobs running"). */
  label: string
  /** The number or short value; rendered with tabular figures. */
  value: React.ReactNode
  /** Smaller text right after the value ("/ 5"). */
  unit?: React.ReactNode
  /** One short muted line under the value. */
  caption?: React.ReactNode
  /** A thin bar under the value (value / max), e.g. slots in use. */
  meter?: { value: number; max: number; label: string }
  /** Colour the value: only for a problem (style contract: never a zero). */
  tone?: DetailStatTone
  /** Hover text for the value (an exact time, the formula). */
  title?: string
  className?: string
}

export function DetailStat({
  label,
  value,
  unit,
  caption,
  meter,
  tone = 'default',
  title,
  className,
}: DetailStatProps) {
  const pct =
    meter && meter.max > 0 ? Math.min(100, Math.max(0, (meter.value / meter.max) * 100)) : 0
  return (
    <div className={cn('min-w-0 bg-card px-3 py-2.5', className)} data-slot="detail-stat">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-baseline gap-1" title={title}>
        <span
          className={cn(
            'truncate text-lg leading-tight font-semibold tracking-tight tabular-nums',
            STAT_TONE[tone]
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{unit}</span>
        )}
      </dd>
      {meter && (
        <dd className="mt-1.5">
          <div
            role="meter"
            aria-label={meter.label}
            aria-valuemin={0}
            aria-valuemax={meter.max}
            aria-valuenow={meter.value}
            className="h-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn('h-full rounded-full', METER_TONE[tone])}
              style={{ width: `${pct}%` }}
            />
          </div>
        </dd>
      )}
      {caption && (
        <dd className="mt-1 truncate text-xs text-muted-foreground tabular-nums">{caption}</dd>
      )}
    </div>
  )
}

// ============================================================================
// DetailCallout — "what is wrong" right under a detail view's header
// ============================================================================

export type DetailCalloutTone = 'info' | 'warning' | 'destructive'

const CALLOUT_TONE: Record<DetailCalloutTone, { box: string; icon: string }> = {
  info: { box: 'border-info/30 bg-info/10', icon: 'text-info' },
  warning: { box: 'border-warning/40 bg-warning/10', icon: 'text-warning' },
  destructive: { box: 'border-destructive/30 bg-destructive/10', icon: 'text-destructive' },
}

export interface DetailCalloutProps {
  tone: DetailCalloutTone
  icon?: IconType
  /** The problem in plain words ("Nuclei templates: refresh failed"). */
  title: React.ReactNode
  /** Why it matters / what it means, one or two short sentences. */
  children?: React.ReactNode
  /** Buttons that fix it or lead to more (size="sm", outline). */
  actions?: React.ReactNode
  /** Accessible name for the region (defaults to the title's text). */
  label?: string
  className?: string
}

/**
 * A tinted box that says what is wrong with the record, why, and what to do
 * about it — the first thing in the body when there is a problem, nothing
 * when there is none. Theme tokens only, so it reads in dark mode.
 */
export function DetailCallout({
  tone,
  icon: Icon,
  title,
  children,
  actions,
  label,
  className,
}: DetailCalloutProps) {
  const t = CALLOUT_TONE[tone]
  return (
    <section
      aria-label={label}
      data-slot="detail-callout"
      data-tone={tone}
      className={cn('rounded-lg border px-3 py-2.5', t.box, className)}
    >
      <div className="flex items-start gap-2.5">
        {Icon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.icon)} aria-hidden />}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-medium break-words">{title}</div>
          {children && <div className="text-sm break-words text-muted-foreground">{children}</div>}
          {actions && <div className="flex flex-wrap items-center gap-2 pt-1.5">{actions}</div>}
        </div>
      </div>
    </section>
  )
}

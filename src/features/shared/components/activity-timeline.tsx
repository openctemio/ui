'use client'

import type { ReactNode } from 'react'
import { History, Loader2, type LucideIcon } from 'lucide-react'
import type { Locale } from 'date-fns'
import { vi as viLocale } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/context/i18n-provider'
import { cn } from '@/lib/utils'

import { EmptyState } from './empty-state'
import { ErrorState } from './error-state'
import { RelativeTime } from './relative-time'

/**
 * A vertical activity timeline: one row per event with an icon, a sentence,
 * the relative time (absolute on hover), an optional detail line and a "×N"
 * badge for coalesced repeats. Optional filter chips (multi-select; none
 * selected means everything) and a "Load more" button for cursor pages.
 * The feature maps its own events to entries; this component only lays
 * them out, so every timeline in the app reads the same.
 */

export type ActivityTimelineTone = 'muted' | 'info' | 'success' | 'warning' | 'destructive'

export interface ActivityTimelineEntry {
  id: string
  /** ISO time of the event (the first one when coalesced). */
  at: string
  icon: LucideIcon
  tone?: ActivityTimelineTone
  title: ReactNode
  /** Secondary line(s) under the title. */
  detail?: ReactNode
  /** >1 shows a "×N" badge. */
  repeatCount?: number
  /** The last occurrence when coalesced. */
  lastAt?: string
}

export interface ActivityTimelineFilterOption {
  value: string
  label: string
  /** A chip that cannot be used (e.g. the viewer may not see that kind). */
  disabled?: boolean
  /** Shown on hover; say why a chip is disabled. */
  hint?: string
}

export interface ActivityTimelineProps {
  entries: ActivityTimelineEntry[]
  filters?: ActivityTimelineFilterOption[]
  selectedFilters?: string[]
  onSelectedFiltersChange?: (next: string[]) => void
  loading?: boolean
  error?: unknown
  /** What failed to load ("activity" reads "Failed to load activity"). */
  errorTitle?: string
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  emptyIcon?: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  /** A note above the list (e.g. what this viewer cannot see). */
  notice?: ReactNode
  /** `compact`: smaller icons and spacing, for a preview of the latest few. */
  density?: 'default' | 'compact'
  className?: string
}

const TONE_CLASS: Record<ActivityTimelineTone, string> = {
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
}

/** The date-fns locale for the app locale ("vi" -> Vietnamese, else English). */
export function dateFnsLocaleFor(locale: string | undefined): Locale | undefined {
  return (locale ?? '').split('-')[0] === 'vi' ? viLocale : undefined
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-hidden data-testid="activity-timeline-skeleton">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityTimeline({
  entries,
  filters,
  selectedFilters = [],
  onSelectedFiltersChange,
  loading,
  error,
  errorTitle = 'activity',
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  emptyIcon = History,
  emptyTitle,
  emptyDescription,
  notice,
  density = 'default',
  className,
}: ActivityTimelineProps) {
  const compact = density === 'compact'
  const { t, locale } = useTranslation()
  const dfLocale = dateFnsLocaleFor(locale)

  const toggle = (value: string) => {
    if (!onSelectedFiltersChange) return
    onSelectedFiltersChange(
      selectedFilters.includes(value)
        ? selectedFilters.filter((v) => v !== value)
        : [...selectedFilters, value]
    )
  }

  let body: ReactNode
  if (error && entries.length === 0) {
    body = <ErrorState title={errorTitle} error={error} onRetry={onRetry} />
  } else if (loading && entries.length === 0) {
    body = <TimelineSkeleton />
  } else if (entries.length === 0) {
    body =
      selectedFilters.length > 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={t('activity.emptyFiltered', 'Nothing of this kind yet')}
          description={t('activity.emptyFilteredHint', 'Clear the filters to see everything.')}
          card={false}
          className="py-10"
        />
      ) : (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          card={false}
        />
      )
  } else {
    body = (
      <>
        <ol className="space-y-0" aria-label={t('activity.listLabel', 'Activity')}>
          {entries.map((e, i) => {
            const Icon = e.icon
            const repeated = (e.repeatCount ?? 1) > 1
            const lastAt = e.lastAt ? new Date(e.lastAt) : null
            return (
              <li
                key={e.id}
                className={cn('relative flex last:pb-0', compact ? 'gap-2.5 pb-3' : 'gap-3 pb-4')}
                data-entry={e.id}
              >
                {i < entries.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute bottom-1 w-px bg-border',
                      compact ? 'start-3 top-7' : 'start-4 top-9'
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full',
                    compact ? 'size-6' : 'size-8',
                    TONE_CLASS[e.tone ?? 'muted']
                  )}
                >
                  <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </span>
                <div className={cn('min-w-0 flex-1', compact ? 'pt-0.5' : 'pt-1')}>
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        'min-w-0 text-sm break-words',
                        compact ? 'font-normal' : 'font-medium'
                      )}
                    >
                      {e.title}
                      {repeated && (
                        <span
                          className="ms-1.5 inline-flex items-center rounded border px-1.5 py-px align-middle text-[11px] font-medium text-muted-foreground tabular-nums"
                          title={
                            lastAt && !Number.isNaN(lastAt.getTime())
                              ? t('activity.repeatedLast', '{count} times, the last at {time}', {
                                  count: e.repeatCount ?? 1,
                                  time: lastAt.toLocaleString(locale),
                                })
                              : t('activity.repeated', '{count} times', {
                                  count: e.repeatCount ?? 1,
                                })
                          }
                        >
                          ×{e.repeatCount}
                        </span>
                      )}
                    </p>
                    <RelativeTime
                      date={e.lastAt && repeated ? e.lastAt : e.at}
                      locale={dfLocale}
                      className="shrink-0 pt-px text-xs whitespace-nowrap"
                    />
                  </div>
                  {e.detail && (
                    <div className="mt-0.5 text-xs break-words text-muted-foreground">
                      {e.detail}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {error ? (
          <div className="mt-4">
            <ErrorState title={errorTitle} error={error} onRetry={onRetry} />
          </div>
        ) : (
          hasMore &&
          onLoadMore && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('activity.loadMore', 'Load more')}
              </Button>
            </div>
          )
        )}
      </>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {filters && filters.length > 0 && (
        <div
          role="group"
          aria-label={t('activity.filterLabel', 'Filter activity')}
          className="flex flex-wrap gap-1.5"
        >
          {filters.map((f) => {
            const on = selectedFilters.includes(f.value)
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={on}
                disabled={f.disabled}
                title={f.hint}
                onClick={() => toggle(f.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      )}
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
      {body}
    </div>
  )
}

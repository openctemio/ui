'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard } from '@/features/shared/components/stats-card'
import { cn } from '@/lib/utils'
import { SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Skull,
  Shield,
} from 'lucide-react'
import type { EPSSStats, KEVStats } from '@/lib/api/threatintel-types'

/** Value colour for a problem count: red only while it is above zero. */
const alarm = (n: number) => (n > 0 ? 'text-destructive' : undefined)

function StatsGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface EPSSStatsCardsProps {
  stats: EPSSStats
  isLoading?: boolean
  className?: string
}

/** EPSS headline numbers, as the shared StatsCard grid. */
export function EPSSStatsCards({ stats, isLoading, className }: EPSSStatsCardsProps) {
  if (isLoading || !stats) return <StatsGridSkeleton className={className} />

  const critical = stats.critical_risk_count ?? 0
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatsCard
        title="CVEs tracked"
        value={(stats.total_scores ?? 0).toLocaleString()}
        icon={Activity}
      />
      <StatsCard
        title="Critical risk"
        value={critical.toLocaleString()}
        description="EPSS above 30%"
        icon={AlertOctagon}
        valueClassName={alarm(critical)}
      />
      <StatsCard
        title="High risk"
        value={(stats.high_risk_count ?? 0).toLocaleString()}
        description="EPSS above 10%"
        icon={AlertTriangle}
      />
      <StatsCard
        title="High-risk rate"
        value={
          stats.total_scores > 0
            ? `${((stats.high_risk_count / stats.total_scores) * 100).toFixed(2)}%`
            : 'N/A'
        }
        icon={TrendingUp}
      />
    </div>
  )
}

interface KEVStatsCardsProps {
  stats: KEVStats
  isLoading?: boolean
  className?: string
}

/** CISA KEV headline numbers, as the shared StatsCard grid. */
export function KEVStatsCards({ stats, isLoading, className }: KEVStatsCardsProps) {
  if (isLoading || !stats) return <StatsGridSkeleton className={className} />

  const pastDue = stats.past_due_count ?? 0
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatsCard
        title="KEV entries"
        value={(stats.total_entries ?? 0).toLocaleString()}
        icon={Shield}
      />
      <StatsCard
        title="Past due"
        value={pastDue.toLocaleString()}
        description="Remediation deadline passed"
        icon={AlertOctagon}
        valueClassName={alarm(pastDue)}
      />
      <StatsCard
        title="Added in the last 30 days"
        value={(stats.recently_added_last_30_days ?? 0).toLocaleString()}
        icon={Calendar}
      />
      <StatsCard
        title="Ransomware related"
        value={(stats.ransomware_related_count ?? 0).toLocaleString()}
        icon={Skull}
      />
    </div>
  )
}

interface ThreatIntelOverviewProps {
  epssStats: EPSSStats
  kevStats: KEVStats
  /** Kept for callers; the page header already shows sync freshness. */
  lastSyncAt?: string
  isLoading?: boolean
  className?: string
}

/**
 * The threat landscape: EPSS and CISA KEV headline numbers, then how each
 * breaks down. Flat — one card per number, section headings outside cards —
 * rather than stat cards nested inside section cards.
 */
export function ThreatIntelOverview({
  epssStats,
  kevStats,
  isLoading,
  className,
}: ThreatIntelOverviewProps) {
  return (
    <div className={cn('space-y-5', className)}>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">EPSS — exploit prediction</h2>
        <EPSSStatsCards stats={epssStats} isLoading={isLoading} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">CISA KEV — known exploited</h2>
        <KEVStatsCards stats={kevStats} isLoading={isLoading} />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EPSS risk distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <EPSSRiskDistribution stats={epssStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">KEV remediation status</CardTitle>
          </CardHeader>
          <CardContent>
            <KEVRemediationStatus stats={kevStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EPSSRiskDistribution({ stats }: { stats: EPSSStats }) {
  if (!stats) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const total = stats.total_scores || 1
  const lowRisk = total - (stats.high_risk_count ?? 0)
  // Bars take the severity scale's colours, the one shared source for them.
  const distribution = [
    {
      label: 'Critical (above 30%)',
      count: stats.critical_risk_count ?? 0,
      bar: SEVERITY_DOT_COLORS.critical,
    },
    { label: 'High (above 10%)', count: stats.high_risk_count ?? 0, bar: SEVERITY_DOT_COLORS.high },
    { label: 'Low (below 10%)', count: Math.max(0, lowRisk), bar: SEVERITY_DOT_COLORS.info },
  ]

  return (
    <div className="space-y-3">
      {distribution.map(({ label, count, bar }) => {
        const percentage = ((count / total) * 100).toFixed(1)
        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">
                {count.toLocaleString()} ({percentage}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', bar)}
                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KEVRemediationStatus({ stats }: { stats: KEVStats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-3 divide-x">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2 px-4 first:ps-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
    )
  }

  const total = stats.total_entries || 1
  const overdue = stats.past_due_count ?? 0
  const recentlyAdded = stats.recently_added_last_30_days ?? 0
  const onTrack = Math.max(0, total - overdue)

  const statuses = [
    { label: 'Past due', count: overdue, tone: alarm(overdue) },
    { label: 'New in 30 days', count: recentlyAdded, tone: undefined },
    { label: 'On track', count: onTrack, tone: undefined },
  ]

  return (
    <dl className="grid grid-cols-3 divide-x">
      {statuses.map(({ label, count, tone }) => (
        <div key={label} className="px-4 first:ps-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={cn('text-2xl font-semibold tabular-nums', tone)}>
            {count.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  )
}

'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useFindingTypeStats } from '@/features/exposures/hooks'
import {
  ChartCard,
  OverviewSkeleton,
  OVERVIEW_CHARTS_GRID,
  OVERVIEW_STATS_GRID,
  RankedBarList,
  SeverityDonut,
  SeverityTrend,
  humanize,
  TypeBreakdownUnavailable,
  ExposuresTabs,
  ViewFindingsButton,
} from '@/features/exposures/components'
import { useTenant } from '@/context/tenant-provider'
import type { FindingSource } from '@/lib/api/finding-types'
import { FileCode, AlertTriangle, Flame, GitBranch } from 'lucide-react'

const CODE_SOURCES: FindingSource[] = ['sast']

export default function CodeWeaknessesPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null
  // Org-wide context (repository coverage, asset mix, trend) has no per-type variant.
  const { stats, isLoading: dashboardLoading } = useDashboardStats(tenantId)
  // Type-scoped finding stats: code weaknesses come from static analysis.
  const { stats: typeStats, isLoading: typeLoading } = useFindingTypeStats(tenantId, CODE_SOURCES)
  const isLoading = dashboardLoading || typeLoading

  const criticalCount = typeStats.bySeverity.critical || 0
  const highCount = typeStats.bySeverity.high || 0

  // The dashboard stats only break assets down by type (there is no per-repository
  // finding count), so this is labelled as the asset mix it really is.
  const assetTypes = useMemo(
    () =>
      Object.entries(stats.assets.byType || {})
        .map(([type, count]) => ({ name: humanize(type), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [stats.assets.byType]
  )

  return (
    <Main>
      <PageHeader
        title="Code weaknesses"
        description="Weaknesses in your source code found by static analysis (SAST), by severity and over time."
      >
        <ViewFindingsButton stats={typeStats} sources={CODE_SOURCES} isLoading={typeLoading} />
      </PageHeader>

      <ExposuresTabs />

      <div className="mt-5">
        {isLoading ? (
          <OverviewSkeleton />
        ) : typeStats.total === 0 ? (
          <EmptyState
            icon={FileCode}
            title="No code weaknesses yet"
            description="Configure static analysis (SAST) scanners to detect security weaknesses in your code."
          />
        ) : !typeStats.scoped ? (
          <TypeBreakdownUnavailable
            icon={FileCode}
            total={typeStats.total}
            noun={['code finding', 'code findings']}
            sources={CODE_SOURCES}
          />
        ) : (
          <div className="space-y-5">
            <div className={OVERVIEW_STATS_GRID}>
              <StatsCard title="Total code findings" value={typeStats.total} icon={FileCode} />
              <StatsCard
                title="Critical"
                value={criticalCount}
                valueClassName={criticalCount > 0 ? 'text-destructive' : undefined}
                description={criticalCount > 0 ? 'Fix immediately' : 'No critical findings'}
                icon={AlertTriangle}
              />
              <StatsCard
                title="High"
                value={highCount}
                description={`${((highCount / typeStats.total) * 100).toFixed(0)}% of total`}
                icon={Flame}
              />
              <StatsCard
                title="Repositories with findings"
                value={stats.repositories.withFindings}
                description={
                  stats.repositories.total > 0
                    ? `of ${stats.repositories.total.toLocaleString()} repositories`
                    : undefined
                }
                icon={GitBranch}
              />
            </div>

            <div className={OVERVIEW_CHARTS_GRID}>
              <ChartCard
                title="Severity distribution"
                description={`${typeStats.total.toLocaleString()} code findings by severity`}
              >
                <SeverityDonut bySeverity={typeStats.bySeverity} />
              </ChartCard>
              <ChartCard
                title="Finding trend"
                description="Severity over time across all findings (a per-type trend is not available yet)"
              >
                <SeverityTrend
                  data={stats.findingTrend}
                  emptyDescription="Run SAST scans to start tracking trends."
                />
              </ChartCard>
            </div>

            <ChartCard
              title="Assets by type"
              description="Your asset mix across all findings (a per-repository breakdown is not available yet)"
            >
              <RankedBarList rows={assetTypes} unit={['asset', 'assets']} />
            </ChartCard>
          </div>
        )}
      </div>
    </Main>
  )
}

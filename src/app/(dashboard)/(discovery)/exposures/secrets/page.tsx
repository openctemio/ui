'use client'

import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState, formatRiskScore, getRiskLevel } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useFindingTypeStats } from '@/features/exposures/hooks'
import {
  ChartCard,
  OverviewSkeleton,
  OVERVIEW_CHARTS_GRID,
  OVERVIEW_STATS_GRID,
  SeverityDonut,
  SeverityShareList,
  StatusBars,
  TypeBreakdownUnavailable,
  ExposuresTabs,
  ViewFindingsButton,
} from '@/features/exposures/components'
import { useTenant } from '@/context/tenant-provider'
import type { FindingSource } from '@/lib/api/finding-types'
import { Lock, AlertTriangle, GitBranch, Shield } from 'lucide-react'

const SECRET_SOURCES: FindingSource[] = ['secret']

export default function SecretsExposurePage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null
  // Org-wide context (repository scan coverage) has no per-type variant.
  const { stats, isLoading: dashboardLoading } = useDashboardStats(tenantId)
  // Type-scoped finding stats: exposed secrets/credentials.
  const { stats: typeStats, isLoading: typeLoading } = useFindingTypeStats(tenantId, SECRET_SOURCES)
  const isLoading = dashboardLoading || typeLoading

  const criticalCount = typeStats.bySeverity.critical || 0
  const reposWithFindings = stats.repositories.withFindings

  return (
    <Main>
      <PageHeader
        title="Secrets"
        description="Secrets committed to your code (API keys, tokens, passwords), by severity and remediation status."
      >
        <ViewFindingsButton stats={typeStats} sources={SECRET_SOURCES} isLoading={typeLoading} />
      </PageHeader>

      <ExposuresTabs />

      <div className="mt-5">
        {isLoading ? (
          <OverviewSkeleton />
        ) : typeStats.total === 0 ? (
          <EmptyState
            icon={Lock}
            title="No secret exposures yet"
            description="Configure secret scanning to detect exposed credentials in your codebase."
          />
        ) : !typeStats.scoped ? (
          <TypeBreakdownUnavailable
            icon={Lock}
            total={typeStats.total}
            noun={['secret', 'secrets']}
            sources={SECRET_SOURCES}
          />
        ) : (
          <div className="space-y-5">
            <div className={OVERVIEW_STATS_GRID}>
              <StatsCard title="Total findings" value={typeStats.total} icon={Lock} />
              <StatsCard
                title="Repositories affected"
                value={reposWithFindings}
                description={
                  stats.repositories.total > 0
                    ? `${((reposWithFindings / stats.repositories.total) * 100).toFixed(0)}% of repositories`
                    : undefined
                }
                icon={GitBranch}
              />
              <StatsCard
                title="Critical secrets"
                value={criticalCount}
                valueClassName={criticalCount > 0 ? 'text-destructive' : undefined}
                description={criticalCount > 0 ? 'Rotate immediately' : 'No critical secrets'}
                icon={AlertTriangle}
              />
              <StatsCard
                title="Risk score"
                value={formatRiskScore(typeStats.riskScore)}
                description={`${getRiskLevel(typeStats.riskScore).label} risk`}
                icon={Shield}
              />
            </div>

            <div className={OVERVIEW_CHARTS_GRID}>
              <ChartCard
                title="Severity distribution"
                description={`${typeStats.total.toLocaleString()} secret findings by severity`}
              >
                <SeverityDonut bySeverity={typeStats.bySeverity} />
              </ChartCard>
              <ChartCard title="Status" description="Where each exposed secret is in remediation">
                <StatusBars byStatus={typeStats.byStatus} />
              </ChartCard>
            </div>

            <ChartCard
              title="Remediation priority"
              description="Secret exposures by severity, most urgent first"
            >
              <SeverityShareList
                bySeverity={typeStats.bySeverity}
                total={typeStats.total}
                noun={['secret', 'secrets']}
              />
            </ChartCard>
          </div>
        )}
      </div>
    </Main>
  )
}

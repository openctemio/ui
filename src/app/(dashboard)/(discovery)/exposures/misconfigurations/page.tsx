'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState, formatRiskScore, getRiskLevel } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useFindingTypeStats } from '@/features/exposures/hooks'
import {
  CATEGORY_CHART_COLORS,
  ChartCard,
  ChartEmpty,
  OverviewSkeleton,
  OVERVIEW_CHARTS_GRID,
  OVERVIEW_STATS_GRID,
  SeverityBars,
  SeverityShareList,
  humanize,
} from '@/features/exposures/components'
import { useTenant } from '@/context/tenant-provider'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from '@/components/charts'
import { Settings2, AlertTriangle, Server, Shield } from 'lucide-react'

export default function MisconfigurationsPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null
  // Org-wide context (asset coverage + asset-type mix) has no per-type variant.
  const { stats, isLoading: dashboardLoading } = useDashboardStats(tenantId)
  // Type-scoped finding stats: misconfigurations come from IaC scanning.
  const { stats: typeStats, isLoading: typeLoading } = useFindingTypeStats(tenantId, ['iac'])
  const isLoading = dashboardLoading || typeLoading

  const criticalCount = typeStats.bySeverity.critical || 0

  const assetTypeData = useMemo(
    () =>
      Object.entries(stats.assets.byType || {})
        .map(([type, count], index) => ({
          name: humanize(type),
          value: count,
          color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [stats.assets.byType]
  )

  return (
    <Main>
      <PageHeader
        title="Misconfigurations"
        description="Infrastructure and application misconfigurations found by IaC scanning, by severity."
      />

      <div className="mt-5">
        {isLoading ? (
          <OverviewSkeleton />
        ) : typeStats.total === 0 ? (
          <EmptyState
            icon={Settings2}
            title="No misconfigurations yet"
            description="Run configuration scans to identify infrastructure and application misconfigurations."
          />
        ) : (
          <div className="space-y-5">
            <div className={OVERVIEW_STATS_GRID}>
              <StatsCard title="Total findings" value={typeStats.total} icon={Settings2} />
              <StatsCard
                title="Critical misconfigurations"
                value={criticalCount}
                valueClassName={criticalCount > 0 ? 'text-destructive' : undefined}
                description={
                  criticalCount > 0 ? 'Immediate remediation needed' : 'No critical issues'
                }
                icon={AlertTriangle}
              />
              <StatsCard
                title="Asset coverage"
                value={stats.assets.total}
                description={`${Object.keys(stats.assets.byType).length} asset types monitored`}
                icon={Server}
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
                title="Findings by severity"
                description={`${typeStats.total.toLocaleString()} misconfigurations by severity`}
              >
                <SeverityBars bySeverity={typeStats.bySeverity} />
              </ChartCard>
              <ChartCard
                title="Assets by type"
                description={`Your asset mix across ${stats.assets.total.toLocaleString()} assets`}
              >
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assetTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {assetTypeData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty title="No asset type data yet" />
                )}
              </ChartCard>
            </div>

            <ChartCard
              title="Priority fixes"
              description="Misconfigurations by severity, most urgent first"
            >
              <SeverityShareList
                bySeverity={typeStats.bySeverity}
                total={typeStats.total}
                noun={['misconfiguration', 'misconfigurations']}
              />
            </ChartCard>
          </div>
        )}
      </div>
    </Main>
  )
}

'use client'

import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useFindingTypeStats } from '@/features/exposures/hooks'
import {
  ChartCard,
  OverviewSkeleton,
  OVERVIEW_CHARTS_GRID,
  OVERVIEW_STATS_GRID,
  SeverityDonut,
  SeverityTrend,
  StatusBars,
} from '@/features/exposures/components'
import { useTenant } from '@/context/tenant-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Bug, AlertTriangle, Clock, Shield, LayoutGrid, Database, ShieldAlert } from 'lucide-react'
import { ActiveCVEsTab, VulnerabilityCatalogTab } from '@/features/vulnerabilities'
import { usePermissions, Permission } from '@/lib/permissions'

// Vulnerability findings = every CVE/vuln source NOT owned by the specialised
// sibling pages (code=sast, misconfigurations=iac, secrets=secret). The four
// pages together partition all finding sources toward the parent aggregate.
const VULNERABILITY_SOURCES = ['sca', 'dast', 'manual', 'pentest', 'bug_bounty'] as const

const TABS = ['overview', 'active', 'catalog'] as const

function OverviewTab() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null
  // Org-wide finding trend has no per-type variant.
  const { stats, isLoading: dashboardLoading } = useDashboardStats(tenantId)
  const { stats: typeStats, isLoading: typeLoading } = useFindingTypeStats(tenantId, [
    ...VULNERABILITY_SOURCES,
  ])

  if (dashboardLoading || typeLoading) return <OverviewSkeleton />

  if (typeStats.total === 0)
    return (
      <EmptyState
        icon={Bug}
        title="No vulnerability data yet"
        description="Run vulnerability scans to discover exposures across your attack surface."
      />
    )

  const criticalCount = typeStats.bySeverity.critical || 0
  const highCount = typeStats.bySeverity.high || 0
  const openCount =
    (typeStats.byStatus['new'] || 0) +
    (typeStats.byStatus['triaged'] || 0) +
    (typeStats.byStatus['in_progress'] || 0)

  return (
    <div className="space-y-5">
      <div className={OVERVIEW_STATS_GRID}>
        <StatsCard title="Total vulnerabilities" value={typeStats.total} icon={Bug} />
        <StatsCard
          title="Critical"
          value={criticalCount}
          valueClassName={criticalCount > 0 ? 'text-destructive' : undefined}
          description={criticalCount > 0 ? 'Immediate action required' : 'No critical issues'}
          icon={AlertTriangle}
        />
        <StatsCard
          title="High"
          value={highCount}
          description={`${((highCount / typeStats.total) * 100).toFixed(0)}% of total`}
          icon={Shield}
        />
        <StatsCard
          title="Open"
          value={openCount}
          description={openCount > 0 ? 'Awaiting remediation' : 'None open'}
          icon={Clock}
        />
      </div>

      <div className={OVERVIEW_CHARTS_GRID}>
        <ChartCard
          title="Severity distribution"
          description={`${typeStats.total.toLocaleString()} vulnerabilities by severity`}
        >
          <SeverityDonut bySeverity={typeStats.bySeverity} />
        </ChartCard>
        <ChartCard title="Status" description="Where each vulnerability is in remediation">
          <StatusBars byStatus={typeStats.byStatus} />
        </ChartCard>
      </div>

      <ChartCard
        title="Finding trend"
        description="Severity over time across all findings (a per-type trend is not available yet)"
      >
        <SeverityTrend
          data={stats.findingTrend}
          height={350}
          emptyDescription="Run scans to start tracking vulnerability trends."
        />
      </ChartCard>
    </div>
  )
}

export default function VulnerabilitiesPage() {
  const { can } = usePermissions()
  const canReadCatalog = can(Permission.VulnerabilitiesRead)
  // Overview is the dashboard landing — visible to everyone with findings:read.
  // Active CVEs and CVE catalog are deeper exploration tabs to its right. The
  // tab lives in the URL so a view can be linked to.
  const [tabParam, setTab] = useUrlFilter('tab', 'overview')
  const tab =
    (TABS as readonly string[]).includes(tabParam) && (tabParam === 'overview' || canReadCatalog)
      ? tabParam
      : 'overview'

  return (
    <Main>
      <PageHeader
        title="Vulnerabilities"
        description="Vulnerability findings across your assets, the CVEs behind them, and the CVE catalog."
      />

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          {canReadCatalog && (
            <TabsTrigger value="active" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Active CVEs
            </TabsTrigger>
          )}
          {canReadCatalog && (
            <TabsTrigger value="catalog" className="gap-2">
              <Database className="h-4 w-4" />
              CVE catalog
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab />
        </TabsContent>

        {canReadCatalog && (
          <TabsContent value="active" className="mt-5">
            <ActiveCVEsTab />
          </TabsContent>
        )}

        {canReadCatalog && (
          <TabsContent value="catalog" className="mt-5">
            <VulnerabilityCatalogTab />
          </TabsContent>
        )}
      </Tabs>
    </Main>
  )
}

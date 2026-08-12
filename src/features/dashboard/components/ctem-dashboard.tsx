'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
import Link from 'next/link'
import { Plus, FileWarning, ListChecks, ArrowRight } from 'lucide-react'

import { useTenant } from '@/context/tenant-provider'
import { useDashboardStats } from '@/features/dashboard'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'
import {
  useRiskTrend,
  useExecutiveSummary,
  useThreatIntelStats,
  useExposureChains,
  useAttackPaths,
  useScanCoverage,
  useValidationCoverage,
  useCtemMaturityTrend,
} from '@/features/dashboard/hooks/use-ctem-dashboard'
import {
  ExposureHero,
  FixNextQueue,
  CtemLoop,
  PriorityOverTime,
  AttackPathsCard,
  ThreatIntelCard,
  CoverageHygiene,
  CtemMaturityCard,
} from '@/features/dashboard/components/ctem'
import { AnalystDetail } from '@/features/dashboard/components/analyst-detail'

/**
 * The CTEM action-first main dashboard. Self-contained: it fetches its own
 * story data and renders the exposure hero, fix-next queue, CTEM loop, priority
 * trend, attack paths, threat intel, coverage/hygiene, optional maturity, and
 * the retained analyst charts. Rendered as a sibling of ClassicDashboard behind
 * the dashboard view switcher.
 */
export function CtemDashboard({ headerSwitcher }: { headerSwitcher?: ReactNode }) {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null

  // CTEM story data
  const { data: trend, isLoading: trendLoading } = useRiskTrend(tenantId, 90)
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary(tenantId)
  const { data: threatIntel, isLoading: threatLoading } = useThreatIntelStats(tenantId)
  const { data: exposure, isLoading: exposureLoading } = useExposureChains(tenantId)
  const { data: attackPaths, isLoading: pathsLoading } = useAttackPaths(tenantId)
  const { data: scanCoverage, isLoading: scanLoading } = useScanCoverage(tenantId)
  const { data: validationCoverage, isLoading: validationLoading } = useValidationCoverage(tenantId)

  // Maturity is module-gated — skip the fetch entirely when disabled so it 403s nothing.
  const ctemCyclesEnabled = useModuleEnabled('ctem_cycles')
  const { data: maturity, isLoading: maturityLoading } = useCtemMaturityTrend(
    tenantId,
    ctemCyclesEnabled
  )

  // Retained analyst charts
  const { stats, isLoading: statsLoading } = useDashboardStats(tenantId)

  const chains = exposure?.chains ?? []
  const kevChainCount = chains.filter((c) => c.kev_count > 0).length

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Continuous threat exposure — what's exploitable now, and what to do about it."
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          {headerSwitcher}
          <Can permission={Permission.ScansWrite} mode="disable">
            <Button asChild size="sm">
              <Link href="/scans">
                <Plus className="me-2 h-4 w-4" />
                Run scan
              </Link>
            </Button>
          </Can>
        </div>
      </PageHeader>

      {/* Quick Actions (permission-gated) — slim strip so exposure leads */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Can
          permission={Permission.ScansWrite}
          mode="disable"
          disabledTooltip="You don't have permission to create scans"
        >
          <Button asChild size="sm">
            <Link href="/scans">
              <Plus className="me-2 h-4 w-4" />
              New Scan
            </Link>
          </Button>
        </Can>
        <Can
          permission={Permission.FindingsRead}
          mode="disable"
          disabledTooltip="You don't have permission to view findings"
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/findings">
              <FileWarning className="me-2 h-4 w-4" />
              View Findings
            </Link>
          </Button>
        </Can>
        <Can
          permission={Permission.RemediationRead}
          mode="disable"
          disabledTooltip="You don't have permission to view remediation tasks"
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/remediation">
              <ListChecks className="me-2 h-4 w-4" />
              Remediation Tasks
            </Link>
          </Button>
        </Can>
        <Can
          permission={Permission.ReportsRead}
          mode="disable"
          disabledTooltip="You don't have permission to generate reports"
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">
              <ArrowRight className="me-2 h-4 w-4" />
              Generate Report
            </Link>
          </Button>
        </Can>
      </div>

      {/* Row 1 — Active exposure hero + Fix next */}
      <section className="mb-6 grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <ExposureHero
          summary={summary}
          trend={trend}
          kevChainCount={kevChainCount}
          isLoading={summaryLoading || trendLoading}
        />
        <FixNextQueue
          chains={chains}
          topRisks={summary?.top_risks}
          isLoading={exposureLoading || summaryLoading}
        />
      </section>

      {/* Row 2 — CTEM loop */}
      <section className="mb-6">
        <CtemLoop
          summary={summary}
          scanCoverage={scanCoverage}
          validationCoverage={validationCoverage}
          threatIntel={threatIntel}
          isLoading={summaryLoading || scanLoading || validationLoading}
        />
      </section>

      {/* Row 3 — Priority over time + Attack paths */}
      <section className="mb-6 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <PriorityOverTime trend={trend} isLoading={trendLoading} />
        <AttackPathsCard
          attackPaths={attackPaths}
          chains={chains}
          isLoading={pathsLoading || exposureLoading}
        />
      </section>

      {/* Row 4 — Threat intel + coverage/hygiene (+ optional maturity) */}
      <section className="mb-6 grid items-start gap-4 lg:grid-cols-2">
        <ThreatIntelCard stats={threatIntel} isLoading={threatLoading} />
        <CoverageHygiene
          scan={scanCoverage}
          validation={validationCoverage}
          slaPct={summary?.sla_compliance_pct}
          isLoading={scanLoading || validationLoading || summaryLoading}
        />
      </section>

      {ctemCyclesEnabled && (
        <section className="mb-6">
          <CtemMaturityCard data={maturity} isLoading={maturityLoading} />
        </section>
      )}

      {/* Analyst detail — the retained charts */}
      <AnalystDetail stats={stats} isLoading={statsLoading} />
    </>
  )
}

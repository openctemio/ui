'use client'

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
export function CtemDashboard() {
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
      {/* Row 1 — Active exposure hero + Priority over time (matched-height charts) */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <ExposureHero
          summary={summary}
          trend={trend}
          kevChainCount={kevChainCount}
          isLoading={summaryLoading || trendLoading}
        />
        <PriorityOverTime trend={trend} isLoading={trendLoading} />
      </section>

      {/* Row 2 — CTEM loop */}
      <section className="mb-6">
        <CtemLoop
          summary={summary}
          scanCoverage={scanCoverage}
          validationCoverage={validationCoverage}
          threatIntel={threatIntel}
          isLoading={summaryLoading || scanLoading || validationLoading || threatLoading}
        />
      </section>

      {/* Row 3 — Fix next + Attack paths */}
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <FixNextQueue
          chains={chains}
          topRisks={summary?.top_risks}
          isLoading={exposureLoading || summaryLoading}
        />
        <AttackPathsCard
          attackPaths={attackPaths}
          chains={chains}
          isLoading={pathsLoading || exposureLoading}
        />
      </section>

      {/* Row 4 — Threat intel + coverage/hygiene (+ optional maturity) */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
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

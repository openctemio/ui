/**
 * CTEM dashboard data hooks.
 *
 * SWR hooks for the action-first main dashboard. Every key is tenant-scoped so
 * switching tenants can't leak a cached response (the URL alone is identical;
 * tenant scope rides the JWT). Each hook degrades gracefully — a 403/empty
 * response surfaces as `data: undefined` and the card renders its empty state.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'
import type { PriorityClass } from '@/features/findings/types/finding.types'

// ============================================
// TYPES
// ============================================

export interface RiskTrendPoint {
  date: string
  risk_score_avg: number
  findings_open: number
  sla_compliance_pct: number
  p0_open: number
  p1_open: number
  p2_open: number
  p3_open: number
}

export interface ExecTopRisk {
  title: string
  severity: string
  priority_class: string
  asset_name: string
  epss_score?: number
  is_in_kev: boolean
  // Optional deep-link targets. `finding_id` is being added by a sibling API PR;
  // treat both as OPTIONAL so the UI links only when present and still ships
  // safely against an API that hasn't deployed them yet.
  finding_id?: string
  asset_id?: string
}

export interface ExecutiveSummary {
  risk_score_current: number
  risk_score_change: number
  p0_open: number
  p0_resolved_period: number
  p1_open: number
  sla_compliance_pct: number
  sla_breached: number
  mttr_critical_hours: number
  crown_jewels_at_risk: number
  findings_total: number
  findings_resolved_period: number
  // Program Health reads these; older API builds may omit them, so keep optional
  // and let the consuming card fall back to "not yet measured" / 0.
  findings_new_period?: number
  regression_count?: number
  regression_rate_pct?: number
  top_risks: ExecTopRisk[]
}

export interface MttrAnalytics {
  by_severity: Record<string, number>
  by_priority_class: Record<PriorityClass, number>
  overall_hours: number
}

export interface DataQualityScorecard {
  asset_ownership_pct: number
  finding_evidence_pct: number
  median_last_seen_days: number
  deduplication_rate: number
  total_assets: number
  total_findings: number
}

export interface ThreatIntelStats {
  epss: {
    critical_risk_count: number
    [k: string]: number
  }
  kev: {
    total_entries: number
    past_due_count: number
    ransomware_related_count: number
    recently_added_last_30_days: number
  }
}

export interface ExposureChainHop {
  asset_id?: string
  name?: string
  asset_type?: string
  exposure?: string
}

export interface ExposureChain {
  entry_point_name: string
  target_name: string
  hops: ExposureChainHop[]
  kev_count: number
  score: number
  is_crown_jewel: boolean
  target_criticality?: string
}

export interface ExposureChainsResponse {
  summary?: Record<string, number>
  chains: ExposureChain[]
}

export interface AttackPathsResponse {
  summary: {
    reachable_assets: number
    critical_reachable: number
    crown_jewels_at_risk: number
  }
}

export interface ScanCoverage {
  coverage_percent: number
  never_scanned: number
  critical_uncovered: number
}

export interface ValidationCoverage {
  overall_pct: number
  validated: number
  total: number
}

export interface CtemMaturityBreakdown {
  score: number
  cycles_analyzed: number
  ctem_stage_coverage?: { covered_count: number }
}

export interface CtemMaturityTrend {
  cycles_analyzed: number
  maturity: CtemMaturityBreakdown
}

// ============================================
// CONFIG
// ============================================

const config: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
  // These are read-only overview panels — a failed fetch should render an empty
  // state, never retry-storm or toast.
  shouldRetryOnError: false,
}

/** Build a tenant-scoped SWR key that only fires when tenant + permission are ready. */
function useKey(url: string | null, tenantId: string | null): [string, string] | null {
  const { can } = usePermissions()
  const ready = !!tenantId && !!url && can(Permission.DashboardRead)
  return ready ? [url as string, tenantId as string] : null
}

// ============================================
// HOOKS
// ============================================

export function useRiskTrend(tenantId: string | null, days = 90) {
  return useSWR<RiskTrendPoint[]>(
    useKey(`/api/v1/dashboard/risk-trend?days=${days}`, tenantId),
    ([url]) => get<RiskTrendPoint[]>(url),
    config
  )
}

export function useExecutiveSummary(tenantId: string | null) {
  return useSWR<ExecutiveSummary>(
    useKey('/api/v1/dashboard/executive-summary', tenantId),
    ([url]) => get<ExecutiveSummary>(url),
    config
  )
}

export function useMttrAnalytics(tenantId: string | null) {
  return useSWR<MttrAnalytics>(
    useKey('/api/v1/dashboard/mttr-analytics', tenantId),
    ([url]) => get<MttrAnalytics>(url),
    config
  )
}

/** Data-quality scorecard (RFC-005 Gap 5) — owner coverage lives here. */
export function useDataQuality(tenantId: string | null) {
  return useSWR<DataQualityScorecard>(
    useKey('/api/v1/dashboard/data-quality', tenantId),
    ([url]) => get<DataQualityScorecard>(url),
    config
  )
}

export function useThreatIntelStats(tenantId: string | null) {
  return useSWR<ThreatIntelStats>(
    useKey('/api/v1/threat-intel/stats', tenantId),
    ([url]) => get<ThreatIntelStats>(url),
    config
  )
}

export function useExposureChains(tenantId: string | null) {
  return useSWR<ExposureChainsResponse>(
    useKey('/api/v1/attack-surface/exposure-chains', tenantId),
    ([url]) => get<ExposureChainsResponse>(url),
    config
  )
}

export function useAttackPaths(tenantId: string | null) {
  return useSWR<AttackPathsResponse>(
    useKey('/api/v1/attack-surface/attack-paths', tenantId),
    ([url]) => get<AttackPathsResponse>(url),
    config
  )
}

export function useScanCoverage(tenantId: string | null) {
  return useSWR<ScanCoverage>(
    useKey('/api/v1/scans/coverage', tenantId),
    ([url]) => get<ScanCoverage>(url),
    config
  )
}

export function useValidationCoverage(tenantId: string | null) {
  return useSWR<ValidationCoverage>(
    useKey('/api/v1/validation/coverage', tenantId),
    ([url]) => get<ValidationCoverage>(url),
    config
  )
}

/**
 * CTEM maturity trend — MODULE-GATED behind `ctem_cycles`. Pass `enabled=false`
 * (from `useModuleEnabled('ctem_cycles')`) to skip the fetch entirely so a
 * disabled tenant never hits the 403.
 */
export function useCtemMaturityTrend(tenantId: string | null, enabled: boolean) {
  return useSWR<CtemMaturityTrend>(
    useKey(enabled ? '/api/v1/ctem-cycles/metrics/trend' : null, tenantId),
    ([url]) => get<CtemMaturityTrend>(url),
    config
  )
}

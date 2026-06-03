'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { usePermissions, Permission } from '@/lib/permissions'

// Types matching backend response
interface AssetStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  risk_score: number
}

interface FindingStats {
  total: number
  by_severity: Record<string, number>
  by_status: Record<string, number>
  overdue: number
  average_cvss: number
}

interface RepositoryStats {
  total: number
  with_findings: number
}

interface ActivityItem {
  type: string
  title: string
  description: string
  timestamp: string
}

interface FindingTrendPoint {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

// Backend dashboard stats response
interface DashboardStatsResponse {
  assets: AssetStats
  findings: FindingStats
  repositories: RepositoryStats
  recent_activity: ActivityItem[]
  finding_trend: FindingTrendPoint[]
}

export interface FindingTrend {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

// Normalized dashboard stats (camelCase for frontend)
export interface DashboardStats {
  assets: {
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    riskScore: number
  }
  findings: {
    total: number
    bySeverity: Record<string, number>
    byStatus: Record<string, number>
    overdue: number
    averageCvss: number
  }
  repositories: {
    total: number
    withFindings: number
  }
  recentActivity: ActivityItem[]
  findingTrend: FindingTrend[]
}

// Transform backend response to frontend format
function transformStats(response: DashboardStatsResponse): DashboardStats {
  // Guard every section/field: a partial response (e.g. a disabled module
  // returning only some sections) must not crash consumers — notably
  // `averageCvss.toFixed(1)`, called on the dashboard and across insights
  // pages, which throws if averageCvss arrives null/undefined.
  return {
    assets: {
      total: response.assets?.total ?? 0,
      byType: response.assets?.by_type || {},
      byStatus: response.assets?.by_status || {},
      riskScore: response.assets?.risk_score ?? 0,
    },
    findings: {
      total: response.findings?.total ?? 0,
      bySeverity: response.findings?.by_severity || {},
      byStatus: response.findings?.by_status || {},
      overdue: response.findings?.overdue ?? 0,
      averageCvss: response.findings?.average_cvss ?? 0,
    },
    repositories: {
      total: response.repositories?.total ?? 0,
      withFindings: response.repositories?.with_findings ?? 0,
    },
    recentActivity: response.recent_activity || [],
    findingTrend: response.finding_trend || [],
  }
}

// Default empty stats for loading state
const emptyStats: DashboardStats = {
  assets: {
    total: 0,
    byType: {},
    byStatus: {},
    riskScore: 0,
  },
  findings: {
    total: 0,
    bySeverity: {},
    byStatus: {},
    overdue: 0,
    averageCvss: 0,
  },
  repositories: {
    total: 0,
    withFindings: 0,
  },
  recentActivity: [],
  findingTrend: [],
}

/**
 * Hook to fetch tenant-scoped dashboard statistics
 * @param tenantId - The tenant ID or slug
 */
export function useDashboardStats(tenantId: string | null) {
  const { can } = usePermissions()
  const canReadDashboard = can(Permission.DashboardRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && canReadDashboard

  const { data, error, isLoading, mutate } = useSWR<DashboardStatsResponse>(
    shouldFetch ? ['dashboard-stats', tenantId] : null,
    () => get<DashboardStatsResponse>(endpoints.dashboard.stats()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    stats: data ? transformStats(data) : emptyStats,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to get recent activity from dashboard stats
 * @param tenantId - The tenant ID or slug
 */
export function useRecentActivity(tenantId: string | null) {
  const { stats, isLoading, error } = useDashboardStats(tenantId)

  return {
    data: stats.recentActivity,
    isLoading,
    error,
  }
}

// ─── MTTR Metrics ───

interface MTTRMetrics {
  [severity: string]: number // hours
}

export function useMTTRMetrics(tenantId: string | null) {
  const { can } = usePermissions()
  const hasPerm = can(Permission.DashboardRead)

  // Tenant-aware SWR key prevents cross-tenant cache leak when user
  // switches tenants (URL alone is the same; tenant scope comes from JWT).
  return useSWR<MTTRMetrics>(
    tenantId && hasPerm ? (['/api/v1/dashboard/mttr', tenantId] as const) : null,
    ([url]) => get<MTTRMetrics>(url),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
}

// ─── Risk Velocity ───

export interface RiskVelocityPoint {
  week: string
  new_count: number
  resolved_count: number
  velocity: number // positive = losing ground
}

export function useRiskVelocity(tenantId: string | null, weeks = 12) {
  const { can } = usePermissions()
  const hasPerm = can(Permission.DashboardRead)

  // Tenant-aware SWR key — see useMTTRMetrics rationale.
  return useSWR<RiskVelocityPoint[]>(
    tenantId && hasPerm ? ([`/api/v1/dashboard/velocity?weeks=${weeks}`, tenantId] as const) : null,
    ([url]) => get<RiskVelocityPoint[]>(url),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
}

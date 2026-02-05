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

// Backend dashboard stats response
interface DashboardStatsResponse {
  assets: AssetStats
  findings: FindingStats
  repositories: RepositoryStats
  recent_activity: ActivityItem[]
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
}

// Transform backend response to frontend format
function transformStats(response: DashboardStatsResponse): DashboardStats {
  return {
    assets: {
      total: response.assets.total,
      byType: response.assets.by_type || {},
      byStatus: response.assets.by_status || {},
      riskScore: response.assets.risk_score,
    },
    findings: {
      total: response.findings.total,
      bySeverity: response.findings.by_severity || {},
      byStatus: response.findings.by_status || {},
      overdue: response.findings.overdue,
      averageCvss: response.findings.average_cvss,
    },
    repositories: {
      total: response.repositories.total,
      withFindings: response.repositories.with_findings,
    },
    recentActivity: response.recent_activity || [],
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

/**
 * Dynamic Sidebar Badges Hook
 *
 * Fetches real counts from API to replace hardcoded badge values in sidebar.
 * Uses optimized caching to minimize API calls.
 *
 * DISABLED BY DEFAULT: Set NEXT_PUBLIC_ENABLE_SIDEBAR_BADGES=true to enable.
 * When disabled, no API calls are made and empty badges are returned.
 */

'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import { useAssetGroupStatsApi } from '@/features/asset-groups/api'
import { useCredentialStatsApi } from '@/features/credentials/api'
import { usePermissions, Permission } from '@/lib/permissions'
import { env } from '@/lib/env'

// ============================================
// TYPES
// ============================================

export interface DynamicBadges {
    /** Map of URL path to badge value */
    [key: string]: string | undefined
}

interface DashboardStats {
    findings: {
        total: number
        by_severity: Record<string, number>
        by_status: Record<string, number>
        overdue: number
    }
    assets: {
        total: number
    }
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch dashboard stats for badge counts
 * Uses long cache since badge counts don't need real-time accuracy
 * Note: Tenant is extracted from JWT token by backend, not from URL
 * @param shouldFetch - Whether to fetch data (based on permissions)
 */
function useDashboardStatsForBadges(shouldFetch: boolean = true) {
    const { currentTenant } = useTenant()

    // Only fetch when we have a tenant AND user has permission
    const key = currentTenant?.id && shouldFetch ? '/api/v1/dashboard/stats' : null

    return useSWR<DashboardStats>(
        key,
        (url: string) => get<DashboardStats>(url),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // 60s cache - badges don't need real-time
            errorRetryCount: 1,
        }
    )
}

/**
 * Hook to get dynamic badge values for sidebar navigation.
 * Returns a map of URL path to badge count.
 * Only fetches data for features the user has permission to access.
 *
 * IMPORTANT: This feature is disabled by default to reduce API calls on page load.
 * Set NEXT_PUBLIC_ENABLE_SIDEBAR_BADGES=true to enable dynamic badges.
 *
 * @example
 * const badges = useDynamicBadges()
 * // badges = { '/asset-groups': '12', '/findings': '24', ... }
 */
export function useDynamicBadges(): DynamicBadges {
    // Check if sidebar badges feature is enabled
    const badgesEnabled = env.features.sidebarBadges

    // Check user permissions to determine which APIs to call
    const { can } = usePermissions()
    const canReadGroups = can(Permission.GroupsRead)
    const canReadFindings = can(Permission.FindingsRead)
    const canReadCredentials = can(Permission.CredentialsRead)
    const canReadDashboard = can(Permission.DashboardRead)

    // Fetch asset group stats - only if badges enabled AND user has permission
    const { data: assetGroupStats } = useAssetGroupStatsApi(
        badgesEnabled && canReadGroups ? {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        } : { isPaused: () => true } // Don't fetch if disabled or no permission
    )

    // Fetch dashboard stats for findings count - only if badges enabled AND user has permission
    const { data: dashboardStats } = useDashboardStatsForBadges(badgesEnabled && canReadDashboard && canReadFindings)

    // Fetch credential stats for credential leaks badge - only if badges enabled AND user has permission
    const { data: credentialStats } = useCredentialStatsApi(
        badgesEnabled && canReadCredentials ? {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        } : { isPaused: () => true } // Don't fetch if disabled or no permission
    )

    const badges = useMemo(() => {
        const result: DynamicBadges = {}

        // Asset Groups badge - show total count
        if (assetGroupStats?.total !== undefined && assetGroupStats.total > 0) {
            result['/asset-groups'] = String(assetGroupStats.total)
        }

        // Findings badge - show open findings count (exclude resolved/closed)
        if (dashboardStats?.findings) {
            const { by_status, total } = dashboardStats.findings
            // Calculate open findings (total - resolved - closed)
            const resolved = by_status?.resolved || 0
            const closed = by_status?.closed || 0
            const verified = by_status?.verified || 0
            const openCount = total - resolved - closed - verified

            if (openCount > 0) {
                result['/findings'] = String(openCount)
            }
        }

        // Credential Leaks badge - show active credential leak count
        if (credentialStats?.by_state) {
            const activeCount = credentialStats.by_state.active || 0
            if (activeCount > 0) {
                result['/credentials'] = String(activeCount)
            }
        }

        return result
    }, [assetGroupStats, dashboardStats, credentialStats])

    return badges
}

/**
 * Get badge value for a specific URL.
 * If dynamic badge exists, return it. Otherwise return static badge.
 */
export function getBadgeValue(
    badges: DynamicBadges,
    url: string,
    staticBadge?: string
): string | undefined {
    // Prefer dynamic badge if available
    if (badges[url] !== undefined) {
        return badges[url]
    }
    // Fall back to static badge
    return staticBadge
}

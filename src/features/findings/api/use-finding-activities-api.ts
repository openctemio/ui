/**
 * Finding Activity API Hooks
 *
 * SWR hooks for fetching finding activity/audit trail data from backend
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRInfinite, { type SWRInfiniteConfiguration } from 'swr/infinite'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type { Activity, ActivityType } from '../types'

// ============================================
// API TYPES
// ============================================

/**
 * API response for a single activity
 */
export interface ApiFindingActivity {
  id: string
  finding_id: string
  activity_type: string // maps to ActivityType
  actor_id?: string
  actor_type: string // user, system, scanner, integration, ai
  actor_name?: string
  actor_email?: string
  changes: Record<string, unknown>
  source?: string
  source_metadata?: Record<string, unknown>
  created_at: string
}

/**
 * Paginated API response for activities
 */
export interface ApiFindingActivityListResponse {
  data: ApiFindingActivity[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: false, // Activities are not critical - don't show toast
      logError: true,
    })
  },
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchActivities(url: string): Promise<ApiFindingActivityListResponse> {
  return get<ApiFindingActivityListResponse>(url)
}

// ============================================
// MAPPERS
// ============================================

/**
 * Map API activity type to frontend ActivityType
 */
function mapActivityType(apiType: string): ActivityType {
  // Map backend activity types to frontend types
  const typeMap: Record<string, ActivityType> = {
    created: 'created',
    status_changed: 'status_changed',
    severity_changed: 'severity_changed',
    resolved: 'status_changed', // resolved is a status change
    reopened: 'reopened',
    assigned: 'assigned',
    unassigned: 'unassigned',
    triage_updated: 'status_changed',
    false_positive_marked: 'false_positive_marked',
    duplicate_marked: 'duplicate_marked',
    comment_added: 'comment',
    comment_updated: 'comment',
    comment_deleted: 'comment',
    scan_detected: 'created',
    auto_resolved: 'status_changed',
    auto_reopened: 'reopened',
    linked: 'linked',
    unlinked: 'linked',
    sla_warning: 'status_changed',
    sla_breach: 'status_changed',
    ai_triage: 'ai_triage',
    ai_triage_requested: 'ai_triage_requested',
    ai_triage_failed: 'ai_triage_failed',
  }
  return typeMap[apiType] || 'status_changed'
}

/**
 * Map API activity to frontend Activity type
 */
function mapActivity(api: ApiFindingActivity): Activity {
  const actorType = api.actor_type
  const actor =
    actorType === 'system'
      ? ('system' as const)
      : actorType === 'ai'
        ? ('ai' as const)
        : {
            id: api.actor_id || 'unknown',
            name: api.actor_name || 'Unknown User',
            email: api.actor_email || '',
            role: 'analyst' as const,
          }

  // Extract values from changes JSONB
  const changes = api.changes || {}
  const previousValue = (changes.old_status as string) || (changes.old_severity as string)
  const newValue = (changes.new_status as string) || (changes.new_severity as string)
  const reason = changes.reason as string | undefined
  // For comments: use full content if available, fallback to preview for backward compatibility
  const content = (changes.content as string) || (changes.preview as string) || undefined

  // Extract assignment-related fields
  const assigneeName = changes.assignee_name as string | undefined
  const assigneeEmail = changes.assignee_email as string | undefined
  const assigneeId = changes.assignee_id as string | undefined
  const previousAssigneeName = changes.previous_assignee_name as string | undefined

  // Merge all changes + assignment data into metadata for UI consumption
  // This includes AI triage data (severity, risk_score, ai_recommendation, etc.)
  const metadata = {
    ...api.source_metadata,
    ...changes, // Include all changes data (for ai_triage and other activity types)
    assigneeName,
    assigneeEmail,
    assigneeId,
    previousAssigneeName,
  }

  return {
    id: api.id,
    type: mapActivityType(api.activity_type),
    actor,
    content,
    metadata,
    previousValue,
    newValue,
    reason,
    createdAt: api.created_at,
  }
}

// ============================================
// API HOOKS
// ============================================

interface ActivityFilters {
  page?: number
  pageSize?: number
  activityTypes?: string[]
}

/**
 * Fetch activities for a finding
 */
export function useFindingActivitiesApi(
  findingId: string | null,
  filters?: ActivityFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  // Build URL with filters
  let url = findingId ? `/api/v1/findings/${findingId}/activities` : null

  if (url && filters) {
    const params = new URLSearchParams()
    if (filters.page !== undefined) params.set('page', String(filters.page))
    if (filters.pageSize !== undefined) params.set('page_size', String(filters.pageSize))
    if (filters.activityTypes?.length) params.set('activity_types', filters.activityTypes.join(','))
    const queryString = params.toString()
    if (queryString) url = `${url}?${queryString}`
  }

  const key = currentTenant && url ? url : null

  const { data, error, isLoading, mutate } = useSWR<ApiFindingActivityListResponse>(
    key,
    fetchActivities,
    { ...defaultConfig, ...config }
  )

  // Map API response to frontend Activity type
  const activities: Activity[] = data?.data?.map(mapActivity) || []

  return {
    activities,
    total: data?.total || 0,
    page: data?.page || 0,
    pageSize: data?.page_size || 20,
    totalPages: data?.total_pages || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Get a single activity by ID
 */
export function useFindingActivityApi(
  findingId: string | null,
  activityId: string | null,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key =
    currentTenant && findingId && activityId
      ? `/api/v1/findings/${findingId}/activities/${activityId}`
      : null

  const { data, error, isLoading, mutate } = useSWR<ApiFindingActivity>(key, get, {
    ...defaultConfig,
    ...config,
  })

  const activity = data ? mapActivity(data) : null

  return {
    activity,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Infinite loading hook for activities with "Load More" support
 */
export function useFindingActivitiesInfinite(
  findingId: string | null,
  pageSize: number = 20,
  config?: SWRInfiniteConfiguration<ApiFindingActivityListResponse>
) {
  const { currentTenant } = useTenant()

  // Key function for SWR infinite
  const getKey = (pageIndex: number, previousPageData: ApiFindingActivityListResponse | null) => {
    // No more data
    if (previousPageData && previousPageData.data.length === 0) return null
    // Reached last page
    if (previousPageData && pageIndex >= previousPageData.total_pages) return null
    // Not ready
    if (!currentTenant || !findingId) return null

    // Return URL with page param (1-indexed for backend)
    return `/api/v1/findings/${findingId}/activities?page=${pageIndex + 1}&page_size=${pageSize}`
  }

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<ApiFindingActivityListResponse>(getKey, fetchActivities, {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      ...config,
    })

  // Flatten all pages into single activities array
  const activities: Activity[] = data
    ? data.flatMap((page) => page.data?.map(mapActivity) || [])
    : []

  // Calculate pagination state
  const totalFromFirstPage = data?.[0]?.total || 0
  const totalPagesFromFirstPage = data?.[0]?.total_pages || 0
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = data?.[0]?.data?.length === 0
  const isReachingEnd = isEmpty || (data && size >= totalPagesFromFirstPage)

  // Load more function
  const loadMore = () => {
    if (!isReachingEnd && !isLoadingMore) {
      setSize(size + 1)
    }
  }

  return {
    activities,
    total: totalFromFirstPage,
    totalPages: totalPagesFromFirstPage,
    isLoading,
    isLoadingMore: isLoadingMore && !isLoading,
    isValidating,
    isEmpty,
    isReachingEnd,
    loadMore,
    error,
    mutate,
  }
}

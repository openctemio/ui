'use client'

import useSWR from 'swr'
import { get, post, del } from '@/lib/api/client'
import { exposureEndpoints } from '@/lib/api/endpoints'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  ExposureEvent,
  ExposureListFilters,
  ExposureListResponse,
  CreateExposureRequest,
  BulkIngestExposuresRequest,
  BulkIngestExposuresResponse,
  ChangeExposureStateRequest,
  ExposureStateHistoryResponse,
  ExposureStats,
} from '@/lib/api/exposure-types'

/**
 * Hook to fetch paginated exposures list
 * Tenant is extracted from JWT token
 * Only fetches if user has findings:read permission (exposures are security findings)
 */
export function useExposures(tenantId: string | null, filters?: ExposureListFilters) {
  const { can } = usePermissions()
  const canReadFindings = can(Permission.FindingsRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && canReadFindings

  const { data, error, isLoading, mutate } = useSWR<ExposureListResponse>(
    shouldFetch ? ['exposures', tenantId, filters] : null,
    () => get<ExposureListResponse>(exposureEndpoints.list(filters)),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  return {
    exposures: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    totalPages: data?.total_pages || 0,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch a single exposure by ID
 * Only fetches if user has findings:read permission
 */
export function useExposure(tenantId: string | null, exposureId: string | null) {
  const { can } = usePermissions()
  const canReadFindings = can(Permission.FindingsRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && exposureId && canReadFindings

  const { data, error, isLoading, mutate } = useSWR<ExposureEvent>(
    shouldFetch ? ['exposure', tenantId, exposureId] : null,
    () => get<ExposureEvent>(exposureEndpoints.get(exposureId!)),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    exposure: data || null,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch exposure statistics
 * Only fetches if user has findings:read or dashboard:read permission
 */
export function useExposureStats(tenantId: string | null) {
  const { canAny } = usePermissions()
  const canReadStats = canAny(Permission.FindingsRead, Permission.DashboardRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && canReadStats

  const { data, error, isLoading, mutate } = useSWR<ExposureStats>(
    shouldFetch ? ['exposure-stats', tenantId] : null,
    () => get<ExposureStats>(exposureEndpoints.stats()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const emptyStats: ExposureStats = {
    total: 0,
    by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    by_state: { active: 0, resolved: 0, accepted: 0, false_positive: 0 },
    by_event_type: {},
    active_count: 0,
    resolved_count: 0,
  }

  return {
    stats: data || emptyStats,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch exposure state history
 * Only fetches if user has findings:read permission
 */
export function useExposureHistory(tenantId: string | null, exposureId: string | null) {
  const { can } = usePermissions()
  const canReadFindings = can(Permission.FindingsRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && exposureId && canReadFindings

  const { data, error, isLoading, mutate } = useSWR<ExposureStateHistoryResponse>(
    shouldFetch ? ['exposure-history', tenantId, exposureId] : null,
    () => get<ExposureStateHistoryResponse>(exposureEndpoints.history(exposureId!)),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    history: data?.items || [],
    total: data?.total || 0,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Create a new exposure event
 */
export async function createExposure(input: CreateExposureRequest): Promise<ExposureEvent> {
  return post<ExposureEvent>(exposureEndpoints.create(), input)
}

/**
 * Bulk ingest exposures
 */
export async function bulkIngestExposures(
  input: BulkIngestExposuresRequest
): Promise<BulkIngestExposuresResponse> {
  return post<BulkIngestExposuresResponse>(exposureEndpoints.bulkIngest(), input)
}

/**
 * Delete an exposure event
 */
export async function deleteExposure(exposureId: string): Promise<void> {
  await del(exposureEndpoints.delete(exposureId))
}

/**
 * Resolve an exposure (mark as fixed)
 */
export async function resolveExposure(
  exposureId: string,
  input?: ChangeExposureStateRequest
): Promise<ExposureEvent> {
  return post<ExposureEvent>(exposureEndpoints.resolve(exposureId), input || {})
}

/**
 * Accept an exposure (acknowledge risk)
 */
export async function acceptExposure(
  exposureId: string,
  input?: ChangeExposureStateRequest
): Promise<ExposureEvent> {
  return post<ExposureEvent>(exposureEndpoints.accept(exposureId), input || {})
}

/**
 * Mark exposure as false positive
 */
export async function markExposureFalsePositive(
  exposureId: string,
  input?: ChangeExposureStateRequest
): Promise<ExposureEvent> {
  return post<ExposureEvent>(exposureEndpoints.markFalsePositive(exposureId), input || {})
}

/**
 * Reactivate a resolved/accepted exposure
 */
export async function reactivateExposure(exposureId: string): Promise<ExposureEvent> {
  return post<ExposureEvent>(exposureEndpoints.reactivate(exposureId), {})
}

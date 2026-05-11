'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import type { Vulnerability, VulnerabilityListFilters, VulnerabilityListResponse } from '../types'

const VULNERABILITIES_BASE = '/api/v1/vulnerabilities'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, { showToast: true, logError: true })
  },
}

function buildListEndpoint(filters?: VulnerabilityListFilters): string {
  if (!filters) return VULNERABILITIES_BASE

  const params = new URLSearchParams()

  if (filters.cve_ids?.length) params.set('cve_ids', filters.cve_ids.join(','))
  if (filters.severities?.length) params.set('severities', filters.severities.join(','))
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))
  if (filters.min_cvss !== undefined) params.set('min_cvss', String(filters.min_cvss))
  if (filters.max_cvss !== undefined) params.set('max_cvss', String(filters.max_cvss))
  if (filters.min_epss !== undefined) params.set('min_epss', String(filters.min_epss))
  if (filters.exploit_available !== undefined) {
    params.set('exploit_available', String(filters.exploit_available))
  }
  if (filters.cisa_kev_only !== undefined) {
    params.set('cisa_kev_only', String(filters.cisa_kev_only))
  }
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))

  const qs = params.toString()
  return qs ? `${VULNERABILITIES_BASE}?${qs}` : VULNERABILITIES_BASE
}

async function fetchList(url: string): Promise<VulnerabilityListResponse> {
  return get<VulnerabilityListResponse>(url)
}

async function fetchOne(url: string): Promise<Vulnerability> {
  return get<Vulnerability>(url)
}

/**
 * Fetch the global CVE catalog. Not tenant-scoped.
 */
export function useVulnerabilities(filters?: VulnerabilityListFilters, config?: SWRConfiguration) {
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const key = canRead ? buildListEndpoint(filters) : null

  return useSWR<VulnerabilityListResponse>(key, fetchList, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single vulnerability by its internal UUID.
 */
export function useVulnerability(id: string | null, config?: SWRConfiguration) {
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const key = canRead && id ? `${VULNERABILITIES_BASE}/${id}` : null

  return useSWR<Vulnerability>(key, fetchOne, { ...defaultConfig, ...config })
}

/**
 * Fetch a single vulnerability by CVE ID (e.g. "CVE-2024-1234").
 */
export function useVulnerabilityByCVE(cveId: string | null, config?: SWRConfiguration) {
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const key = canRead && cveId ? `${VULNERABILITIES_BASE}/cve/${cveId}` : null

  return useSWR<Vulnerability>(key, fetchOne, { ...defaultConfig, ...config })
}

// =============================================================================
// Active CVEs — distinct CVEs currently impacting the tenant
// (different from the global CVE catalog at GET /vulnerabilities)
// =============================================================================

export interface ActiveCVE {
  vulnerability_id: string
  cve_id: string
  title: string
  severity: string
  cvss_score?: number | null
  epss_score?: number | null
  in_cisa_kev: boolean
  exploit_maturity?: string
  exploit_available: boolean
  fixed_versions: string[]
  published_at?: string | null

  affected_assets_count: number
  affected_components_count: number
  total_finding_count: number
  open_finding_count: number
  worst_finding_status: string
  first_detected_at: string
  last_seen_at: string
}

export interface ActiveCVEsResponse {
  data: ActiveCVE[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** Aggregate stats for the Active CVEs view (header card row). */
export interface ActiveCVEStats {
  total: number
  by_severity: Record<string, number> // critical, high, medium, low, info
  kev_count: number
  exploit_available_count: number
}

/**
 * Aggregate counts for the Active CVEs page header (severity breakdown,
 * KEV, exploit-available). Backed by GET /api/v1/vulnerabilities/active/stats.
 */
export function useActiveCVEStats(includeResolved?: boolean, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const params = new URLSearchParams()
  if (includeResolved) params.set('include_resolved', 'true')
  const qs = params.toString()

  const url =
    canRead && currentTenant ? `${VULNERABILITIES_BASE}/active/stats${qs ? `?${qs}` : ''}` : null
  const key = url && currentTenant ? ([url, currentTenant.id] as const) : null

  return useSWR<ActiveCVEStats>(key, ([url]) => get<ActiveCVEStats>(url), {
    ...defaultConfig,
    ...config,
  })
}

export interface ActiveCVEsFilters {
  includeResolved?: boolean
  severities?: string[]
  kevOnly?: boolean
  minCvss?: number
  minEpss?: number
  exploitAvailable?: boolean
  page?: number
  perPage?: number
}

/**
 * List the CVEs currently impacting assets in the current tenant.
 * Backed by GET /api/v1/vulnerabilities/active.
 *
 * SWR cache key includes tenant.id to prevent cross-tenant cache leaks.
 */
export function useActiveCVEs(filters?: ActiveCVEsFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const params = new URLSearchParams()
  if (filters?.includeResolved) params.set('include_resolved', 'true')
  if (filters?.severities?.length) params.set('severities', filters.severities.join(','))
  if (filters?.kevOnly) params.set('kev_only', 'true')
  if (filters?.minCvss !== undefined) params.set('min_cvss', String(filters.minCvss))
  if (filters?.minEpss !== undefined) params.set('min_epss', String(filters.minEpss))
  if (filters?.exploitAvailable !== undefined) {
    params.set('exploit_available', String(filters.exploitAvailable))
  }
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.perPage) params.set('per_page', String(filters.perPage))
  const qs = params.toString()

  const url =
    canRead && currentTenant ? `${VULNERABILITIES_BASE}/active${qs ? `?${qs}` : ''}` : null
  const key = url && currentTenant ? ([url, currentTenant.id] as const) : null

  return useSWR<ActiveCVEsResponse>(key, ([url]) => get<ActiveCVEsResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}

// =============================================================================
// Affected assets reverse lookup (blast-radius)
// =============================================================================

export interface VulnerabilityAffectedAsset {
  asset_id: string
  asset_name: string
  asset_type: string
  criticality: string
  asset_status: string
  exposure: string
  risk_score: number
  is_internet_accessible: boolean

  finding_count: number
  open_finding_count: number
  highest_severity: string
  worst_sla_status?: string
  first_detected_at: string
  last_seen_at: string
  sample_finding_id: string
  sample_finding_status: string
}

export interface AffectedAssetsResponse {
  data: VulnerabilityAffectedAsset[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * List the assets in the current tenant affected by a CVE
 * (blast-radius reverse lookup). Backed by
 * GET /api/v1/vulnerabilities/{id}/affected-assets.
 *
 * Pass `null` for vulnId to skip fetching (e.g. sheet not yet on this tab).
 *
 * SWR cache key includes tenant.id to prevent cross-tenant cache leaks
 * (vulnerability IDs are global so the URL alone would collide).
 */
export function useAffectedAssets(
  vulnId: string | null,
  options?: { includeResolved?: boolean; page?: number; perPage?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canRead = can(Permission.VulnerabilitiesRead)

  const params = new URLSearchParams()
  if (options?.includeResolved) params.set('include_resolved', 'true')
  if (options?.page) params.set('page', String(options.page))
  if (options?.perPage) params.set('per_page', String(options.perPage))
  const qs = params.toString()

  const url =
    canRead && vulnId && currentTenant
      ? `${VULNERABILITIES_BASE}/${vulnId}/affected-assets${qs ? `?${qs}` : ''}`
      : null
  const key = url && currentTenant ? ([url, currentTenant.id] as const) : null

  return useSWR<AffectedAssetsResponse>(key, ([url]) => get<AffectedAssetsResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}

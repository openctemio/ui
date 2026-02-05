/**
 * Security Platform API Hooks
 *
 * SWR-based hooks for fetching and mutating security platform data
 * Use these hooks in components to fetch data from the backend API
 */

import useSWR, { type SWRConfiguration, type KeyedMutator } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, patch, del } from './client'
import {
  securityEndpoints,
  type AssetFilters,
  type FindingFilters,
  type ComponentFilters,
  type ScanFilters,
  type PaginationParams,
} from './security-endpoints'

// ============================================
// COMMON TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UseQueryResult<T> {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  mutate: KeyedMutator<T>
}

// Default SWR configuration for security hooks
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

const fetcher = <T>(url: string) => get<T>(url)

// ============================================
// ASSET HOOKS
// ============================================

/**
 * Fetch list of assets
 */
export function useAssets(filters?: AssetFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.assets.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch assets by type (domains, websites, etc.)
 */
export function useAssetsByType(type: string, filters?: AssetFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.assets.listByType(type, filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch single asset by ID
 */
export function useAsset(assetId: string | null, config?: SWRConfiguration) {
  const endpoint = assetId ? securityEndpoints.assets.get(assetId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch asset statistics
 */
export function useAssetStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.assets.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch asset relationships
 */
export function useAssetRelationships(assetId: string | null, config?: SWRConfiguration) {
  const endpoint = assetId ? securityEndpoints.assets.relationships(assetId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Create asset mutation
 */
export function useCreateAsset() {
  return useSWRMutation(
    securityEndpoints.assets.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

/**
 * Update asset mutation
 */
export function useUpdateAsset(assetId: string) {
  return useSWRMutation(
    securityEndpoints.assets.update(assetId),
    (url, { arg }: { arg: unknown }) => put(url, arg)
  )
}

/**
 * Delete asset mutation
 */
export function useDeleteAsset(assetId: string) {
  return useSWRMutation(
    securityEndpoints.assets.delete(assetId),
    (url) => del(url)
  )
}

// ============================================
// ASSET GROUP HOOKS
// ============================================

export function useAssetGroups(filters?: PaginationParams, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.assetGroups.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useAssetGroup(groupId: string | null, config?: SWRConfiguration) {
  const endpoint = groupId ? securityEndpoints.assetGroups.get(groupId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useAssetGroupStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.assetGroups.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCreateAssetGroup() {
  return useSWRMutation(
    securityEndpoints.assetGroups.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useUpdateAssetGroup(groupId: string) {
  return useSWRMutation(
    securityEndpoints.assetGroups.update(groupId),
    (url, { arg }: { arg: unknown }) => put(url, arg)
  )
}

export function useDeleteAssetGroup(groupId: string) {
  return useSWRMutation(
    securityEndpoints.assetGroups.delete(groupId),
    (url) => del(url)
  )
}

// ============================================
// COMPONENT (SBOM) HOOKS
// ============================================

export function useComponents(filters?: ComponentFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.components.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useComponent(componentId: string | null, config?: SWRConfiguration) {
  const endpoint = componentId ? securityEndpoints.components.get(componentId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useVulnerableComponents(filters?: ComponentFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.components.vulnerable(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useComponentsByEcosystem(
  ecosystem: string,
  filters?: ComponentFilters,
  config?: SWRConfiguration
) {
  const endpoint = securityEndpoints.components.byEcosystem(ecosystem, filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useComponentStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.components.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useEcosystemStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.components.ecosystemStats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useLicenseStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.components.licenseStats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// FINDING HOOKS
// ============================================

export function useFindings(filters?: FindingFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.findings.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useFinding(findingId: string | null, config?: SWRConfiguration) {
  const endpoint = findingId ? securityEndpoints.findings.get(findingId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useFindingStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.findings.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useFindingsBySeverity(
  severity: string,
  filters?: FindingFilters,
  config?: SWRConfiguration
) {
  const endpoint = securityEndpoints.findings.bySeverity(severity, filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCreateFinding() {
  return useSWRMutation(
    securityEndpoints.findings.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useUpdateFinding(findingId: string) {
  return useSWRMutation(
    securityEndpoints.findings.update(findingId),
    (url, { arg }: { arg: unknown }) => put(url, arg)
  )
}

export function useUpdateFindingStatus(findingId: string) {
  return useSWRMutation(
    securityEndpoints.findings.updateStatus(findingId),
    (url, { arg }: { arg: { status: string } }) => patch(url, arg)
  )
}

export function useAssignFinding(findingId: string) {
  return useSWRMutation(
    securityEndpoints.findings.assign(findingId),
    (url, { arg }: { arg: { assigneeId: string } }) => patch(url, arg)
  )
}

// ============================================
// SCAN HOOKS
// ============================================

export function useScans(filters?: ScanFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.scans.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useScan(scanId: string | null, config?: SWRConfiguration) {
  const endpoint = scanId ? securityEndpoints.scans.get(scanId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useScanStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.scans.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useScanResults(scanId: string | null, config?: SWRConfiguration) {
  const endpoint = scanId ? securityEndpoints.scans.results(scanId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useStartScan() {
  return useSWRMutation(
    securityEndpoints.scans.start(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useStopScan(scanId: string) {
  return useSWRMutation(
    securityEndpoints.scans.stop(scanId),
    (url) => post(url)
  )
}

// ============================================
// RUNNER HOOKS
// ============================================

export function useRunners(filters?: PaginationParams, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.runners.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useRunner(runnerId: string | null, config?: SWRConfiguration) {
  const endpoint = runnerId ? securityEndpoints.runners.get(runnerId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useRunnerStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.runners.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCreateRunner() {
  return useSWRMutation(
    securityEndpoints.runners.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useDeleteRunner(runnerId: string) {
  return useSWRMutation(
    securityEndpoints.runners.delete(runnerId),
    (url) => del(url)
  )
}

// ============================================
// CREDENTIAL LEAK HOOKS
// ============================================

export function useCredentialLeaks(
  filters?: PaginationParams & { source?: string; status?: string },
  config?: SWRConfiguration
) {
  const endpoint = securityEndpoints.credentials.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCredentialLeak(credentialId: string | null, config?: SWRConfiguration) {
  const endpoint = credentialId ? securityEndpoints.credentials.get(credentialId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCredentialStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.credentials.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// REMEDIATION HOOKS
// ============================================

export function useRemediationTasks(
  filters?: PaginationParams & { status?: string; priority?: string; assignee?: string },
  config?: SWRConfiguration
) {
  const endpoint = securityEndpoints.remediation.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useRemediationTask(taskId: string | null, config?: SWRConfiguration) {
  const endpoint = taskId ? securityEndpoints.remediation.get(taskId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useRemediationStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.remediation.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useOverdueTasks(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.remediation.overdue()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function usePriorityTasks(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.remediation.priority()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCreateRemediationTask() {
  return useSWRMutation(
    securityEndpoints.remediation.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useUpdateRemediationTask(taskId: string) {
  return useSWRMutation(
    securityEndpoints.remediation.update(taskId),
    (url, { arg }: { arg: unknown }) => put(url, arg)
  )
}

// ============================================
// PENTEST HOOKS
// ============================================

// Campaigns
export function usePentestCampaigns(filters?: PaginationParams, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.campaigns.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function usePentestCampaign(campaignId: string | null, config?: SWRConfiguration) {
  const endpoint = campaignId ? securityEndpoints.pentest.campaigns.get(campaignId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function usePentestCampaignStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.campaigns.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// Pentest Findings
export function usePentestFindings(filters?: FindingFilters, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.findings.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function usePentestFindingStats(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.findings.stats()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// Retests
export function usePentestRetests(filters?: PaginationParams, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.retests.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// Reports
export function usePentestReports(filters?: PaginationParams, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.reports.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// Templates
export function usePentestTemplates(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.pentest.templates.list()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// ANALYTICS HOOKS
// ============================================

export function useDashboardAnalytics(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.analytics.dashboard()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    refreshInterval: 60000, // Refresh every minute
    ...config,
  })
}

export function useRiskTrend(period?: string, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.analytics.riskTrend(period)
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useFindingTrend(period?: string, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.analytics.findingTrend(period)
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCoverageAnalytics(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.analytics.coverage()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useMTTRAnalytics(period?: string, config?: SWRConfiguration) {
  const endpoint = securityEndpoints.analytics.mttr(period)
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// REPORT HOOKS
// ============================================

export function useReports(
  filters?: PaginationParams & { type?: string },
  config?: SWRConfiguration
) {
  const endpoint = securityEndpoints.reports.list(filters)
  return useSWR<PaginatedResponse<unknown>>(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useReport(reportId: string | null, config?: SWRConfiguration) {
  const endpoint = reportId ? securityEndpoints.reports.get(reportId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useGenerateReport() {
  return useSWRMutation(
    securityEndpoints.reports.generate(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

// ============================================
// INTEGRATION HOOKS
// ============================================

export function useIntegrations(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.integrations.list()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useIntegration(integrationId: string | null, config?: SWRConfiguration) {
  const endpoint = integrationId ? securityEndpoints.integrations.get(integrationId) : null
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useIntegrationTypes(config?: SWRConfiguration) {
  const endpoint = securityEndpoints.integrations.types()
  return useSWR(endpoint, fetcher, {
    ...defaultConfig,
    ...config,
  })
}

export function useCreateIntegration() {
  return useSWRMutation(
    securityEndpoints.integrations.create(),
    (url, { arg }: { arg: unknown }) => post(url, arg)
  )
}

export function useTestIntegration(integrationId: string) {
  return useSWRMutation(
    securityEndpoints.integrations.test(integrationId),
    (url) => post(url)
  )
}

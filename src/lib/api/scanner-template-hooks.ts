/**
 * Scanner Template API Hooks
 *
 * SWR hooks for Custom Scanner Template Management
 * Supports Nuclei (YAML), Semgrep (YAML), and Gitleaks (TOML) templates
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { scannerTemplateEndpoints } from './endpoints'
import type {
  CreateScannerTemplateRequest,
  ScannerTemplate,
  ScannerTemplateListFilters,
  ScannerTemplateListResponse,
  TemplateUsageResponse,
  TemplateValidationResult,
  UpdateScannerTemplateRequest,
  ValidateScannerTemplateRequest,
} from './scanner-template-types'

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors like 403, 404, etc.)
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
      showToast: true,
      logError: true,
    })
  },
}

// ============================================
// CACHE KEYS
// ============================================

export const scannerTemplateKeys = {
  all: ['scanner-templates'] as const,
  lists: () => [...scannerTemplateKeys.all, 'list'] as const,
  list: (filters?: ScannerTemplateListFilters) =>
    [...scannerTemplateKeys.lists(), filters] as const,
  details: () => [...scannerTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...scannerTemplateKeys.details(), id] as const,
  usage: () => [...scannerTemplateKeys.all, 'usage'] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchScannerTemplates(url: string): Promise<ScannerTemplateListResponse> {
  return get<ScannerTemplateListResponse>(url)
}

async function fetchScannerTemplate(url: string): Promise<ScannerTemplate> {
  return get<ScannerTemplate>(url)
}

async function fetchTemplateUsage(url: string): Promise<TemplateUsageResponse> {
  return get<TemplateUsageResponse>(url)
}

// ============================================
// SCANNER TEMPLATE HOOKS
// ============================================

/**
 * Fetch scanner templates list with optional filters
 */
export function useScannerTemplates(
  filters?: ScannerTemplateListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scannerTemplateEndpoints.list(filters) : null

  return useSWR<ScannerTemplateListResponse>(key, fetchScannerTemplates, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single scanner template by ID
 */
export function useScannerTemplate(
  templateId: string | null,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key =
    currentTenant && templateId ? scannerTemplateEndpoints.get(templateId) : null

  return useSWR<ScannerTemplate>(key, fetchScannerTemplate, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch template usage and quota information
 */
export function useTemplateUsage(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scannerTemplateEndpoints.usage() : null

  return useSWR<TemplateUsageResponse>(key, fetchTemplateUsage, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new scanner template
 */
export function useCreateScannerTemplate() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scannerTemplateEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateScannerTemplateRequest }) => {
      return post<ScannerTemplate>(url, arg)
    }
  )
}

/**
 * Update a scanner template
 */
export function useUpdateScannerTemplate(templateId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && templateId
      ? scannerTemplateEndpoints.update(templateId)
      : null,
    async (url: string, { arg }: { arg: UpdateScannerTemplateRequest }) => {
      return put<ScannerTemplate>(url, arg)
    }
  )
}

/**
 * Delete a scanner template
 */
export function useDeleteScannerTemplate(templateId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && templateId
      ? scannerTemplateEndpoints.delete(templateId)
      : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Validate template content before upload
 */
export function useValidateScannerTemplate() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scannerTemplateEndpoints.validate() : null,
    async (url: string, { arg }: { arg: ValidateScannerTemplateRequest }) => {
      return post<TemplateValidationResult>(url, arg)
    }
  )
}

/**
 * Deprecate a scanner template
 */
export function useDeprecateScannerTemplate(templateId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && templateId
      ? scannerTemplateEndpoints.deprecate(templateId)
      : null,
    async (url: string) => {
      return post<ScannerTemplate>(url, {})
    }
  )
}

/**
 * Download template content
 * Note: Uses fetch directly for blob response
 */
export function useDownloadScannerTemplate(templateId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && templateId
      ? scannerTemplateEndpoints.download(templateId)
      : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to download template')
      }
      return response.blob()
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate scanner templates cache
 */
export async function invalidateScannerTemplatesCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) =>
      typeof key === 'string' && key.includes('/api/v1/scanner-templates'),
    undefined,
    { revalidate: true }
  )
}

/**
 * Asset Groups Hooks
 *
 * Wrapper hooks that provide data from API or mock data based on configuration.
 * This allows easy switching between mock and real API during development.
 */

'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { env } from '@/lib/env'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useAssetGroupsApi,
  useAssetGroupApi,
  useGroupAssetsApi,
  useGroupFindingsApi,
  useAssetGroupStatsApi,
  useCreateAssetGroupApi,
  useUpdateAssetGroupApi,
  useDeleteAssetGroupApi,
  useAddAssetsToGroupApi,
  useRemoveAssetsFromGroupApi,
  useBulkUpdateAssetGroupsApi,
  useBulkDeleteAssetGroupsApi,
  invalidateAssetGroupsCache,
  invalidateAssetGroupCache,
} from '../api'
import {
  mockAssetGroups,
  getAssetGroupById,
  getAssetsByGroupId,
  getFindingsByGroupId,
  getAssetGroupStats as getMockStats,
} from '../lib/mock-data'
import {
  transformApiAssetGroup,
  transformApiAssetGroups,
  transformApiGroupAssets,
  transformApiGroupFindings,
  transformCreateAssetGroupInput,
  transformUpdateAssetGroupInput,
} from '../lib/transformers'
import type { AssetGroup, CreateAssetGroupInput, UpdateAssetGroupInput } from '../types'
import type { AssetGroupApiFilters, GroupAssetsApiFilters } from '../api'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Use real API by default, unless explicitly disabled via environment variable
 * Set NEXT_PUBLIC_USE_REAL_API=false to use mock data (for development without backend)
 */
const USE_REAL_API = env.features.useRealApi

// ============================================
// LIST HOOK
// ============================================

interface UseAssetGroupsOptions {
  filters?: AssetGroupApiFilters
  enabled?: boolean
}

interface UseAssetGroupsReturn {
  data: AssetGroup[]
  total: number
  isLoading: boolean
  isError: boolean
  error: Error | null
  mutate: () => void
}

/**
 * Hook for fetching asset groups list
 * Uses real API when enabled, falls back to mock data
 */
export function useAssetGroups(options: UseAssetGroupsOptions = {}): UseAssetGroupsReturn {
  const { filters, enabled = true } = options

  // API call (only if USE_REAL_API is true)
  const apiResult = useAssetGroupsApi(USE_REAL_API && enabled ? filters : undefined, {
    revalidateOnFocus: false,
  })

  // Transform API data or use mock data
  const result = useMemo(() => {
    if (USE_REAL_API && enabled) {
      return {
        data: apiResult.data ? transformApiAssetGroups(apiResult.data.data) : [],
        total: apiResult.data?.total ?? 0,
        isLoading: apiResult.isLoading,
        isError: !!apiResult.error,
        error: apiResult.error ?? null,
        mutate: apiResult.mutate,
      }
    }

    // Use mock data
    let data = [...mockAssetGroups]

    // Apply filters to mock data
    if (filters) {
      if (filters.environments?.length) {
        data = data.filter((g) => filters.environments!.includes(g.environment))
      }
      if (filters.criticalities?.length) {
        data = data.filter((g) => filters.criticalities!.includes(g.criticality))
      }
      if (filters.business_unit) {
        data = data.filter((g) =>
          g.businessUnit?.toLowerCase().includes(filters.business_unit!.toLowerCase())
        )
      }
      if (filters.has_findings === true) {
        data = data.filter((g) => g.findingCount > 0)
      } else if (filters.has_findings === false) {
        data = data.filter((g) => g.findingCount === 0)
      }
      if (filters.min_risk_score !== undefined) {
        data = data.filter((g) => g.riskScore >= filters.min_risk_score!)
      }
      if (filters.max_risk_score !== undefined) {
        data = data.filter((g) => g.riskScore <= filters.max_risk_score!)
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        data = data.filter(
          (g) =>
            g.name.toLowerCase().includes(search) || g.description?.toLowerCase().includes(search)
        )
      }
      if (filters.tags?.length) {
        data = data.filter((g) => g.tags?.some((tag) => filters.tags!.includes(tag)))
      }
    }

    return {
      data,
      total: data.length,
      isLoading: false,
      isError: false,
      error: null,
      mutate: () => {},
    }
  }, [apiResult.data, apiResult.isLoading, apiResult.error, apiResult.mutate, filters, enabled])

  return result
}

// ============================================
// SINGLE GROUP HOOK
// ============================================

interface UseAssetGroupReturn {
  data: AssetGroup | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  mutate: () => void
}

/**
 * Hook for fetching a single asset group
 */
export function useAssetGroup(groupId: string | null): UseAssetGroupReturn {
  const apiResult = useAssetGroupApi(USE_REAL_API ? groupId : null)

  const result = useMemo(() => {
    if (USE_REAL_API) {
      return {
        data: apiResult.data ? transformApiAssetGroup(apiResult.data) : null,
        isLoading: apiResult.isLoading,
        isError: !!apiResult.error,
        error: apiResult.error ?? null,
        mutate: apiResult.mutate,
      }
    }

    // Use mock data
    const mockData = groupId ? getAssetGroupById(groupId) : null
    return {
      data: mockData ?? null,
      isLoading: false,
      isError: false,
      error: null,
      mutate: () => {},
    }
  }, [apiResult.data, apiResult.isLoading, apiResult.error, apiResult.mutate, groupId])

  return result
}

// ============================================
// GROUP ASSETS HOOK
// ============================================

interface UseGroupAssetsReturn {
  data: ReturnType<typeof getAssetsByGroupId>
  total: number
  isLoading: boolean
  isError: boolean
  mutate: () => void
}

export function useGroupAssets(
  groupId: string | null,
  filters?: GroupAssetsApiFilters
): UseGroupAssetsReturn {
  const apiResult = useGroupAssetsApi(USE_REAL_API ? groupId : null, filters)

  const result = useMemo(() => {
    if (USE_REAL_API) {
      return {
        data: apiResult.data ? transformApiGroupAssets(apiResult.data.data) : [],
        total: apiResult.data?.total ?? 0,
        isLoading: apiResult.isLoading,
        isError: !!apiResult.error,
        mutate: apiResult.mutate,
      }
    }

    // Use mock data
    const mockData = groupId ? getAssetsByGroupId(groupId) : []
    return {
      data: mockData,
      total: mockData.length,
      isLoading: false,
      isError: false,
      mutate: () => {},
    }
  }, [apiResult.data, apiResult.isLoading, apiResult.error, apiResult.mutate, groupId])

  return result
}

// ============================================
// GROUP FINDINGS HOOK
// ============================================

interface UseGroupFindingsReturn {
  data: ReturnType<typeof getFindingsByGroupId>
  total: number
  isLoading: boolean
  isError: boolean
  mutate: () => void
}

export function useGroupFindings(
  groupId: string | null,
  page?: number,
  perPage?: number
): UseGroupFindingsReturn {
  const apiResult = useGroupFindingsApi(USE_REAL_API ? groupId : null, page, perPage)

  const result = useMemo(() => {
    if (USE_REAL_API) {
      return {
        data: apiResult.data ? transformApiGroupFindings(apiResult.data.data) : [],
        total: apiResult.data?.total ?? 0,
        isLoading: apiResult.isLoading,
        isError: !!apiResult.error,
        mutate: apiResult.mutate,
      }
    }

    // Use mock data
    const mockData = groupId ? getFindingsByGroupId(groupId) : []
    return {
      data: mockData,
      total: mockData.length,
      isLoading: false,
      isError: false,
      mutate: () => {},
    }
  }, [apiResult.data, apiResult.isLoading, apiResult.error, apiResult.mutate, groupId])

  return result
}

// ============================================
// STATS HOOK
// ============================================

interface UseAssetGroupStatsReturn {
  data: ReturnType<typeof getMockStats>
  isLoading: boolean
  isError: boolean
  mutate: () => void
}

export function useAssetGroupStats(): UseAssetGroupStatsReturn {
  const apiResult = useAssetGroupStatsApi()

  const result = useMemo(() => {
    if (USE_REAL_API) {
      // Transform API stats to match mock data format
      const apiStats = apiResult.data
      return {
        data: apiStats
          ? {
              total: apiStats.total,
              byEnvironment: apiStats.by_environment,
              byCriticality: apiStats.by_criticality,
              totalAssets: apiStats.total_assets,
              totalFindings: apiStats.total_findings,
              averageRiskScore: apiStats.average_risk_score,
            }
          : getMockStats(),
        isLoading: apiResult.isLoading,
        isError: !!apiResult.error,
        mutate: apiResult.mutate,
      }
    }

    // Use mock data
    return {
      data: getMockStats(),
      isLoading: false,
      isError: false,
      mutate: () => {},
    }
  }, [apiResult.data, apiResult.isLoading, apiResult.error, apiResult.mutate])

  return result
}

// ============================================
// MUTATION HOOKS
// ============================================

interface MutationResult<T = void> {
  trigger: (arg?: T) => Promise<void>
  isMutating: boolean
}

/**
 * Hook for creating an asset group
 */
export function useCreateAssetGroup(): MutationResult<CreateAssetGroupInput> {
  const apiMutation = useCreateAssetGroupApi()

  const trigger = async (input?: CreateAssetGroupInput) => {
    if (!input) return

    if (USE_REAL_API) {
      try {
        const apiInput = transformCreateAssetGroupInput(input)
        await apiMutation.trigger(apiInput)
        await invalidateAssetGroupsCache()
        toast.success('Asset group created', {
          description: input.name,
        })
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to create asset group'))
        throw error
      }
    } else {
      // Mock: just show toast
      const totalAssets = (input.existingAssetIds?.length || 0) + (input.newAssets?.length || 0)
      toast.success('Asset group created', {
        description: `${input.name}${totalAssets > 0 ? ` with ${totalAssets} assets` : ''}`,
      })
    }
  }

  return {
    trigger,
    isMutating: apiMutation.isMutating,
  }
}

/**
 * Hook for updating an asset group
 */
export function useUpdateAssetGroup(groupId: string): MutationResult<UpdateAssetGroupInput> {
  const apiMutation = useUpdateAssetGroupApi(groupId)

  const trigger = async (input?: UpdateAssetGroupInput) => {
    if (!input) return

    if (USE_REAL_API) {
      try {
        const apiInput = transformUpdateAssetGroupInput(input)
        await apiMutation.trigger(apiInput)
        await invalidateAssetGroupCache(groupId)
        await invalidateAssetGroupsCache()
        toast.success('Asset group updated')
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update asset group'))
        throw error
      }
    } else {
      // Mock: just show toast
      toast.success('Asset group updated')
    }
  }

  return {
    trigger,
    isMutating: apiMutation.isMutating,
  }
}

/**
 * Hook for deleting an asset group
 */
export function useDeleteAssetGroup(groupId: string): MutationResult {
  const apiMutation = useDeleteAssetGroupApi(groupId)

  const trigger = async () => {
    if (USE_REAL_API) {
      try {
        await apiMutation.trigger()
        await invalidateAssetGroupsCache()
        toast.success('Asset group deleted')
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to delete asset group'))
        throw error
      }
    } else {
      // Mock: just show toast
      toast.success('Asset group deleted')
    }
  }

  return {
    trigger,
    isMutating: apiMutation.isMutating,
  }
}

/**
 * Hook for removing assets from a group
 */
export function useRemoveAssetsFromGroup(groupId: string): MutationResult<string[]> {
  const apiMutation = useRemoveAssetsFromGroupApi(groupId)

  const trigger = async (assetIds?: string[]) => {
    if (!assetIds || assetIds.length === 0) return

    if (USE_REAL_API) {
      try {
        await apiMutation.trigger({ asset_ids: assetIds })
        // Invalidate both group and groups list cache to refresh counts
        await invalidateAssetGroupCache(groupId)
        await invalidateAssetGroupsCache()
        toast.success(`Removed ${assetIds.length} assets from group`)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to remove assets'))
        throw error
      }
    } else {
      // Mock: just show toast
      toast.success(`Removed ${assetIds.length} assets from group`)
    }
  }

  return {
    trigger,
    isMutating: apiMutation.isMutating,
  }
}

/**
 * Hook for adding assets to a group
 */
export function useAddAssetsToGroup(groupId: string): MutationResult<string[]> {
  const apiMutation = useAddAssetsToGroupApi(groupId)

  const trigger = async (assetIds?: string[]) => {
    if (!assetIds || assetIds.length === 0) return

    if (USE_REAL_API) {
      try {
        await apiMutation.trigger({ asset_ids: assetIds })
        // Invalidate cache to refresh counts
        await invalidateAssetGroupCache(groupId)
        await invalidateAssetGroupsCache()
        toast.success(`Added ${assetIds.length} assets to group`)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to add assets'))
        throw error
      }
    } else {
      // Mock: just show toast
      toast.success(`Added ${assetIds.length} assets to group`)
    }
  }

  return {
    trigger,
    isMutating: apiMutation.isMutating,
  }
}

/**
 * Hook for bulk operations
 */
export function useBulkAssetGroupOperations() {
  const bulkUpdateMutation = useBulkUpdateAssetGroupsApi()
  const bulkDeleteMutation = useBulkDeleteAssetGroupsApi()

  const bulkUpdate = async (
    groupIds: string[],
    update: { environment?: string; criticality?: string }
  ) => {
    if (USE_REAL_API) {
      try {
        await bulkUpdateMutation.trigger({
          group_ids: groupIds,
          update: {
            environment: update.environment as
              | 'production'
              | 'staging'
              | 'development'
              | 'testing'
              | undefined,
            criticality: update.criticality as 'critical' | 'high' | 'medium' | 'low' | undefined,
          },
        })
        await invalidateAssetGroupsCache()
        toast.success(`Updated ${groupIds.length} groups`)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update groups'))
        throw error
      }
    } else {
      // Mock
      toast.success(`Updated ${groupIds.length} groups`)
    }
  }

  const bulkDelete = async (groupIds: string[]) => {
    if (USE_REAL_API) {
      try {
        await bulkDeleteMutation.trigger({ group_ids: groupIds })
        await invalidateAssetGroupsCache()
        toast.success(`Deleted ${groupIds.length} groups`)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to delete groups'))
        throw error
      }
    } else {
      // Mock
      toast.success(`Deleted ${groupIds.length} groups`)
    }
  }

  return {
    bulkUpdate,
    bulkDelete,
    isMutating: bulkUpdateMutation.isMutating || bulkDeleteMutation.isMutating,
  }
}

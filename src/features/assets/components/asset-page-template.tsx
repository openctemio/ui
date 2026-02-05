'use client'

import { useCallback } from 'react'
import { Header, Main } from '@/components/layout'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PageHeader } from '@/features/shared'
import { AssetsDataTable, type AssetColumnConfig } from './assets-data-table'
import {
  useAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  type AssetSearchFilters,
} from '../hooks'
import type { Asset, AssetType, CreateAssetInput, UpdateAssetInput } from '../types'
import { ColumnDef } from '@tanstack/react-table'
import { Package, type LucideIcon } from 'lucide-react'

export interface AssetPageTemplateProps {
  // Page metadata
  pageTitle: string
  pageDescription: string

  // Asset type configuration
  assetType: AssetType
  assetTypeName: string
  assetTypeIcon?: LucideIcon

  // Column configuration
  columnConfig?: AssetColumnConfig
  customColumns?: ColumnDef<Asset>[]

  // Optional features
  showStats?: boolean
  showSearch?: boolean
  showAddButton?: boolean
  showExportButton?: boolean
  showBulkActions?: boolean

  // Additional filters (applied to API call)
  additionalFilters?: Partial<AssetSearchFilters>
}

/**
 * Reusable template for asset pages
 * Handles data fetching, CRUD operations, and rendering
 */
export function AssetPageTemplate({
  pageTitle,
  pageDescription,
  assetType,
  assetTypeName,
  assetTypeIcon = Package,
  columnConfig,
  customColumns,
  showStats = true,
  showSearch = true,
  showAddButton = true,
  showExportButton = true,
  showBulkActions = true,
  additionalFilters,
}: AssetPageTemplateProps) {
  // Fetch assets with type filter
  const {
    assets,
    isLoading,
    isError,
    error,
    mutate,
  } = useAssets({
    types: [assetType],
    ...additionalFilters,
  })

  // Refresh handler
  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  // Create handler
  const handleCreate = useCallback(
    async (input: CreateAssetInput) => {
      await createAsset({
        ...input,
        type: assetType,
      })
      mutate()
    },
    [assetType, mutate]
  )

  // Update handler
  const handleUpdate = useCallback(
    async (assetId: string, input: UpdateAssetInput) => {
      await updateAsset(assetId, input)
      mutate()
    },
    [mutate]
  )

  // Delete handler
  const handleDelete = useCallback(
    async (assetId: string) => {
      await deleteAsset(assetId)
      mutate()
    },
    [mutate]
  )

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (assetIds: string[]) => {
      await bulkDeleteAssets(assetIds)
      mutate()
    },
    [mutate]
  )

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <PageHeader title={pageTitle} description={pageDescription} />

        <div className="mt-6">
          <AssetsDataTable
            assets={assets}
            isLoading={isLoading}
            isError={isError}
            error={error}
            assetType={assetType}
            assetTypeName={assetTypeName}
            assetTypeIcon={assetTypeIcon}
            columnConfig={columnConfig}
            customColumns={customColumns}
            onRefresh={handleRefresh}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            showStats={showStats}
            showSearch={showSearch}
            showAddButton={showAddButton}
            showExportButton={showExportButton}
            showBulkActions={showBulkActions}
          />
        </div>
      </Main>
    </>
  )
}

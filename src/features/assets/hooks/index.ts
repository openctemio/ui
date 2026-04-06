/**
 * Assets Hooks - Barrel Export
 */

export {
  // Basic CRUD hooks
  useAssets,
  useAsset,
  useAssetsByType,
  useAssetStats,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  // Repository extension hooks
  useAssetWithRepository,
  useRepositoryExtension,
  useRepositoryAssets,
  createRepositoryAsset,
  updateRepositoryExtension,
  // Status operations
  activateAsset,
  deactivateAsset,
  archiveAsset,
} from './use-assets'
export type { AssetStatsData, AssetSearchFilters } from './use-assets'

export { useAssetTags } from './use-asset-tags'

// Shared hooks for asset page consolidation
export { useAssetCRUD } from './use-asset-crud'
export { useAssetScope } from './use-asset-scope'
export { useAssetDialogs } from './use-asset-dialogs'
export { useAssetExport } from './use-asset-export'
export type { ExportFieldConfig } from './use-asset-export'

// Asset ownership hooks
export {
  useAssetOwners,
  addAssetOwner,
  updateAssetOwner,
  removeAssetOwner,
} from './use-asset-owners'

// Asset relationship hooks
export { useAssetRelationships } from './use-asset-relationships'

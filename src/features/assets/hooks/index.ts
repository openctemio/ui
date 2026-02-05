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

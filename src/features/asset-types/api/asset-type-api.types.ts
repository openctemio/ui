/**
 * Asset Type API types.
 *
 * The wire shapes are GENERATED from the API's OpenAPI spec — see
 * src/lib/api/generated. They used to be hand-written here, which is how the UI
 * ended up describing endpoints the server does not have and missing fields it
 * does return. Nothing in this file restates a field.
 *
 * The list envelopes are declared inline in the spec rather than as named
 * schemas, so they are reached through the path + method.
 */
import type { ApiResponse, AssetTypeResponse, AssetTypeCategoryResponse } from '@/lib/api/generated'

export type ApiAssetTypeCategory = AssetTypeCategoryResponse
export type ApiAssetType = AssetTypeResponse

export type ApiAssetTypeListResponse = ApiResponse<'/asset-types', 'get'>
export type ApiAssetTypeCategoryListResponse = ApiResponse<'/asset-types/categories', 'get'>

/** Query filters — a UI concern, not part of any response body. */
export interface AssetTypeFilter {
  search?: string
  category_id?: string
  code?: string
  is_system?: boolean
  is_scannable?: boolean
  is_discoverable?: boolean
  active_only?: boolean
  include_category?: boolean
}

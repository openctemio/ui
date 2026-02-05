/**
 * Asset Type API Types
 *
 * These types match the backend API responses for centralized asset types.
 */

// Category response from API
export interface ApiAssetTypeCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Asset Type response from API
// Asset types are system-level configuration (no tenant_id)
export interface ApiAssetType {
  id: string;
  category_id?: string;
  category?: ApiAssetTypeCategory;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order: number;
  pattern_regex?: string;
  pattern_placeholder?: string;
  pattern_example?: string;
  supports_wildcard: boolean;
  supports_cidr: boolean;
  is_discoverable: boolean;
  is_scannable: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// List response
export interface ApiAssetTypeListResponse {
  data: ApiAssetType[];
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface ApiAssetTypeCategoryListResponse {
  data: ApiAssetTypeCategory[];
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

// Filter options
export interface AssetTypeFilter {
  search?: string;
  category_id?: string;
  code?: string;
  is_system?: boolean;
  is_scannable?: boolean;
  is_discoverable?: boolean;
  active_only?: boolean;
  include_category?: boolean;
}

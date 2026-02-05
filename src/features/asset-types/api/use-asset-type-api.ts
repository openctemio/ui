"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/client";
import type {
  ApiAssetType,
  ApiAssetTypeListResponse,
  ApiAssetTypeCategoryListResponse,
  AssetTypeFilter,
} from "./asset-type-api.types";

/**
 * Hook to fetch asset types from the API
 */
export function useAssetTypes(filter?: AssetTypeFilter) {
  // Build query string
  const params = new URLSearchParams();
  if (filter?.search) params.append("search", filter.search);
  if (filter?.category_id) params.append("category_id", filter.category_id);
  if (filter?.code) params.append("code", filter.code);
  if (filter?.is_system !== undefined) params.append("is_system", String(filter.is_system));
  if (filter?.is_scannable !== undefined) params.append("is_scannable", String(filter.is_scannable));
  if (filter?.is_discoverable !== undefined) params.append("is_discoverable", String(filter.is_discoverable));
  if (filter?.active_only) params.append("active_only", "true");
  if (filter?.include_category) params.append("include_category", "true");

  const queryString = params.toString();
  const endpoint = `/api/v1/asset-types${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<ApiAssetTypeListResponse>(
    endpoint,
    fetcher<ApiAssetTypeListResponse>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    assetTypes: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch active asset types (commonly used for dropdowns)
 */
export function useActiveAssetTypes() {
  return useAssetTypes({ active_only: true, include_category: true });
}

/**
 * Hook to fetch asset type categories
 */
export function useAssetTypeCategories(activeOnly = true) {
  const params = new URLSearchParams();
  if (activeOnly) params.append("active_only", "true");

  const queryString = params.toString();
  const endpoint = `/api/v1/asset-types/categories${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<ApiAssetTypeCategoryListResponse>(
    endpoint,
    fetcher<ApiAssetTypeCategoryListResponse>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    categories: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single asset type by ID
 */
export function useAssetType(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ApiAssetType>(
    id ? `/api/v1/asset-types/${id}` : null,
    fetcher<ApiAssetType>,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    assetType: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Helper to convert API asset type to scope type config format
 * for backwards compatibility with existing scope config UI
 */
export function assetTypeToScopeConfig(assetType: ApiAssetType) {
  return {
    type: assetType.code,
    label: assetType.name,
    icon: assetType.icon ?? "FileQuestion",
    placeholder: assetType.pattern_placeholder ?? "",
    helpText: assetType.description ?? "",
    validation: {
      pattern: assetType.pattern_regex ? new RegExp(assetType.pattern_regex) : /^.+$/,
      message: `Invalid ${assetType.name.toLowerCase()} format`,
    },
    supportsWildcard: assetType.supports_wildcard,
    supportsCIDR: assetType.supports_cidr,
  };
}

/**
 * Hook to get asset types in scope config format
 */
export function useScopeTypeConfigs() {
  const { assetTypes, isLoading, error } = useActiveAssetTypes();

  const configs = assetTypes.map(assetTypeToScopeConfig);

  return {
    configs,
    isLoading,
    error,
  };
}

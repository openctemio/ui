"use client";

import useSWR from "swr";
import { useTenant } from "@/context/tenant-provider";
import { get } from "@/lib/api/client";
import { usePermissions, Permission } from "@/lib/permissions";

// ============================================
// API Response Types (snake_case from backend)
// ============================================

interface AssetTypeBreakdownResponse {
  type: string;
  total: number;
  exposed: number;
}

interface ExposedServiceResponse {
  id: string;
  name: string;
  type: string;
  port?: number;
  exposure: string;
  criticality: string;
  finding_count: number;
  last_seen: string;
}

interface AssetChangeResponse {
  type: string;
  asset_name: string;
  asset_type: string;
  timestamp: string;
}

interface AttackSurfaceStatsResponse {
  total_assets: number;
  exposed_services: number;
  critical_exposures: number;
  risk_score: number;
  total_assets_change: number;
  exposed_services_change: number;
  critical_exposures_change: number;
  asset_breakdown: AssetTypeBreakdownResponse[];
  exposed_services_list: ExposedServiceResponse[];
  recent_changes: AssetChangeResponse[];
}

// ============================================
// Frontend Types (camelCase)
// ============================================

export interface AssetTypeBreakdown {
  type: string;
  total: number;
  exposed: number;
}

export interface ExposedService {
  id: string;
  name: string;
  type: string;
  port?: number;
  exposure: string;
  criticality: string;
  findingCount: number;
  lastSeen: string;
}

export interface AssetChange {
  type: "added" | "removed" | "changed";
  assetName: string;
  assetType: string;
  timestamp: string;
}

export interface AttackSurfaceStats {
  totalAssets: number;
  exposedServices: number;
  criticalExposures: number;
  riskScore: number;
  totalAssetsChange: number;
  exposedServicesChange: number;
  criticalExposuresChange: number;
  assetBreakdown: AssetTypeBreakdown[];
  exposedServicesList: ExposedService[];
  recentChanges: AssetChange[];
}

// ============================================
// Transform API response to frontend format
// ============================================

function transformResponse(data: AttackSurfaceStatsResponse): AttackSurfaceStats {
  return {
    totalAssets: data.total_assets,
    exposedServices: data.exposed_services,
    criticalExposures: data.critical_exposures,
    riskScore: data.risk_score,
    totalAssetsChange: data.total_assets_change,
    exposedServicesChange: data.exposed_services_change,
    criticalExposuresChange: data.critical_exposures_change,
    assetBreakdown: data.asset_breakdown?.map((item) => ({
      type: item.type,
      total: item.total,
      exposed: item.exposed,
    })) || [],
    exposedServicesList: data.exposed_services_list?.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      port: item.port,
      exposure: item.exposure,
      criticality: item.criticality,
      findingCount: item.finding_count,
      lastSeen: item.last_seen,
    })) || [],
    recentChanges: data.recent_changes?.map((item) => ({
      type: item.type as "added" | "removed" | "changed",
      assetName: item.asset_name,
      assetType: item.asset_type,
      timestamp: item.timestamp,
    })) || [],
  };
}

// ============================================
// SWR Fetcher
// ============================================

async function fetchAttackSurfaceStats(url: string): Promise<AttackSurfaceStats> {
  const data = await get<AttackSurfaceStatsResponse>(url);
  return transformResponse(data);
}

// ============================================
// Hook
// ============================================

export function useAttackSurfaceStats() {
  const { currentTenant } = useTenant();
  const { can } = usePermissions();
  const canReadAssets = can(Permission.AssetsRead);

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadAssets;

  const key = shouldFetch ? "/api/v1/attack-surface/stats" : null;

  const { data, error, isLoading, mutate } = useSWR<AttackSurfaceStats>(
    key,
    fetchAttackSurfaceStats,
    {
      revalidateOnFocus: false,
      revalidateIfStale: true,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );

  return {
    stats: data,
    error,
    isLoading: shouldFetch ? isLoading : false,
    mutate,
  };
}

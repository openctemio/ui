'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get, put, post, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { usePermissions, Permission } from '@/lib/permissions'
import { useTenant } from '@/context/tenant-provider'
import type { AssetLifecycleSettings, LifecycleRunReport, SnoozeRequest } from '../types'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, { showToast: true, logError: true })
  },
}

function settingsEndpoint(tenantID: string): string {
  return `/api/v1/tenants/${tenantID}/settings/asset-lifecycle`
}

function dryRunEndpoint(tenantID: string): string {
  return `/api/v1/tenants/${tenantID}/settings/asset-lifecycle/dry-run`
}

function snoozeEndpoint(assetID: string): string {
  return `/api/v1/assets/${assetID}/lifecycle/snooze`
}

/**
 * Fetches the tenant's current asset-lifecycle settings. Requires
 * `team:update` permission because lifecycle controls demote asset
 * status without human review — same admin-only gate the PUT uses.
 */
export function useAssetLifecycleSettings(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canRead = can(Permission.TeamUpdate)

  const key = currentTenant && canRead ? settingsEndpoint(currentTenant.id) : null

  return useSWR<AssetLifecycleSettings>(key, (url: string) => get<AssetLifecycleSettings>(url), {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Persists the entire settings payload. The backend validator
 * rejects `enabled=true` when `dry_run_completed_at` is null, so
 * callers should always run a dry-run before flipping the enable
 * flag on for the first time.
 */
export async function updateAssetLifecycleSettings(
  tenantID: string,
  payload: AssetLifecycleSettings
): Promise<AssetLifecycleSettings> {
  return put<AssetLifecycleSettings>(settingsEndpoint(tenantID), payload)
}

/**
 * Runs the worker against the tenant without writing anything and
 * returns the counts of assets that WOULD transition. The backend
 * stamps `dry_run_completed_at` on success, unlocking the enable
 * toggle on the next PUT.
 */
export async function runAssetLifecycleDryRun(tenantID: string): Promise<LifecycleRunReport> {
  return post<LifecycleRunReport>(dryRunEndpoint(tenantID), {})
}

/**
 * Pauses the worker on a single asset for the given duration. Set
 * `reactivate=true` when the operator is rescuing an asset the
 * worker incorrectly demoted — the same call also flips its status
 * back to active so the flap does not repeat tomorrow.
 */
export async function snoozeAssetLifecycle(assetID: string, payload: SnoozeRequest): Promise<void> {
  await post<void>(snoozeEndpoint(assetID), payload)
}

/**
 * Clears any active snooze. The worker takes over on its next run.
 * Does NOT reactivate the asset — operators who want to flip status
 * manually use the regular activate/deactivate actions.
 */
export async function unsnoozeAssetLifecycle(assetID: string): Promise<void> {
  await del<void>(snoozeEndpoint(assetID))
}

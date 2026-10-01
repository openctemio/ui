/**
 * Scan zone API hooks (RFC-023): /api/v1/scan-zones.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get, post, patch, put, del } from './client'
import { useTenant } from '@/context/tenant-provider'
import { scanZoneEndpoints, API_BASE } from './endpoints'
import type {
  CreateScanZoneRequest,
  ScanZone,
  ScanZoneCoverage,
  ScanZoneListResponse,
  ScanZonePreview,
  ScanZonePreviewRequest,
  UpdateScanZoneRequest,
} from './scan-zone-types'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  shouldRetryOnError: (error) => !(error?.statusCode >= 400 && error?.statusCode < 500),
  errorRetryCount: 2,
  dedupingInterval: 2000,
}

/**
 * The tenant's scan zones. Pass `enabled: false` when the caller lacks
 * sensors:zones:read, so no request (and no 403) is made.
 */
export function useScanZones(enabled = true, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && enabled ? scanZoneEndpoints.list() : null
  return useSWR<ScanZoneListResponse>(key, (url: string) => get<ScanZoneListResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}

/** Inventory coverage by zone (RFC-023 V3). */
export function useScanZoneCoverage(enabled = true, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && enabled ? scanZoneEndpoints.coverage() : null
  return useSWR<ScanZoneCoverage>(key, (url: string) => get<ScanZoneCoverage>(url), {
    ...defaultConfig,
    ...config,
  })
}

/** Revalidates every scan zone request (list, coverage, detail). */
export async function invalidateScanZonesCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.startsWith(API_BASE.SCAN_ZONES), undefined, {
    revalidate: true,
  })
}

export function createScanZone(body: CreateScanZoneRequest) {
  return post<ScanZone>(scanZoneEndpoints.create(), body)
}

export function updateScanZone(zoneId: string, body: UpdateScanZoneRequest) {
  return patch<ScanZone>(scanZoneEndpoints.update(zoneId), body)
}

export function deleteScanZone(zoneId: string) {
  return del<void>(scanZoneEndpoints.delete(zoneId))
}

export function assignSensorToZone(zoneId: string, sensorId: string) {
  return put<ScanZone>(scanZoneEndpoints.sensor(zoneId, sensorId), {})
}

export function unassignSensorFromZone(zoneId: string, sensorId: string) {
  return del<void>(scanZoneEndpoints.sensor(zoneId, sensorId))
}

/** Where a scan's targets would go if triggered now. Read-only. */
export function previewScanZoneRouting(body: ScanZonePreviewRequest) {
  return post<ScanZonePreview>(scanZoneEndpoints.preview(), body)
}

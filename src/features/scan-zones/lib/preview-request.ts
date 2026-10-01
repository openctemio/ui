import type { CreateScanConfigRequest } from '@/lib/api/scan-types'
import type { ScanZonePreviewRequest } from '@/lib/api/scan-zone-types'

/** The routing preview request for a scan as the New/Edit dialog would save it. */
export function toZonePreviewRequest(
  r: Pick<
    CreateScanConfigRequest,
    'targets' | 'asset_group_ids' | 'scan_type' | 'scanner_name' | 'pipeline_id' | 'targets_per_job'
  >,
  scanZoneId: string | null | undefined
): ScanZonePreviewRequest {
  return {
    targets: r.targets ?? [],
    asset_group_ids: r.asset_group_ids ?? [],
    scan_type: r.scan_type,
    scanner_name: r.scanner_name,
    pipeline_id: r.pipeline_id,
    targets_per_job: r.targets_per_job,
    scan_zone_id: scanZoneId ?? null,
  }
}

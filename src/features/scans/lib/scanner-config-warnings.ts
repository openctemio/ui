import { toast } from 'sonner'

import type { ScanConfig, ScannerConfigWarning } from '@/lib/api/scan-types'

const REASON_TEXT: Record<string, string> = {
  key_name: 'named like a credential',
  known_format: 'looks like a token or key',
  high_entropy: 'looks like a random secret',
}

/**
 * One line per scanner_config value the API flagged as secret-looking
 * (api RFC-032 Phase 0). The value itself is never in the response.
 */
export function describeScannerConfigWarnings(
  warnings: ScannerConfigWarning[] | undefined
): string[] {
  if (!warnings?.length) return []
  return warnings.map((w) => `${w.path}: ${REASON_TEXT[w.reason] ?? w.reason}`)
}

/**
 * Warn after a scan was saved when its scanner config holds values that look
 * like secrets: the config is sent to the sensor in clear inside every scan
 * command. Never blocks; the scan is already saved.
 */
export function notifyScannerConfigWarnings(
  scan: Pick<ScanConfig, 'name' | 'scanner_config_warnings'> | undefined
) {
  const lines = describeScannerConfigWarnings(scan?.scanner_config_warnings)
  if (!lines.length) return
  toast.warning(`Scan "${scan?.name ?? ''}" has secret-looking scanner settings`, {
    description: `${lines.join('; ')}. Scanner settings are sent to the sensor in clear with every scan; keep credentials on the sensor instead.`,
    duration: 10000,
  })
}

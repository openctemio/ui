import { ApiClientError, getErrorMessage } from '@/lib/api/error-handler'

/**
 * What a scan zone or trigger error means for the person who hit it. The
 * server's message is always shown (it names the range, zone or target);
 * these hints add what to do next.
 */
const HINTS: Record<string, string> = {
  ZONE_NAME_TAKEN: 'Another zone already has this name. Names are unique per team, ignoring case.',
  DEFAULT_ZONE_EXISTS:
    'Your team already has a default zone. Unset it there first; only one zone receives public targets.',
  ZONE_IN_USE:
    'Scans or jobs still use this zone. Wait for its queued and running jobs to finish, or move the scans to another zone, then delete it.',
  NO_ZONE_COVERAGE:
    'No target can be scanned: each is outside every scan zone or in a zone without sensors. Add the ranges to a zone, or assign a sensor.',
  ZONE_SPLIT_REQUIRED:
    'A workflow runs in one zone. Split the targets into one scan per zone, or pick a zone.',
  TOO_MANY_JOBS: 'The scan would create more than 1000 jobs. Raise targets per job or split it.',
  NO_TARGETS:
    'The scan resolves to no target: its asset groups are empty and it has no direct targets.',
  ALL_TARGETS_EXCLUDED: 'Every target is excluded by your scope rules.',
  PLATFORM_SENSOR_REFUSED:
    'Shared platform sensors cannot scan internal or zoned targets, or asset groups. Use your own sensors.',
  SCAN_ZONE_NOT_FOUND: 'The zone this scan is restricted to no longer exists. Pick another zone.',
}

export function scanZoneErrorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiClientError)) return undefined
  const fromDetails = (err.details as { code?: unknown } | undefined)?.code
  if (typeof fromDetails === 'string' && HINTS[fromDetails]) return fromDetails
  if (HINTS[err.code]) return err.code
  // Older servers answer a zone conflict with the generic CONFLICT code; tell
  // the three apart by their message.
  if (err.statusCode === 409) {
    const m = err.message.toLowerCase()
    if (m.includes('name already exists')) return 'ZONE_NAME_TAKEN'
    if (m.includes('default scan zone')) return 'DEFAULT_ZONE_EXISTS'
    if (m.includes('queued or running') || m.includes('pinned to this scan zone'))
      return 'ZONE_IN_USE'
  }
  return err.code
}

export function scanZoneErrorHint(code: string | undefined): string | undefined {
  return code ? HINTS[code] : undefined
}

/** Message plus next step, for toasts and inline alerts. */
export function describeScanZoneError(
  err: unknown,
  fallback: string
): {
  message: string
  hint?: string
  code?: string
  status?: number
} {
  const code = scanZoneErrorCode(err)
  return {
    message: getErrorMessage(err, fallback),
    hint: scanZoneErrorHint(code),
    code,
    status: err instanceof ApiClientError ? err.statusCode : undefined,
  }
}

/** The next step for a failed scan trigger (NO_ZONE_COVERAGE, ZONE_SPLIT_REQUIRED, ...). */
export function triggerErrorHint(err: unknown): string | undefined {
  return scanZoneErrorHint(scanZoneErrorCode(err))
}

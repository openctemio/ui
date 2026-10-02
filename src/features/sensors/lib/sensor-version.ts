import type { Sensor, SensorSdkStatus, SensorVersionStatus } from '@/lib/api/sensor-types'

/**
 * One display form for a sensor version, the same rule the API applies: a
 * release version becomes semver with a single "v" ("0.4.2", "v0.4.2" and
 * "vv0.4.2" all read "v0.4.2"; "0.4" reads "v0.4.0"; build metadata is
 * dropped). Anything else ("dev") is shown as reported. Never prefix a version
 * with "v" anywhere else; render it through this.
 */
const SEMVER =
  /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z.-]+)?$/

/** A git-describe build ("-3-gabc1234[-dirty]") is its tag, not a pre-release. */
const GIT_DESCRIBE = /^-\d+-g[0-9a-f]{4,40}(-dirty)?$/

interface Parsed {
  core: [number, number, number]
  pre: string
}

function parse(raw: string | null | undefined): Parsed | null {
  const v = (raw ?? '').trim().replace(/^[vV]+/, '')
  const m = SEMVER.exec(v)
  if (!m) return null
  return {
    core: [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)],
    pre: m[4] ?? '',
  }
}

export function normalizeSensorVersion(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return null
  const p = parse(trimmed)
  if (!p) return trimmed
  return `v${p.core.join('.')}${p.pre}`
}

/** -1/0/1, or null when either side is not a release version. */
export function compareSensorVersions(
  a: string | null | undefined,
  b: string | null | undefined
): number | null {
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return null
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] < pb.core[i] ? -1 : 1
  }
  const preA = GIT_DESCRIBE.test(pa.pre) ? '' : pa.pre
  const preB = GIT_DESCRIBE.test(pb.pre) ? '' : pb.pre
  if (preA === preB) return 0
  // A pre-release sorts before its release.
  if (!preA) return 1
  if (!preB) return -1
  return preA < preB ? -1 : 1
}

/**
 * The version status: the API's when it sent one, else computed from the
 * release channel (latest / minimum from GET /sensors/stats).
 */
export function sensorVersionStatus(
  sensor: Pick<Sensor, 'version' | 'version_status'>,
  latest?: string | null,
  minimum?: string | null
): SensorVersionStatus {
  if (sensor.version_status) return sensor.version_status
  if (!parse(sensor.version)) return 'unknown'
  if (minimum && (compareSensorVersions(sensor.version, minimum) ?? 0) < 0) return 'unsupported'
  if (!latest) return 'unknown'
  const c = compareSensorVersions(sensor.version, latest)
  if (c === null) return 'unknown'
  return c < 0 ? 'update_available' : 'latest'
}

/** The SDK status the API sent; "unknown" from an older API. */
export function sensorSdkStatus(sensor: Pick<Sensor, 'sdk_status'>): SensorSdkStatus {
  return sensor.sdk_status ?? 'unknown'
}

/** The SDK version in display form ("v0.9.0"), or null when not reported. */
export function sensorSdkVersion(sensor: Pick<Sensor, 'sdk_version'>): string | null {
  return normalizeSensorVersion(sensor.sdk_version)
}

/** The key a sensor files under in the SDK version filter (the API's `sdk_version`). */
export function sensorSdkVersionKey(sensor: Pick<Sensor, 'sdk_version'>): string {
  return sensorSdkVersion(sensor) ?? 'unknown'
}

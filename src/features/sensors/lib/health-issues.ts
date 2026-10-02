import type { Sensor } from '@/lib/api/sensor-types'

import {
  contentAgeText,
  contentLabel,
  contentState,
  formatHours,
  shortContentError,
} from './content'
import type { HealthCheck, HealthCheckAction } from './health-checks'
import { sensorState, type FleetThresholds } from './sensor-state'

/**
 * What is wrong with a sensor, in plain words, for the callout at the top of
 * the drawer: one issue per problem the health checklist found (scanner
 * content split per item), worst first. An empty list means nothing needs
 * attention.
 */

export type HealthIssueSeverity = 'critical' | 'warning' | 'info'
export type HealthIssueAction = HealthCheckAction | 'refresh_content'

export interface HealthIssue {
  key: string
  severity: HealthIssueSeverity
  /** The problem, short ("Nuclei templates: refresh failed"). */
  title: string
  /** What it means, one sentence. */
  text: string
  /** The raw error the sensor reported, shown behind a disclosure. */
  error?: string
  /** When the problem started, when known (ISO). */
  since?: string | null
  action?: HealthIssueAction
}

const SEVERITY_ORDER: Record<HealthIssueSeverity, number> = { critical: 0, warning: 1, info: 2 }

function checkTitle(check: HealthCheck, state: ReturnType<typeof sensorState>): string {
  switch (check.key) {
    case 'heartbeat':
      if (state === 'disabled') return 'Disabled'
      if (state === 'revoked') return 'Access revoked'
      if (state === 'never_connected') return 'Not connected yet'
      if (state === 'stale') return 'Heartbeat late'
      return 'No heartbeat'
    case 'outbox':
      return check.status === 'critical' ? 'Results lost' : 'Results waiting to upload'
    case 'key':
      return check.status === 'critical' ? 'API key expired' : 'API key expires soon'
    case 'version':
      return 'Unsupported version'
    case 'sdk':
      return 'SDK below the supported minimum'
    case 'protocol':
      return 'Protocol v1 is deprecated'
    case 'tools':
      return /not installed/i.test(check.text) ? 'Tools not installed' : 'No usable tool'
    case 'error':
      return 'The sensor reported an error'
    default:
      return check.label
  }
}

function contentIssues(sensor: Pick<Sensor, 'content'>, now: number): HealthIssue[] {
  const out: HealthIssue[] = []
  for (const c of sensor.content ?? []) {
    const label = contentLabel(c.name)
    const key = `content:${c.name}`
    switch (contentState(c)) {
      case 'failed':
        out.push({
          key,
          severity: 'warning',
          title: `${label}: refresh failed`,
          text: c.version
            ? `Scans keep using the installed ${c.version}.`
            : 'None is installed yet, so scans cannot use it.',
          error: c.error,
          action: 'refresh_content',
        })
        break
      case 'stale': {
        const age = contentAgeText(c, now)
        const limit = formatHours(c.max_age_hours)
        out.push({
          key,
          severity: 'warning',
          title: `${label} is out of date`,
          text: `${age ?? 'Older than allowed'}${limit ? `, over the ${limit} limit` : ''}.`,
          action: 'refresh_content',
        })
        break
      }
      case 'mismatch':
        out.push({
          key,
          severity: 'warning',
          title: `${label}: not the pinned version`,
          text: `Runs ${c.version}; the content policy pins ${c.pinned_version}.`,
          action: 'refresh_content',
        })
        break
      case 'missing':
        out.push({
          key,
          severity: 'warning',
          title: `${label} not installed`,
          text: 'The sensor has not downloaded it yet.',
          action: 'refresh_content',
        })
        break
      default:
        break
    }
  }
  return out
}

export function sensorHealthIssues(
  sensor: Sensor,
  checks: HealthCheck[],
  now: number,
  thresholds?: FleetThresholds
): HealthIssue[] {
  const state = sensorState(sensor, now, thresholds)
  const issues: HealthIssue[] = []
  for (const check of checks) {
    if (check.key === 'content') {
      if (check.status === 'warning' || check.status === 'critical') {
        issues.push(...contentIssues(sensor, now))
      }
      continue
    }
    const lifecycle = check.key === 'heartbeat' && (state === 'disabled' || state === 'revoked')
    if (check.status !== 'warning' && check.status !== 'critical' && !lifecycle) continue
    const error = check.key === 'error' ? check.text : undefined
    issues.push({
      key: check.key,
      severity: lifecycle ? 'info' : check.status === 'critical' ? 'critical' : 'warning',
      title: checkTitle(check, state),
      text: error ? shortContentError(error) : check.text,
      error: error && shortContentError(error) !== error ? error : undefined,
      since:
        check.key === 'heartbeat' && (state === 'stale' || state === 'offline')
          ? (sensor.last_seen_at ?? null)
          : check.key === 'key' && check.status === 'critical'
            ? (sensor.key_expires_at ?? null)
            : null,
      action: check.action,
    })
  }
  // The API judged the sensor degraded for a reason the checklist does not
  // cover: say what the API said rather than nothing.
  if (issues.length === 0 && state === 'degraded') {
    for (const r of sensor.health_reasons ?? []) {
      const short = shortContentError(r.message)
      issues.push({
        key: `reason:${r.code}`,
        severity: r.severity === 'critical' ? 'critical' : 'warning',
        title: 'Needs attention',
        text: short,
        error: short !== r.message ? r.message : undefined,
      })
    }
  }
  return issues
    .map((issue, i) => ({ issue, i }))
    .sort(
      (a, b) => SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] || a.i - b.i
    )
    .map(({ issue }) => issue)
}

/** The worst severity among the issues; null when there are none. */
export function worstIssueSeverity(issues: HealthIssue[]): HealthIssueSeverity | null {
  if (issues.length === 0) return null
  return issues.reduce<HealthIssueSeverity>(
    (worst, i) => (SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[worst] ? i.severity : worst),
    'info'
  )
}

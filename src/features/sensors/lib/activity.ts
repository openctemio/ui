import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Cable,
  CheckCircle2,
  Clock,
  Database,
  DatabaseZap,
  FileText,
  Gauge,
  KeyRound,
  Package,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
  User,
  Wifi,
  WifiOff,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityTimelineTone } from '@/features/shared'
import { canonicalAuditAction, getActionLabel, type AuditAction } from '@/lib/api/audit-types'
import type {
  SensorActivityCategory,
  SensorActivityDetails,
  SensorActivityItem,
} from '@/lib/api/sensor-types'
import type { TranslateVars } from '@/lib/i18n'

import { formatDurationShort } from './format'
import { manifestDiffLines } from './manifest'
import { normalizeSensorVersion } from './sensor-version'

/** The app's `t()` (useTranslation). */
export type Translate = (key: string, fallback?: string, vars?: TranslateVars) => string

/** One timeline row for a sensor event, built client-side from type + details. */
export interface SensorActivityView {
  icon: LucideIcon
  tone: ActivityTimelineTone
  title: string
  /** Secondary lines, in order. */
  details: string[]
}

export const SENSOR_ACTIVITY_CHIP_KEYS: Record<SensorActivityCategory, [string, string]> = {
  people: ['sensors.activity.chip.people', 'People'],
  status: ['sensors.activity.chip.status', 'Status'],
  updates: ['sensors.activity.chip.updates', 'Updates'],
  jobs: ['sensors.activity.chip.jobs', 'Jobs'],
}

const ARROW = '→'

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return typeof v === 'string' ? v : String(v)
}

function version(v: unknown): string {
  const s = str(v)
  return normalizeSensorVersion(s) ?? s
}

function fromTo(from: string, to: string): string {
  if (from && to) return `${from} ${ARROW} ${to}`
  return to || from
}

function shortId(id: string | undefined): string {
  return id ? id.slice(0, 8) : ''
}

/** A changed value from an audit row, short enough for one line. */
function auditValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 60 ? `${s.slice(0, 57)}...` : s
}

const AUDIT_ICONS: Record<string, LucideIcon> = {
  'sensor.created': Plus,
  'sensor.updated': Pencil,
  'sensor.deleted': Trash2,
  'sensor.activated': Power,
  'sensor.deactivated': PowerOff,
  'sensor.revoked': Ban,
  'sensor.key_regenerated': KeyRound,
  'sensor.key_renewed': KeyRound,
  'sensor.connected': Wifi,
  'sensor.disconnected': WifiOff,
}

const AUDIT_LABELS: Record<string, string> = {
  'sensor.created': 'Sensor created',
  'sensor.updated': 'Sensor settings changed',
  'sensor.deleted': 'Sensor deleted',
  'sensor.activated': 'Sensor enabled',
  'sensor.deactivated': 'Sensor disabled',
  'sensor.revoked': 'Access revoked',
  'sensor.key_regenerated': 'API key rotated',
  'sensor.key_renewed': 'API key renewed',
  'sensor.connected': 'Sensor connected',
  'sensor.disconnected': 'Sensor disconnected',
}

function directionWord(t: Translate, d: unknown): string {
  if (d === 'upgrade') return t('sensors.activity.direction.upgrade', 'upgrade')
  if (d === 'downgrade') return t('sensors.activity.direction.downgrade', 'downgrade')
  return t('sensors.activity.direction.changed', 'changed')
}

function directionTone(d: unknown): ActivityTimelineTone {
  return d === 'downgrade' ? 'warning' : 'info'
}

function jobDetails(t: Translate, d: SensorActivityDetails): string[] {
  const parts = [str(d.command_type).replace(/_/g, ' '), shortId(d.command_id)].filter(Boolean)
  if (typeof d.duration_seconds === 'number') {
    parts.push(
      t('sensors.activity.took', 'took {duration}', {
        duration: formatDurationShort(d.duration_seconds),
      })
    )
  }
  const lines = parts.length ? [parts.join(' · ')] : []
  if (d.error) lines.push(str(d.error))
  return lines
}

/**
 * The sentence and detail lines for one activity item. Types this UI does not
 * know fall back to the server's `summary`.
 */
export function describeSensorActivity(
  item: SensorActivityItem,
  t: Translate,
  locale?: string
): SensorActivityView {
  const d: SensorActivityDetails = item.details ?? {}
  const time = (iso: unknown) => {
    const date = new Date(str(iso))
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(locale)
  }
  const fallback: SensorActivityView = {
    icon: FileText,
    tone: 'muted',
    title: item.summary,
    details: [],
  }

  switch (item.type) {
    case 'online':
      return {
        icon: Wifi,
        tone: 'success',
        title: t('sensors.activity.online', 'Came back online'),
        details:
          typeof d.offline_seconds === 'number'
            ? [
                t('sensors.activity.offlineFor', 'Offline for {duration}', {
                  duration: formatDurationShort(d.offline_seconds),
                }),
              ]
            : [],
      }
    case 'offline': {
      const seen = time(d.last_seen_at)
      return {
        icon: WifiOff,
        tone: 'warning',
        title: t('sensors.activity.offline', 'Went offline'),
        details: seen
          ? [t('sensors.activity.lastHeartbeat', 'Last heartbeat {time}', { time: seen })]
          : [],
      }
    }
    case 'restarted': {
      const lines: string[] = []
      if (typeof d.downtime_seconds === 'number') {
        lines.push(
          t('sensors.activity.down', 'Down {duration}', {
            duration: formatDurationShort(d.downtime_seconds),
          })
        )
      }
      const started = time(d.started_at)
      if (started) {
        lines.push(t('sensors.activity.startedAt', 'Started {time}', { time: started }))
      }
      return {
        icon: RotateCcw,
        tone: 'info',
        title: t('sensors.activity.restarted', 'Restarted'),
        details: lines,
      }
    }
    case 'version_changed': {
      const from = version(d.from)
      const to = version(d.to)
      const title =
        d.direction === 'upgrade'
          ? t('sensors.activity.upgraded', 'Upgraded to {version}', { version: to })
          : d.direction === 'downgrade'
            ? t('sensors.activity.downgraded', 'Downgraded to {version}', { version: to })
            : t('sensors.activity.versionChanged', 'Version changed to {version}', {
                version: to,
              })
      return {
        icon: d.direction === 'downgrade' ? ArrowDownCircle : ArrowUpCircle,
        tone: directionTone(d.direction),
        title,
        details: [`${fromTo(from, to)} · ${directionWord(t, d.direction)}`],
      }
    }
    case 'sdk_version_changed': {
      const from = version(d.from)
      const to = version(d.to)
      const title =
        d.direction === 'upgrade'
          ? t('sensors.activity.sdkUpgraded', 'SDK upgraded to {version}', { version: to })
          : d.direction === 'downgrade'
            ? t('sensors.activity.sdkDowngraded', 'SDK downgraded to {version}', { version: to })
            : t('sensors.activity.sdkChanged', 'SDK changed to {version}', { version: to })
      return {
        icon: Package,
        tone: directionTone(d.direction),
        title,
        details: [
          [d.name ? str(d.name) : '', fromTo(from, to)].filter(Boolean).join(' ') +
            ` · ${directionWord(t, d.direction)}`,
        ],
      }
    }
    case 'protocol_changed':
      return {
        icon: Cable,
        tone: Number(d.to) < Number(d.from) ? 'warning' : 'info',
        title: t('sensors.activity.protocolChanged', 'Protocol changed to v{to}', {
          to: str(d.to),
        }),
        details: d.from !== undefined ? [fromTo(`v${str(d.from)}`, `v${str(d.to)}`)] : [],
      }
    case 'tools_changed': {
      const tool = (x: { name: string; version?: string }) =>
        x.version ? `${x.name} ${x.version}` : x.name
      const lines: string[] = []
      if (d.added?.length) {
        lines.push(
          t('sensors.activity.toolsAdded', 'Added: {list}', { list: d.added.map(tool).join(', ') })
        )
      }
      if (d.removed?.length) {
        lines.push(
          t('sensors.activity.toolsRemoved', 'Removed: {list}', {
            list: d.removed.map(tool).join(', '),
          })
        )
      }
      if (d.updated?.length) {
        lines.push(
          t('sensors.activity.toolsUpdated', 'Updated: {list}', {
            list: d.updated
              .map((u) => `${u.name} ${fromTo(str(u.from), str(u.to))}`.trim())
              .join(', '),
          })
        )
      }
      return {
        icon: Wrench,
        tone: 'info',
        title: t('sensors.activity.toolsChanged', 'Tools changed'),
        details: lines,
      }
    }
    case 'capacity_changed':
      return {
        icon: Gauge,
        tone: 'info',
        title: t('sensors.activity.capacityChanged', 'Capacity changed to {to} concurrent jobs', {
          to: str(d.to),
        }),
        details: d.from !== undefined ? [fromTo(str(d.from), str(d.to))] : [],
      }
    case 'manifest_changed':
      return {
        icon: FileText,
        tone: 'info',
        title: t('sensors.activity.manifestChanged', 'Manifest changed'),
        details: d.diff ? manifestDiffLines(d.diff, t) : [],
      }
    case 'content_updated':
      return {
        icon: Database,
        tone: 'info',
        title: t('sensors.activity.contentUpdated', 'Scanner content updated'),
        details: (d.items ?? []).map((c) =>
          `${[c.tool, c.name].filter(Boolean).join(' ')}: ${fromTo(str(c.from), str(c.to))}`.trim()
        ),
      }
    case 'content_refresh_failed':
      return {
        icon: DatabaseZap,
        tone: 'destructive',
        title: t('sensors.activity.contentRefreshFailed', 'Scanner content refresh failed'),
        details: (d.items ?? []).map((c) =>
          `${[c.tool, c.name].filter(Boolean).join(' ')}: ${str(c.error)}`.trim()
        ),
      }
    case 'job_claimed':
      return {
        icon: Play,
        tone: 'info',
        title: t('sensors.activity.jobClaimed', 'Took a job'),
        details: jobDetails(t, d),
      }
    case 'job_completed':
      return {
        icon: CheckCircle2,
        tone: 'success',
        title: t('sensors.activity.jobCompleted', 'Finished a job'),
        details: jobDetails(t, d),
      }
    case 'job_failed':
      return {
        icon: XCircle,
        tone: 'destructive',
        title: t('sensors.activity.jobFailed', 'A job failed'),
        details: jobDetails(t, d),
      }
    case 'job_canceled':
      return {
        icon: Ban,
        tone: 'muted',
        title: t('sensors.activity.jobCanceled', 'A job was canceled'),
        details: jobDetails(t, d),
      }
    case 'job_expired':
      return {
        icon: Clock,
        tone: 'warning',
        title: t('sensors.activity.jobExpired', 'A job expired before it finished'),
        details: jobDetails(t, d),
      }
    case 'audit': {
      // The API canonicalises rows written before the rename; canonicalise
      // again in case an older API sends the historical prefix through.
      const action = canonicalAuditAction(item.action || str(d.action))
      const suffix = action.startsWith('sensor.') ? action.slice('sensor.'.length) : ''
      const known = AUDIT_LABELS[action]
      const generic = action ? getActionLabel(action as AuditAction) : ''
      const title = known
        ? t(`sensors.activity.audit.${suffix}`, known)
        : generic && generic !== action
          ? generic
          : item.summary
      const lines: string[] = []
      const actor =
        !item.actor || item.actor === 'system'
          ? t('sensors.activity.bySystem', 'By the system')
          : t('sensors.activity.byActor', 'By {actor}', { actor: item.actor })
      lines.push(
        item.result === 'failure' ? `${actor} · ${t('sensors.activity.failed', 'failed')}` : actor
      )
      for (const [field, change] of Object.entries(d.changes ?? {})) {
        lines.push(`${field}: ${auditValue(change?.old)} ${ARROW} ${auditValue(change?.new)}`)
      }
      if (d.message) lines.push(str(d.message))
      return {
        icon: item.result === 'failure' ? XCircle : (AUDIT_ICONS[action] ?? User),
        tone: item.result === 'failure' ? 'destructive' : 'muted',
        title,
        details: lines,
      }
    }
    default:
      return fallback
  }
}

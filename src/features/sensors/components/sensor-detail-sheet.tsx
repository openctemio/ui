'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  History,
  Info,
  KeyRound,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  ShieldOff,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DetailCallout,
  DetailField,
  DetailFieldGrid,
  DetailSection,
  DetailSections,
  DetailStat,
  DetailStatGrid,
  EmptyState,
  RelativeTime,
  type DetailCalloutTone,
} from '@/features/shared'
import { useNow } from '@/hooks/use-now'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ScanZone } from '@/lib/api/scan-zone-types'
import { useSensor, useSensorCommands, SENSOR_REFRESH_MS } from '@/lib/api/sensor-hooks'
import type { Sensor, SensorCommand } from '@/lib/api/sensor-types'
import { sensorRoleOf } from '@/lib/api/sensor-types'
import { copyToClipboard } from '@/lib/clipboard'
import { Permission, useHasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import { SensorActivity, SensorRecentActivity } from './sensor-activity'
import { requestSensorContentRefresh, SensorContentSection } from './sensor-content-section'
import { SensorStateBadge } from './sensor-state-badge'
import {
  ProtocolTag,
  PROTOCOL_V1_SUNSET,
  PROTOCOL_V2_SENSOR_VERSION,
  SensorKeyCell,
  SensorTag,
  SensorToolList,
  SensorVersionCell,
} from './sensor-cells'
import { SensorInstallSnippets } from './sensor-install-snippets'
import { SENSOR_TYPE_LABELS } from './sensor-type-icon'
import { hasReportedTools, sensorCapacity, sensorToolRows } from '../lib/capabilities'
import { formatDurationShort } from '../lib/format'
import type { ReleaseChannel } from '../lib/fleet'
import {
  sensorHealthChecks,
  type HealthCheck,
  type HealthCheckAction,
  type HealthCheckStatus,
} from '../lib/health-checks'
import {
  sensorHealthIssues,
  worstIssueSeverity,
  type HealthIssue,
  type HealthIssueAction,
  type HealthIssueSeverity,
} from '../lib/health-issues'
import {
  canTakeJobs,
  isOneShotSensor,
  sensorState,
  type FleetThresholds,
} from '../lib/sensor-state'

interface SensorDetailSheetProps {
  sensor: Sensor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (sensor: Sensor) => void
  onRegenerateKey: (sensor: Sensor) => void
  onViewConfig?: (sensor: Sensor) => void
  onDelete: (sensor: Sensor) => void
  onActivate?: (sensor: Sensor) => void
  onDeactivate?: (sensor: Sensor) => void
  onRevoke?: (sensor: Sensor) => void
  /** State ladder thresholds from GET /sensors/stats. */
  thresholds?: FleetThresholds
  /** Release channel from GET /sensors/stats. */
  channel?: ReleaseChannel
  /** Scan zones (for the zone line) and the fleet (to count a zone's sensors). */
  zones?: Pick<ScanZone, 'id' | 'name' | 'ranges' | 'sensor_ids'>[]
  fleet?: Sensor[]
}

type DrawerTab = 'overview' | 'jobs' | 'activity' | 'config'

// ---------------------------------------------------------------------------
// Health: the callout (what is wrong) and the full checklist behind a toggle
// ---------------------------------------------------------------------------

const CHECK_ICON: Record<HealthCheckStatus, { icon: typeof CheckCircle2; className: string }> = {
  ok: { icon: CheckCircle2, className: 'text-success' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  critical: { icon: CircleAlert, className: 'text-destructive' },
  info: { icon: Info, className: 'text-muted-foreground' },
}

const ACTION_LABEL: Record<HealthIssueAction, string> = {
  rotate_key: 'Rotate key',
  install: 'Install command',
  edit: 'Edit sensor',
  zones: 'Zones',
  refresh_content: 'Refresh content',
}

const CALLOUT: Record<HealthIssueSeverity, { tone: DetailCalloutTone; icon: typeof Info }> = {
  critical: { tone: 'destructive', icon: CircleAlert },
  warning: { tone: 'warning', icon: AlertTriangle },
  info: { tone: 'info', icon: Info },
}

function HealthChecklist({
  checks,
  canManage,
  onAction,
}: {
  checks: HealthCheck[]
  canManage: boolean
  onAction: (action: HealthCheckAction) => void
}) {
  return (
    <ul className="divide-y rounded-lg border" aria-label="Health">
      {checks.map((c) => {
        const { icon: Icon, className } = CHECK_ICON[c.status]
        // Key rotation and editing are admin actions; reading the install
        // command and the zones are not.
        const showAction =
          !!c.action && (c.action === 'install' || c.action === 'zones' || canManage)
        const right =
          showAction && c.action ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onAction(c.action as HealthCheckAction)}
            >
              {ACTION_LABEL[c.action]}
            </Button>
          ) : c.aside ? (
            <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {c.aside}
            </span>
          ) : null
        return (
          <li
            key={c.key}
            className="flex items-start gap-2.5 px-3 py-2 text-sm"
            data-check={c.key}
            data-status={c.status}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', className)} aria-label={c.status} />
            {/* Phones: the label above the text and the action under it;
                wider: label | text | action in one row. */}
            <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-x-2.5">
              <span className="block text-muted-foreground">{c.label}</span>
              <span className="block min-w-0 break-words">{c.text}</span>
              {right && <div className="mt-1.5 sm:hidden">{right}</div>}
            </div>
            {right && <div className="hidden shrink-0 sm:flex">{right}</div>}
          </li>
        )
      })}
    </ul>
  )
}

/** "Show error": the raw error a sensor reported, folded away. */
function RawError({ error }: { error: string }) {
  return (
    <details className="group mt-1 text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-muted-foreground select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" aria-hidden />
        Show the error
      </summary>
      <p className="mt-1 rounded-md bg-background/60 p-2 font-mono break-all text-foreground">
        {error}
      </p>
    </details>
  )
}

function IssueBody({ issue }: { issue: HealthIssue }) {
  return (
    <>
      <span className="block">
        {issue.text}
        {issue.since && (
          <>
            {' '}
            <span className="whitespace-nowrap">
              Since <RelativeTime date={issue.since} className="text-inherit" />.
            </span>
          </>
        )}
      </span>
      {issue.error && <RawError error={issue.error} />}
    </>
  )
}

/**
 * What is wrong with the sensor, why, and the fix, right under the header.
 * Nothing when all is well; the full checklist is one click away either way.
 */
function HealthSummary({
  sensor,
  issues,
  checks,
  canManage,
  onAction,
  onActivity,
}: {
  sensor: Sensor
  issues: HealthIssue[]
  checks: HealthCheck[]
  canManage: boolean
  onAction: (action: HealthCheckAction) => void
  onActivity: () => void
}) {
  const [checksOpen, setChecksOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const worst = worstIssueSeverity(issues)
  const passing = checks.filter((c) => c.status === 'ok').length
  const failing = checks.filter((c) => c.status === 'warning' || c.status === 'critical').length

  // One button per distinct fix the viewer may use.
  const allowed = (a: HealthIssueAction) =>
    a === 'install' || a === 'zones'
      ? true
      : a === 'refresh_content'
        ? canManage && !!sensor.content_refresh_supported
        : canManage
  const actions = [
    ...new Set(issues.map((i) => i.action).filter((a): a is HealthIssueAction => !!a)),
  ].filter(allowed)

  const run = async (a: HealthIssueAction) => {
    if (a !== 'refresh_content') return onAction(a)
    setRefreshing(true)
    try {
      await requestSensorContentRefresh(sensor)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-2">
      {worst && (
        <DetailCallout
          label="Health"
          tone={CALLOUT[worst].tone}
          icon={CALLOUT[worst].icon}
          title={issues.length === 1 ? issues[0].title : `${issues.length} problems need attention`}
          actions={
            <>
              {actions.map((a, i) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={i === 0 ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs"
                  disabled={a === 'refresh_content' && refreshing}
                  onClick={() => void run(a)}
                >
                  {a === 'refresh_content' &&
                    (refreshing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ))}
                  {ACTION_LABEL[a]}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={onActivity}
              >
                <History className="h-3.5 w-3.5" />
                View activity
              </Button>
            </>
          }
        >
          {issues.length === 1 ? (
            <IssueBody issue={issues[0]} />
          ) : (
            <ul className="mt-1 space-y-2">
              {issues.map((i) => (
                <li key={i.key} data-issue={i.key}>
                  <span className="block font-medium text-foreground">{i.title}</span>
                  <IssueBody issue={i} />
                </li>
              ))}
            </ul>
          )}
        </DetailCallout>
      )}

      <Collapsible open={checksOpen} onOpenChange={setChecksOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-start text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 transition-transform', checksOpen && 'rotate-90')}
              aria-hidden
            />
            {failing === 0 && !worst ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : null}
            <span className="min-w-0 flex-1 tabular-nums">
              {failing === 0
                ? `All ${checks.length} health checks passing`
                : `Health checks: ${passing} of ${checks.length} passing`}
            </span>
            <span className="shrink-0 text-xs">{checksOpen ? 'Hide' : 'Show'}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <HealthChecklist checks={checks} canManage={canManage} onAction={onAction} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview: stat strip, tools & capacity, identity
// ---------------------------------------------------------------------------

function agoShort(iso: string, now: number): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  if (t >= now - 1000) return 'just now'
  return `${formatDurationShort((now - t) / 1000)} ago`
}

function exactTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString()
}

/** "at 15:09" today, "on 1 Oct" before: a short anchor for a relative time. */
function clockAnchor(ms: number, now: number): string {
  const d = new Date(ms)
  const sameDay = new Date(now).toDateString() === d.toDateString()
  return sameDay
    ? `at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : `on ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}`
}

/**
 * The headline numbers. A number the sensor has not reported is left out,
 * never shown as zero.
 */
function SensorStats({
  sensor,
  now,
  thresholds,
}: {
  sensor: Sensor
  now: number
  thresholds?: FleetThresholds
}) {
  const state = sensorState(sensor, now, thresholds)
  const oneShot = isOneShotSensor(sensor)
  const running = state === 'online' || state === 'degraded' || state === 'stale'
  const cap = sensorCapacity(sensor)
  const current = sensor.current_jobs ?? 0
  const takesJobs = canTakeJobs(sensor, now, thresholds)
  const started = sensor.started_at ? new Date(sensor.started_at).getTime() : NaN

  return (
    <DetailStatGrid aria-label="Key numbers">
      {!oneShot && (
        <DetailStat
          label="Jobs running"
          value={current}
          unit={`/ ${cap.effective}`}
          meter={{ value: current, max: cap.effective, label: 'Job slots in use' }}
          caption={
            takesJobs ? `${Math.max(0, cap.effective - current)} slots free` : 'Not taking jobs'
          }
        />
      )}
      {sensor.last_seen_at && (
        <DetailStat
          label={oneShot ? 'Last run' : 'Last heartbeat'}
          value={agoShort(sensor.last_seen_at, now)}
          title={exactTime(sensor.last_seen_at)}
          tone={state === 'offline' ? 'destructive' : state === 'stale' ? 'warning' : 'default'}
          caption={
            Number.isNaN(new Date(sensor.last_seen_at).getTime())
              ? undefined
              : clockAnchor(new Date(sensor.last_seen_at).getTime(), now)
          }
        />
      )}
      {running && !Number.isNaN(started) && (
        <DetailStat
          label="Up for"
          value={formatDurationShort(Math.max(0, (now - started) / 1000))}
          title={exactTime(sensor.started_at)}
          caption={`since ${clockAnchor(started, now).replace(/^(at|on) /, '')}`}
        />
      )}
      <DetailStat
        label="Scans to date"
        value={sensor.total_scans.toLocaleString()}
        caption={`${sensor.total_findings.toLocaleString()} ${sensor.total_findings === 1 ? 'finding' : 'findings'}`}
      />
    </DetailStatGrid>
  )
}

function ToolsAndCapacity({
  sensor,
  now,
  thresholds,
}: {
  sensor: Sensor
  now: number
  thresholds?: FleetThresholds
}) {
  const cap = sensorCapacity(sensor)
  const reported = hasReportedTools(sensor)
  const platform = sensor.reported?.os
    ? [sensor.reported.os, sensor.reported.arch].filter(Boolean).join('/')
    : null
  const state = sensorState(sensor, now, thresholds)
  const live = state === 'online' || state === 'degraded'
  const load =
    live && (sensor.cpu_percent > 0 || sensor.memory_percent > 0)
      ? { cpu: Math.round(sensor.cpu_percent), mem: Math.round(sensor.memory_percent) }
      : null
  return (
    <DetailSection title="Tools & capacity">
      <div className="space-y-2">
        <SensorToolList rows={sensorToolRows(sensor)} />
        <p className="text-xs text-muted-foreground">
          {reported
            ? 'As the sensor reported. Scans go only to tools it has installed and its limit allows.'
            : 'Set on the sensor; it has not reported its tools yet.'}
        </p>
      </div>
      <DetailFieldGrid>
        <DetailField label="Concurrent jobs">
          <span className="flex flex-col gap-0.5 tabular-nums">
            <span>{cap.effective} at once</span>
            <span
              className="text-xs text-muted-foreground"
              title="Dispatch uses the lower of what the sensor reports and the limit set on it"
            >
              {cap.reported != null
                ? `sensor reports ${cap.reported} · limit ${cap.limit}`
                : `limit ${cap.limit}; the sensor reports none`}
            </span>
          </span>
        </DetailField>
        {(platform || load) && (
          <DetailField label="Host">
            <span className="flex flex-col gap-0.5 tabular-nums">
              <span>{platform ?? 'Platform not reported'}</span>
              {load && (
                <span className="text-xs text-muted-foreground">
                  <span className={cn(load.cpu >= 90 && 'text-warning')}>CPU {load.cpu}%</span>
                  {' · '}
                  <span className={cn(load.mem >= 90 && 'text-warning')}>memory {load.mem}%</span>
                </span>
              )}
            </span>
          </DetailField>
        )}
      </DetailFieldGrid>
    </DetailSection>
  )
}

function CopyId({ id }: { id: string }) {
  return (
    <button
      type="button"
      aria-label="Copy sensor ID"
      className="inline-flex max-w-full items-center gap-1.5 rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => {
        copyToClipboard(id)
        toast.success('Sensor ID copied')
      }}
    >
      <span className="truncate">{id}</span>
      <Copy className="h-3 w-3 shrink-0" aria-hidden />
    </button>
  )
}

function ProtocolValue({ sensor }: { sensor: Sensor }) {
  const p = sensor.protocol
  if (!p) return null
  const v1 = p.deprecated || p.version < 2
  const badge = (
    <SensorTag tone={v1 ? 'warning' : 'muted'}>
      v{p.version}
      {v1 ? ' · deprecated' : ''}
    </SensorTag>
  )
  return (
    <span className="flex flex-col gap-0.5">
      {p.user_agent ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="w-fit rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Protocol v${p.version}, ${p.user_agent}`}
            >
              {badge}
            </span>
          </TooltipTrigger>
          <TooltipContent className="font-mono text-xs">{p.user_agent}</TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
      {v1 && (
        <span className="text-xs text-warning">
          Upgrade to {PROTOCOL_V2_SENSOR_VERSION} before {PROTOCOL_V1_SUNSET}
        </span>
      )}
    </span>
  )
}

function ConnectionAndIdentity({
  sensor,
  now,
  channel,
  zoneNames,
}: {
  sensor: Sensor
  now: number
  channel?: ReleaseChannel
  zoneNames: string[]
}) {
  const labels = Object.entries(sensor.labels ?? {})
  const hostDiffers = !!sensor.hostname && sensor.hostname !== sensor.name
  const created = new Date(sensor.created_at)
  return (
    <DetailSection title="Connection & identity">
      <DetailFieldGrid>
        <DetailField label="Version">
          <SensorVersionCell
            sensor={sensor}
            latest={channel?.latest}
            min={channel?.min}
            sdkLatest={channel?.sdkLatest}
            sdkMin={channel?.sdkMin}
          />
        </DetailField>
        {sensor.protocol && (
          <DetailField label="Protocol">
            <ProtocolValue sensor={sensor} />
          </DetailField>
        )}
        <DetailField label="API key">
          <span className="flex flex-col gap-0.5">
            <span className="font-mono text-xs">{sensor.api_key_prefix}…</span>
            <span className="text-xs [&>span]:text-xs">
              <SensorKeyCell sensor={sensor} now={now} />
            </span>
          </span>
        </DetailField>
        {sensor.ip_address && (
          <DetailField label="Connects from">
            <span className="font-mono text-xs">{sensor.ip_address}</span>
          </DetailField>
        )}
        {hostDiffers && (
          <DetailField label="Host name">
            <span className="font-mono text-xs">{sensor.hostname}</span>
          </DetailField>
        )}
        {zoneNames.length > 0 && <DetailField label="Zone">{zoneNames.join(', ')}</DetailField>}
        <DetailField label="Created">
          {Number.isNaN(created.getTime()) ? null : (
            <span title={created.toLocaleString()}>
              {created.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              <span className="text-muted-foreground">
                (<RelativeTime date={sensor.created_at} className="text-inherit" />)
              </span>
            </span>
          )}
        </DetailField>
        {labels.length > 0 && (
          <DetailField label="Labels" full>
            <span className="flex flex-wrap gap-1">
              {labels.map(([k, v]) => (
                <Badge key={k} variant="secondary" className="font-normal">
                  {k}={String(v)}
                </Badge>
              ))}
            </span>
          </DetailField>
        )}
        {sensor.description && (
          <DetailField label="Description" full>
            {sensor.description}
          </DetailField>
        )}
        <DetailField label="ID" full>
          <CopyId id={sensor.id} />
        </DetailField>
      </DetailFieldGrid>

      <details className="group text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs text-muted-foreground select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" aria-hidden />
          More details
        </summary>
        <DetailFieldGrid className="mt-3">
          <DetailField label="Type (legacy)">
            {SENSOR_TYPE_LABELS[sensor.type] ?? sensor.type}
          </DetailField>
          {sensor.started_at && (
            <DetailField label="Process started">{exactTime(sensor.started_at)}</DetailField>
          )}
          {sensor.last_offline_at && (
            <DetailField label="Last offline">
              <RelativeTime date={sensor.last_offline_at} className="text-foreground" />
            </DetailField>
          )}
          {sensor.sensor_commit && (
            <DetailField label="Commit">
              <span className="font-mono text-xs">{sensor.sensor_commit}</span>
            </DetailField>
          )}
          {sensor.sensor_build_time && (
            <DetailField label="Built">{exactTime(sensor.sensor_build_time)}</DetailField>
          )}
          {sensor.protocol?.user_agent && (
            <DetailField label="User agent" full>
              <span className="font-mono text-xs break-all">{sensor.protocol.user_agent}</span>
            </DetailField>
          )}
        </DetailFieldGrid>
      </details>
    </DetailSection>
  )
}

// ---------------------------------------------------------------------------
// Jobs tab
// ---------------------------------------------------------------------------

const JOB_STATUS_TONE: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
  running: 'bg-info/15 text-info',
  acknowledged: 'bg-info/15 text-info',
  pending: 'bg-warning/15 text-warning',
}

function jobTitle(c: SensorCommand): string {
  const p = (c.payload ?? {}) as Record<string, unknown>
  const tool = (p.scanner ?? p.tool ?? p.scanner_type) as string | undefined
  return [c.type.replace(/_/g, ' '), tool].filter(Boolean).join(' · ')
}

function jobTarget(c: SensorCommand): string | null {
  const p = (c.payload ?? {}) as Record<string, unknown>
  const t = p.target ?? (Array.isArray(p.targets) ? (p.targets as unknown[]).join(', ') : null)
  return typeof t === 'string' && t ? t : null
}

/** The jobs dispatched to this sensor (GET /commands?sensor_id=). */
function SensorJobs({ sensor }: { sensor: Sensor }) {
  const canRead = useHasPermission(Permission.CommandsRead)
  const { data, isLoading, error } = useSensorCommands(sensor.id, canRead)
  if (!canRead) {
    return (
      <EmptyState
        icon={Lock}
        title="You can't see this sensor's jobs"
        description="Viewing jobs needs the sensor commands permission. Ask an organization admin."
        card={false}
      />
    )
  }
  if (isLoading && !data) return <Skeleton className="h-40 w-full" />
  if (error) {
    return <p className="text-sm text-muted-foreground">Could not load the jobs.</p>
  }
  const jobs = data?.data ?? []
  const oneShot = isOneShotSensor(sensor)
  const cap = sensorCapacity(sensor)
  const current = sensor.current_jobs ?? 0
  return (
    <div className="space-y-4">
      <DetailStatGrid aria-label="Job numbers">
        {!oneShot && (
          <DetailStat
            label="Running"
            value={current}
            unit={`/ ${cap.effective}`}
            meter={{ value: current, max: cap.effective, label: 'Job slots in use' }}
          />
        )}
        <DetailStat label="Scans" value={sensor.total_scans.toLocaleString()} caption="all time" />
        <DetailStat
          label="Findings"
          value={sensor.total_findings.toLocaleString()}
          caption="all time"
        />
      </DetailStatGrid>
      {oneShot && <p className="text-sm text-muted-foreground">A CI sensor runs its own scans.</p>}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No jobs yet"
          description="Scans the platform dispatches to this sensor show up here."
          card={false}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {jobs.map((c) => {
            const target = jobTarget(c)
            return (
              <li key={c.id} className="space-y-1 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{jobTitle(c)}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      JOB_STATUS_TONE[c.status] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                {target && (
                  <p className="truncate font-mono text-xs text-muted-foreground">{target}</p>
                )}
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    queued <RelativeTime date={c.created_at} className="text-xs" />
                  </span>
                  {c.started_at && c.completed_at && (
                    <span className="tabular-nums">
                      took{' '}
                      {formatDurationShort(
                        (new Date(c.completed_at).getTime() - new Date(c.started_at).getTime()) /
                          1000
                      )}
                    </span>
                  )}
                  {c.error_message && <span className="text-destructive">{c.error_message}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The drawer
// ---------------------------------------------------------------------------

/**
 * The sensor drawer. Read top to bottom: its state and why (a callout naming
 * each problem with its fix), the headline numbers, what it can do (tools,
 * capacity, scanner content), what it did (recent activity), then how it
 * connects and who it is. Jobs, Activity and the install commands are tabs.
 * It re-reads GET /sensors/{id} every 15s while open. Key and lifecycle
 * actions (rotate, disable, revoke, delete) are admin actions in the ⋯ menu:
 * sensors:write and sensors:delete, held by admins and owners only since
 * api#669; revoke and delete are confirmed by the page.
 */
export function SensorDetailSheet({
  sensor: sensorProp,
  open,
  onOpenChange,
  onEdit,
  onRegenerateKey,
  onDelete,
  onActivate,
  onDeactivate,
  onRevoke,
  thresholds,
  channel,
  zones,
  fleet,
}: SensorDetailSheetProps) {
  const { data: live } = useSensor(open && sensorProp ? sensorProp.id : null, {
    refreshInterval: SENSOR_REFRESH_MS,
  })
  const now = useNow()
  const router = useRouter()
  // Phones get a bottom sheet, larger screens the side drawer.
  const isPhone = useIsMobile()
  const canWrite = useHasPermission(Permission.SensorsWrite)
  const canDelete = useHasPermission(Permission.SensorsDelete)
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [shownId, setShownId] = useState<string | null>(null)
  if (sensorProp && sensorProp.id !== shownId) {
    // Another sensor: start on its overview.
    setShownId(sensorProp.id)
    setTab('overview')
  }
  if (!sensorProp) return null
  const sensor = live && live.id === sensorProp.id ? live : sensorProp

  const checks = sensorHealthChecks(sensor, {
    now,
    thresholds,
    channel: channel ?? {},
    zones,
    fleet,
    protocolV2Version: PROTOCOL_V2_SENSOR_VERSION,
    protocolV1Sunset: PROTOCOL_V1_SUNSET,
  })
  const issues = sensorHealthIssues(sensor, checks, now, thresholds)
  const handleAction = (action: HealthCheckAction) => {
    if (action === 'rotate_key') onRegenerateKey(sensor)
    else if (action === 'edit') onEdit(sensor)
    else if (action === 'install') setTab('config')
    else if (action === 'zones') {
      onOpenChange(false)
      router.push('/sensors?tab=zones')
    }
  }

  const oneShot = isOneShotSensor(sensor)
  const role = sensorRoleOf(sensor.type) === 'collector' ? 'Collector' : 'Scanner'
  const mode = oneShot ? 'CI (one-shot)' : 'Long-running'
  const zoneNames = (zones ?? []).filter((z) => z.sensor_ids.includes(sensor.id)).map((z) => z.name)
  // The subline: what it is and where it runs. The host name only when it
  // says something the name does not.
  const subline = [
    `${role} · ${mode.toLowerCase()}`,
    sensor.hostname && sensor.hostname !== sensor.name ? sensor.hostname : null,
    sensor.ip_address ?? null,
    zoneNames.length > 0 ? `zone ${zoneNames.join(', ')}` : null,
  ].filter((p): p is string => !!p)

  const pad = isPhone ? 'px-4' : 'px-5'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isPhone ? 'bottom' : 'right'}
        className={cn(
          'flex w-full flex-col gap-0 overflow-hidden p-0 [&>button]:hidden',
          isPhone ? 'max-h-[92svh] rounded-t-2xl' : 'sm:max-w-xl'
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isPhone && (
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" />
        )}
        {/* Header: who, state, the two everyday actions, the tabs. It stays
            put while the body scrolls. */}
        <div className={cn('shrink-0 border-b pt-4', pad)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <SheetTitle className="min-w-0 truncate text-lg leading-tight font-semibold">
                  {sensor.name}
                </SheetTitle>
                <SensorStateBadge sensor={sensor} now={now} thresholds={thresholds} />
                {sensor.is_platform_sensor && <SensorTag>Platform</SensorTag>}
                <ProtocolTag sensor={sensor} />
              </div>
              <SheetDescription className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
                {subline.join(' · ')}
              </SheetDescription>
            </div>
            <div className="-me-2 flex shrink-0 items-center">
              {(canWrite || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canWrite && (
                      <DropdownMenuItem onClick={() => onRegenerateKey(sensor)}>
                        <KeyRound className="h-4 w-4" />
                        Rotate key
                      </DropdownMenuItem>
                    )}
                    {canWrite && sensor.status === 'active' && onDeactivate && (
                      <DropdownMenuItem onClick={() => onDeactivate(sensor)}>
                        <PowerOff className="h-4 w-4" />
                        Disable
                      </DropdownMenuItem>
                    )}
                    {canWrite && sensor.status !== 'active' && onActivate && (
                      <DropdownMenuItem onClick={() => onActivate(sensor)}>
                        <Power className="h-4 w-4" />
                        Enable
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        {sensor.status !== 'revoked' && onRevoke && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onRevoke(sensor)}
                          >
                            <ShieldOff className="h-4 w-4" />
                            Revoke access
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            onDelete(sensor)
                            onOpenChange(false)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canWrite && (
              <Button size="sm" onClick={() => onEdit(sensor)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setTab('config')}>
              <Terminal className="h-4 w-4" />
              Install command
            </Button>
            {!canWrite && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden />
                Editing, keys and disabling need an admin
              </span>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as DrawerTab)} className="mt-3">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body */}
        <div
          className={cn('min-h-0 flex-1 overflow-y-auto pt-4 pb-6', pad)}
          role="tabpanel"
          aria-label={tab}
        >
          {tab === 'overview' && (
            <div className="space-y-5">
              <HealthSummary
                sensor={sensor}
                issues={issues}
                checks={checks}
                canManage={canWrite}
                onAction={handleAction}
                onActivity={() => setTab('activity')}
              />

              <SensorStats sensor={sensor} now={now} thresholds={thresholds} />

              <DetailSections>
                {(!oneShot || sensorToolRows(sensor).length > 0) && (
                  <ToolsAndCapacity sensor={sensor} now={now} thresholds={thresholds} />
                )}
                {(sensor.content?.length ?? 0) > 0 && (
                  <SensorContentSection sensor={sensor} now={now} canManage={canWrite} />
                )}
                <SensorRecentActivity sensorId={sensor.id} onAll={() => setTab('activity')} />
                <ConnectionAndIdentity
                  sensor={sensor}
                  now={now}
                  channel={channel}
                  zoneNames={zoneNames}
                />
              </DetailSections>
            </div>
          )}

          {tab === 'jobs' && <SensorJobs sensor={sensor} />}

          {tab === 'activity' && <SensorActivity sensorId={sensor.id} />}

          {tab === 'config' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Run one of these on the host that should scan. The key is shown only when it is
                issued, so the commands read it from{' '}
                <span className="font-mono">OPENCTEM_API_KEY</span>.
                {canWrite ? ' Rotate the key (⋯ menu) to get a new one.' : ''}
              </p>
              <SensorInstallSnippets sensorId={sensor.id} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

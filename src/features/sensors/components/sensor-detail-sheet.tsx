'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Copy,
  Info,
  KeyRound,
  Lock,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  ShieldOff,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { EmptyState, RelativeTime } from '@/features/shared'
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
import { SensorContentSection } from './sensor-content-section'
import { SensorStateBadge } from './sensor-state-badge'
import {
  ProtocolTag,
  PROTOCOL_V1_SUNSET,
  PROTOCOL_V2_SENSOR_VERSION,
  SensorToolList,
  SensorVersionCell,
} from './sensor-cells'
import { SensorInstallSnippets } from './sensor-install-snippets'
import { SENSOR_TYPE_LABELS } from './sensor-type-icon'
import {
  capacityLabel,
  hasReportedTools,
  sensorCapacity,
  sensorToolRows,
} from '../lib/capabilities'
import { formatDurationShort } from '../lib/format'
import type { ReleaseChannel } from '../lib/fleet'
import {
  sensorHealthChecks,
  type HealthCheck,
  type HealthCheckAction,
  type HealthCheckStatus,
} from '../lib/health-checks'
import { isOneShotSensor, type FleetThresholds } from '../lib/sensor-state'

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

const CHECK_ICON: Record<HealthCheckStatus, { icon: typeof CheckCircle2; className: string }> = {
  ok: { icon: CheckCircle2, className: 'text-success' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  critical: { icon: CircleAlert, className: 'text-destructive' },
  info: { icon: Info, className: 'text-muted-foreground' },
}

const ACTION_LABEL: Record<HealthCheckAction, string> = {
  rotate_key: 'Rotate key',
  install: 'Install command',
  edit: 'Edit',
  zones: 'Zones',
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
            <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
              {c.aside}
            </span>
          ) : null
        return (
          <li
            key={c.key}
            className="flex items-start gap-2.5 px-3 py-2.5 text-sm"
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

function Kv({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

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
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {isOneShotSensor(sensor)
          ? 'A CI sensor runs its own scans.'
          : `${sensor.current_jobs ?? 0} running of ${sensorCapacity(sensor).effective} slots (${capacityLabel(sensor)}).`}{' '}
        {sensor.total_scans.toLocaleString()} scans, {sensor.total_findings.toLocaleString()}{' '}
        findings in total.
      </p>
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
                    <span>
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

/**
 * The sensor drawer (mockup frame B): a health checklist with fix actions, the
 * runtime facts, recent activity, then Jobs, Activity and the install commands.
 * It re-reads GET /sensors/{id} every 15s while open. Key and lifecycle
 * actions (rotate, disable, revoke, delete) are admin actions: sensors:write
 * and sensors:delete, held by admins and owners only since api#669.
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
  // Phones get a bottom sheet (mockup frame D), larger screens the side drawer.
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
  const handleAction = (action: HealthCheckAction) => {
    if (action === 'rotate_key') onRegenerateKey(sensor)
    else if (action === 'edit') onEdit(sensor)
    else if (action === 'install') setTab('config')
    else if (action === 'zones') {
      onOpenChange(false)
      router.push('/sensors?tab=zones')
    }
  }

  const role = sensorRoleOf(sensor.type) === 'collector' ? 'Collector' : 'Scanner'
  const mode = isOneShotSensor(sensor) ? 'CI (one-shot)' : 'long-running'
  const myZones = (zones ?? []).filter((z) => z.sensor_ids.includes(sensor.id))
  const labels = Object.entries(sensor.labels ?? {})
  const protocolV1 =
    !!sensor.protocol && (sensor.protocol.deprecated || sensor.protocol.version < 2)

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
        {/* Header */}
        <div className="space-y-3 border-b px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-semibold">{sensor.name}</SheetTitle>
              <SheetDescription asChild>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {role} · {mode}
                  </span>
                  {sensor.hostname && <span className="font-mono">{sensor.hostname}</span>}
                  {sensor.ip_address && <span className="font-mono">{sensor.ip_address}</span>}
                  {myZones.length > 0 && <span>zone {myZones.map((z) => z.name).join(', ')}</span>}
                  <ProtocolTag sensor={sensor} />
                </div>
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SensorStateBadge sensor={sensor} now={now} thresholds={thresholds} />
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
                  <DropdownMenuContent align="end">
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

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setTab('config')}>
              <Terminal className="h-4 w-4" />
              Install command
            </Button>
            {canWrite ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onRegenerateKey(sensor)}>
                  <KeyRound className="h-4 w-4" />
                  Rotate key
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(sensor)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden />
                Editing, keys and disabling need an admin
              </span>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as DrawerTab)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" role="tabpanel">
          {tab === 'overview' && (
            <div className="space-y-5">
              <section>
                <h3 className="text-sm font-semibold">Health</h3>
                <div className="mt-2">
                  <HealthChecklist checks={checks} canManage={canWrite} onAction={handleAction} />
                </div>
              </section>

              <SensorContentSection sensor={sensor} now={now} canManage={canWrite} />

              <section>
                <h3 className="text-sm font-semibold">Runtime</h3>
                <dl className="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  <Kv label="Version">
                    <SensorVersionCell
                      sensor={sensor}
                      latest={channel?.latest}
                      min={channel?.min}
                      sdkLatest={channel?.sdkLatest}
                      sdkMin={channel?.sdkMin}
                    />
                  </Kv>
                  <Kv label="Jobs">
                    <span className="tabular-nums">
                      {isOneShotSensor(sensor)
                        ? 'one-shot CI runs'
                        : `${sensor.current_jobs ?? 0} running · ${sensorCapacity(sensor).effective} slots (${capacityLabel(sensor)})`}
                      {' · '}
                      {sensor.total_scans.toLocaleString()} scans,{' '}
                      {sensor.total_findings.toLocaleString()} findings in total
                    </span>
                  </Kv>
                  {!isOneShotSensor(sensor) && (
                    <Kv label="Tools">
                      <SensorToolList rows={sensorToolRows(sensor)} />
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {hasReportedTools(sensor)
                          ? `As the sensor reported${sensor.reported?.os ? ` (${sensor.reported.os}/${sensor.reported.arch ?? ''})` : ''}; scans go only to tools it has installed and its limit allows.`
                          : 'Set on the sensor; the sensor has not reported its tools.'}
                      </span>
                    </Kv>
                  )}
                  {sensor.protocol && (
                    <Kv label="Protocol">
                      {protocolV1 ? (
                        <span className="text-warning">
                          Protocol v{sensor.protocol.version}, deprecated: upgrade the sensor to{' '}
                          {PROTOCOL_V2_SENSOR_VERSION} before {PROTOCOL_V1_SUNSET}
                        </span>
                      ) : (
                        <span>Protocol v{sensor.protocol.version}</span>
                      )}
                      {sensor.protocol.user_agent && (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {sensor.protocol.user_agent}
                        </span>
                      )}
                    </Kv>
                  )}
                  <Kv label="Key">
                    <span className="font-mono">{sensor.api_key_prefix}…</span>
                  </Kv>
                  {sensor.ip_address && (
                    <Kv label="Address seen">
                      <span className="font-mono">{sensor.ip_address}</span>
                    </Kv>
                  )}
                  {sensor.started_at && (
                    <Kv label="Started">
                      <RelativeTime date={sensor.started_at} className="text-foreground" />
                    </Kv>
                  )}
                  {sensor.last_offline_at && (
                    <Kv label="Last offline">
                      <RelativeTime date={sensor.last_offline_at} className="text-foreground" />
                    </Kv>
                  )}
                  <Kv label="Type">{SENSOR_TYPE_LABELS[sensor.type] ?? sensor.type}</Kv>
                  <Kv label="Created">
                    <RelativeTime date={sensor.created_at} className="text-foreground" />
                  </Kv>
                  {labels.length > 0 && (
                    <Kv label="Labels">
                      <span className="flex flex-wrap gap-1">
                        {labels.map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="font-normal">
                            {k}={String(v)}
                          </Badge>
                        ))}
                      </span>
                    </Kv>
                  )}
                  {sensor.description && <Kv label="Description">{sensor.description}</Kv>}
                  <Kv label="ID">
                    <button
                      type="button"
                      className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        copyToClipboard(sensor.id)
                        toast.success('Sensor ID copied')
                      }}
                    >
                      <span className="truncate">{sensor.id}</span>
                      <Copy className="h-3 w-3 shrink-0" aria-hidden />
                    </button>
                  </Kv>
                </dl>
              </section>

              <SensorRecentActivity sensorId={sensor.id} onAll={() => setTab('activity')} />
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
                {canWrite ? ' Rotate the key to get a new one.' : ''}
              </p>
              <SensorInstallSnippets sensorId={sensor.id} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

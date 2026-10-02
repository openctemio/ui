'use client'

import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { SheetDetailToolbar, DangerZone, DangerZoneItem } from '@/features/shared'
import {
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  AlertCircle,
  Activity,
  AlertTriangle,
  FileCode,
  Server,
  Play,
  Power,
  PowerOff,
  History,
} from 'lucide-react'

import type { Sensor } from '@/lib/api/sensor-types'
import { CapabilityBadge } from '@/components/capability-badge'
import { SensorTypeIcon, SENSOR_TYPE_LABELS, SENSOR_TYPE_COLORS } from './sensor-type-icon'
import { SensorAuditLog } from './sensor-audit-log'
import { SensorStateBadge } from './sensor-state-badge'
import { Can, Permission } from '@/lib/permissions'
import { SensorZonesSection } from '@/features/scan-zones'
import { useSensor, SENSOR_REFRESH_MS } from '@/lib/api/sensor-hooks'
import { useNow } from '@/hooks/use-now'
import { normalizeSensorVersion } from '../lib/sensor-version'
import { sensorState, type FleetThresholds } from '../lib/sensor-state'

interface SensorDetailSheetProps {
  sensor: Sensor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (sensor: Sensor) => void
  onRegenerateKey: (sensor: Sensor) => void
  onViewConfig: (sensor: Sensor) => void
  onDelete: (sensor: Sensor) => void
  onActivate?: (sensor: Sensor) => void
  onDeactivate?: (sensor: Sensor) => void
  onRevoke?: (sensor: Sensor) => void
  /** State ladder thresholds from GET /sensors/stats. */
  thresholds?: FleetThresholds
}

export function SensorDetailSheet({
  sensor: sensorProp,
  open,
  onOpenChange,
  onEdit,
  onRegenerateKey,
  onViewConfig,
  onDelete,
  onActivate,
  onDeactivate,
  onRevoke,
  thresholds,
}: SensorDetailSheetProps) {
  // Re-read the sensor while the drawer is open (every 15s) so it follows the
  // sensor instead of showing the row as it was when it was clicked.
  const { data: live } = useSensor(open && sensorProp ? sensorProp.id : null, {
    refreshInterval: SENSOR_REFRESH_MS,
  })
  const now = useNow()
  if (!sensorProp) return null
  const sensor = live && live.id === sensorProp.id ? live : sensorProp

  const isDaemon = sensor.execution_mode === 'daemon'
  const state = sensorState(sensor, now, thresholds)
  // Header tint follows the state, with theme tokens only.
  const gradientClass =
    state === 'online'
      ? 'from-success/15 via-success/5'
      : state === 'offline'
        ? 'from-destructive/15 via-destructive/5'
        : state === 'degraded' || state === 'stale'
          ? 'from-warning/15 via-warning/5'
          : 'from-muted via-muted/40'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto p-0 sm:max-w-xl [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Sensor Details</SheetTitle>
        </VisuallyHidden>

        {/* Toolbar */}
        <TooltipProvider>
          <SheetDetailToolbar
            title="Sensor Details"
            onClose={() => onOpenChange(false)}
            onEdit={() => onEdit(sensor)}
            onCopyId={() => {
              copyToClipboard(sensor.id)
              toast.success('Sensor ID copied')
            }}
            className={`bg-gradient-to-br ${gradientClass} to-transparent`}
          />
        </TooltipProvider>

        {/* Header */}
        <div className={`bg-gradient-to-br px-6 pb-4 ${gradientClass} to-transparent`}>
          <div className="mb-3 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${SENSOR_TYPE_COLORS[sensor.type]}`}
            >
              <SensorTypeIcon type={sensor.type} className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{sensor.name}</h2>
              <p className="text-sm text-muted-foreground">
                {sensor.description || SENSOR_TYPE_LABELS[sensor.type]}
              </p>
            </div>
            <SensorStateBadge sensor={sensor} now={now} thresholds={thresholds} />
          </div>

          {/* Execution Mode Badge */}
          <div className="mb-4 flex items-center gap-2">
            {isDaemon ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                <Server className="me-1 h-3 w-3" />
                Daemon Mode
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                <Play className="me-1 h-3 w-3" />
                Standalone Mode
              </Badge>
            )}
            <Badge variant="outline">{SENSOR_TYPE_LABELS[sensor.type]}</Badge>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Can permission={Permission.SensorsWrite}>
              <Button size="sm" variant="secondary" onClick={() => onEdit(sensor)}>
                <Settings className="me-2 h-4 w-4" />
                Edit
              </Button>
            </Can>
            <Button size="sm" variant="outline" onClick={() => onViewConfig(sensor)}>
              <FileCode className="me-2 h-4 w-4" />
              View Config
            </Button>
            <Can permission={Permission.SensorsWrite}>
              <Button size="sm" variant="outline" onClick={() => onRegenerateKey(sensor)}>
                <KeyRound className="me-2 h-4 w-4" />
                Regenerate Key
              </Button>
              {(sensor.status === 'disabled' || sensor.status === 'revoked') && onActivate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                  onClick={() => onActivate(sensor)}
                >
                  <Power className="me-2 h-4 w-4" />
                  Activate
                </Button>
              )}
              {sensor.status === 'active' && onDeactivate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => onDeactivate(sensor)}
                >
                  <PowerOff className="me-2 h-4 w-4" />
                  Deactivate
                </Button>
              )}
            </Can>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="overview" className="px-6 pb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="activity">
              <History className="me-1 h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center">
                <Activity className="mx-auto mb-2 h-5 w-5 text-blue-500" />
                <p className="text-2xl font-bold">{sensor.total_scans.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <AlertTriangle
                  className={`mx-auto mb-2 h-5 w-5 ${
                    sensor.total_findings > 0 ? 'text-warning' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-2xl font-bold">{sensor.total_findings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Findings</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <AlertCircle
                  className={`mx-auto mb-2 h-5 w-5 ${
                    sensor.error_count > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-2xl font-bold">{sensor.error_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* Tools */}
            {(sensor.tools?.length ?? 0) > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h4 className="mb-2 text-sm font-medium">Tools</h4>
                <div className="flex flex-wrap gap-1">
                  {(sensor.tools ?? []).map((tool) => (
                    <Badge key={tool} variant="secondary">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Scan zones this sensor serves (RFC-023) */}
            <SensorZonesSection sensorId={sensor.id} />

            {/* Labels */}
            {sensor.labels && Object.keys(sensor.labels).length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h4 className="mb-2 text-sm font-medium">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(sensor.labels).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            {sensor.status_message && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h4 className="mb-1 text-sm font-medium text-amber-500">Status Message</h4>
                <p className="text-sm text-muted-foreground">{sensor.status_message}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="capabilities" className="mt-0 space-y-4">
            {/* Capabilities */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 text-sm font-medium">Capabilities</h4>
              {(sensor.capabilities?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {(sensor.capabilities ?? []).map((cap) => (
                    <div key={cap} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <CapabilityBadge name={cap} showIcon />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No capabilities configured</p>
              )}
            </div>

            {/* API Key */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-2 text-sm font-medium">API Key</h4>
              <div className="flex items-center justify-between">
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  {sensor.api_key_prefix}...
                </code>
                <Can permission={Permission.SensorsWrite}>
                  <Button size="sm" variant="outline" onClick={() => onRegenerateKey(sensor)}>
                    <KeyRound className="me-2 h-3 w-3" />
                    Regenerate
                  </Button>
                </Can>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" />
                Activity Log
              </h4>
              <SensorAuditLog sensorId={sensor.id} />
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-0 space-y-4">
            {/* Sensor Information */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 text-sm font-medium">Sensor Information</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline">{SENSOR_TYPE_LABELS[sensor.type]}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Execution Mode</span>
                  <span className="text-sm">
                    {sensor.execution_mode === 'daemon' ? 'Daemon' : 'Standalone'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="font-mono text-sm">
                    {normalizeSensorVersion(sensor.version) ?? 'Not reported'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hostname</span>
                  <span className="text-sm">{sensor.hostname || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm text-muted-foreground"
                    title="The address the platform sees the sensor connect from"
                  >
                    IP Address
                  </span>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {sensor.ip_address || 'N/A'}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Seen</span>
                  <span className="text-sm">
                    {sensor.last_seen_at ? new Date(sensor.last_seen_at).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {new Date(sensor.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Can permission={Permission.SensorsDelete}>
              <DangerZone as="h3">
                {sensor.status !== 'revoked' && onRevoke && (
                  <DangerZoneItem
                    title="Revoke access"
                    description="The sensor can no longer authenticate. It stays listed."
                    action={
                      <Button variant="outline" size="sm" onClick={() => onRevoke(sensor)}>
                        <AlertCircle className="me-2 h-4 w-4" />
                        Revoke access
                      </Button>
                    }
                  />
                )}
                <DangerZoneItem
                  title="Delete sensor"
                  description="Permanently delete this sensor and invalidate its API key."
                  action={
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onDelete(sensor)
                        onOpenChange(false)
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      Delete sensor
                    </Button>
                  }
                />
              </DangerZone>
            </Can>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { SheetDetailToolbar } from '@/features/shared'
import {
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  AlertTriangle,
  FileCode,
  Server,
  Play,
  Power,
  PowerOff,
  History,
  BarChart3,
} from 'lucide-react'

import type { Sensor } from '@/lib/api/sensor-types'
import { CapabilityBadge } from '@/components/capability-badge'
import { SensorTypeIcon, SENSOR_TYPE_LABELS, SENSOR_TYPE_COLORS } from './sensor-type-icon'
import { SensorAuditLog } from './sensor-audit-log'
import { SensorAnalytics } from './sensor-analytics'
import { Can, Permission } from '@/lib/permissions'

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
}

// Status config for admin-controlled status (active, disabled, revoked)
const statusConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  active: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Active',
  },
  disabled: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Disabled',
  },
  revoked: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    label: 'Revoked',
  },
}

// Health config for heartbeat-based health (online, offline, error, unknown)
const healthConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  online: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Online',
  },
  offline: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Offline',
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Error',
  },
  unknown: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    label: 'Unknown',
  },
}

export function SensorDetailSheet({
  sensor,
  open,
  onOpenChange,
  onEdit,
  onRegenerateKey,
  onViewConfig,
  onDelete,
  onActivate,
  onDeactivate,
  onRevoke,
}: SensorDetailSheetProps) {
  if (!sensor) return null

  // Use health for display when sensor is active, otherwise show admin status
  const displayHealth =
    sensor.status === 'active'
      ? healthConfig[sensor.health] || healthConfig.unknown
      : statusConfig[sensor.status] || statusConfig.disabled
  const isDaemon = sensor.execution_mode === 'daemon'

  // Gradient based on health (for active sensors) or status
  const gradientClass =
    sensor.status !== 'active'
      ? 'from-gray-500/20 via-gray-500/10'
      : sensor.health === 'online'
        ? 'from-green-500/20 via-green-500/10'
        : sensor.health === 'error'
          ? 'from-red-500/20 via-red-500/10'
          : 'from-gray-500/20 via-gray-500/10'

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
            <Badge className={`${displayHealth.bgColor} text-white gap-1`}>
              {displayHealth.icon}
              {displayHealth.label}
            </Badge>
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
            <TabsTrigger value="analytics">
              <BarChart3 className="me-1 h-3 w-3" />
              Analytics
            </TabsTrigger>
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
                    sensor.total_findings > 0 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-2xl font-bold">{sensor.total_findings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Findings</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <AlertCircle
                  className={`mx-auto mb-2 h-5 w-5 ${
                    sensor.error_count > 0 ? 'text-red-500' : 'text-muted-foreground'
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

          <TabsContent value="analytics" className="mt-0">
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Session Analytics (Last 30 Days)
              </h4>
              <SensorAnalytics sensorId={sensor.id} />
            </div>
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
                  <span className="font-mono text-sm">{sensor.version || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hostname</span>
                  <span className="text-sm">{sensor.hostname || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">IP Address</span>
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

            {/* Danger Zone */}
            <Can permission={Permission.SensorsDelete}>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <h4 className="mb-2 text-sm font-medium text-red-500">Danger Zone</h4>
                <div className="space-y-3">
                  {/* Revoke - only show if not already revoked */}
                  {sensor.status !== 'revoked' && onRevoke && (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Permanently revoke this sensor&apos;s access. The sensor will not be able to
                        authenticate.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => onRevoke(sensor)}
                      >
                        <AlertCircle className="me-2 h-4 w-4" />
                        Revoke Access
                      </Button>
                    </div>
                  )}

                  {/* Delete */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Permanently delete this sensor and invalidate its API key.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDelete(sensor)
                        onOpenChange(false)
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      Delete Sensor
                    </Button>
                  </div>
                </div>
              </div>
            </Can>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

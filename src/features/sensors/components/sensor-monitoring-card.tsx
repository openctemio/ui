'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  MoreHorizontal,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Sensor } from '@/lib/api/sensor-types'
import { SensorTypeIcon, SENSOR_TYPE_COLORS } from './sensor-type-icon'

interface SensorMonitoringCardProps {
  sensor: Sensor
  onEdit: (sensor: Sensor) => void
  onViewConfig: (sensor: Sensor) => void
  onActivate: (sensor: Sensor) => void
  onDeactivate: (sensor: Sensor) => void
  onViewDetails: (sensor: Sensor) => void
}

// Note: Online status now comes from the health field in Sensor type
// The backend tracks heartbeat and sets health = 'online' | 'offline' | 'error' | 'unknown'

// Format uptime from last_seen_at
function formatUptime(lastSeenAt?: string): string {
  if (!lastSeenAt) return '—'
  const lastSeen = new Date(lastSeenAt)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()

  if (diffMs < 60000) return 'Just now'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
  return `${Math.floor(diffMs / 86400000)}d ago`
}

export function SensorMonitoringCard({
  sensor,
  onEdit,
  onViewConfig,
  onActivate,
  onDeactivate,
  onViewDetails,
}: SensorMonitoringCardProps) {
  // Use health field from backend (heartbeat-based)
  const isOnline = sensor.status === 'active' && sensor.health === 'online'
  const isActive = sensor.status === 'active'
  const hasError = sensor.health === 'error'

  // Mock metrics - will be replaced when backend supports
  // These could come from sensor.metadata or a separate metrics endpoint
  // Using deterministic hash based on sensor ID for consistent display
  const hash = sensor.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const metrics = {
    cpu: (hash % 60) + 20,
    memory: (hash % 50) + 30,
    activeJobs: sensor.status === 'active' ? (hash % 5) + 1 : 0,
  }

  return (
    <Card
      className={cn(
        'transition-all hover:border-primary/50 cursor-pointer',
        isOnline && 'border-green-500/30',
        !isOnline && sensor.status === 'active' && !hasError && 'border-warning/30',
        sensor.status === 'disabled' && 'border-border opacity-75',
        hasError && 'border-red-500/30'
      )}
      onClick={() => onViewDetails(sensor)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  SENSOR_TYPE_COLORS[sensor.type]
                )}
              >
                <SensorTypeIcon type={sensor.type} className="h-5 w-5" />
              </div>
              {/* Online indicator */}
              <div
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
              />
            </div>
            <div>
              <h3 className="font-medium text-sm">{sensor.name}</h3>
              <p className="text-xs text-muted-foreground">
                {sensor.hostname || sensor.ip_address || 'No host info'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onViewDetails(sensor)}>
                <Activity className="me-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(sensor)}>
                <Settings className="me-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewConfig(sensor)}>
                <Settings className="me-2 h-4 w-4" />
                View Config
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sensor.status === 'disabled' || sensor.status === 'revoked' ? (
                <DropdownMenuItem onClick={() => onActivate(sensor)} className="text-success">
                  <Power className="me-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              ) : sensor.status === 'active' ? (
                <DropdownMenuItem onClick={() => onDeactivate(sensor)} className="text-warning">
                  <PowerOff className="me-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              isOnline ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
            )}
          >
            {isOnline ? (
              <CheckCircle className="me-1 h-3 w-3" />
            ) : (
              <XCircle className="me-1 h-3 w-3" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>

          {metrics.activeJobs > 0 && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-xs">
              <Activity className="me-1 h-3 w-3" />
              {metrics.activeJobs} jobs
            </Badge>
          )}

          {sensor.error_count > 0 && (
            <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-xs">
              <AlertTriangle className="me-1 h-3 w-3" />
              {sensor.error_count}
            </Badge>
          )}
        </div>

        {/* Metrics - Only show if online */}
        {isOnline && isActive && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <Progress
                  value={metrics.cpu}
                  className={cn(
                    'h-1.5',
                    metrics.cpu > 80 && '[&>div]:bg-red-500',
                    metrics.cpu > 60 && metrics.cpu <= 80 && '[&>div]:bg-yellow-500'
                  )}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-end">{metrics.cpu}%</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <Progress
                  value={metrics.memory}
                  className={cn(
                    'h-1.5',
                    metrics.memory > 80 && '[&>div]:bg-red-500',
                    metrics.memory > 60 && metrics.memory <= 80 && '[&>div]:bg-yellow-500'
                  )}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-end">{metrics.memory}%</span>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {sensor.total_scans.toLocaleString()} scans
                </span>
              </TooltipTrigger>
              <TooltipContent>Total scans completed</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatUptime(sensor.last_seen_at)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Last seen:{' '}
                {sensor.last_seen_at ? new Date(sensor.last_seen_at).toLocaleString() : 'Never'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  Check,
  X,
  Clock,
  AlertTriangle,
  TrendingUp,
  AlertOctagon,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { SyncStatus, ThreatIntelSource } from '@/lib/api/threatintel-types'
import { triggerSync, setSyncEnabled } from '../hooks/use-threat-intel'
import { getErrorMessage } from '@/lib/api/error-handler'

interface SyncStatusManagerProps {
  statuses: SyncStatus[]
  onRefresh?: () => void
  className?: string
}

const sourceConfig: Record<
  ThreatIntelSource,
  {
    name: string
    description: string
    icon: typeof TrendingUp
    color: string
  }
> = {
  epss: {
    name: 'EPSS',
    description: 'Exploit Prediction Scoring System - Daily exploitation probability scores',
    icon: TrendingUp,
    color: 'text-orange-500',
  },
  kev: {
    name: 'CISA KEV',
    description: "Known Exploited Vulnerabilities - CISA's actively exploited CVE catalog",
    icon: AlertOctagon,
    color: 'text-red-500',
  },
}

/**
 * Sync Status Manager - Control panel for threat intel data sync
 */
export function SyncStatusManager({ statuses, onRefresh, className }: SyncStatusManagerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Data Sync Status</CardTitle>
            <CardDescription>Manage threat intelligence data synchronization</CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((status) => (
          <SyncStatusCard key={status.source} status={status} onUpdate={onRefresh} />
        ))}
        {statuses.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">No sync sources configured</div>
        )}
      </CardContent>
    </Card>
  )
}

interface SyncStatusCardProps {
  status: SyncStatus
  onUpdate?: () => void
}

function SyncStatusCard({ status, onUpdate }: SyncStatusCardProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const config = sourceConfig[status.source]
  const Icon = config.icon

  const handleToggleEnabled = async () => {
    setIsToggling(true)
    try {
      await setSyncEnabled(status.source, !status.enabled)
      toast.success(`${config.name} sync ${!status.enabled ? 'enabled' : 'disabled'}`)
      onUpdate?.()
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          `Failed to ${!status.enabled ? 'enable' : 'disable'} ${config.name} sync`
        )
      )
      console.error(error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleTriggerSync = async () => {
    setIsSyncing(true)
    try {
      await triggerSync(status.source)
      toast.success(`${config.name} sync triggered`)
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to trigger ${config.name} sync`))
      console.error(error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      {/* Icon */}
      <div className={cn('p-2 rounded-lg bg-muted', config.color)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{config.name}</h4>
          <SyncStatusBadge status={status.last_sync_status} />
        </div>
        <p className="text-sm text-muted-foreground">{config.description}</p>

        {/* Sync details */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          {status.last_sync_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Last sync: {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true })}
              </span>
            </div>
          )}
          {status.records_synced > 0 && (
            <span>{status.records_synced.toLocaleString()} records</span>
          )}
          {status.next_sync_at && (
            <span>
              Next: {formatDistanceToNow(new Date(status.next_sync_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Error message */}
        {status.last_error && (
          <div className="flex items-start gap-2 mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{status.last_error}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerSync}
          disabled={isSyncing || !status.enabled}
        >
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Now
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {status.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={status.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isToggling}
          />
        </div>
      </div>
    </div>
  )
}

function SyncStatusBadge({ status }: { status: SyncStatus['last_sync_status'] }) {
  const config = {
    success: {
      label: 'Success',
      icon: Check,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    failed: {
      label: 'Failed',
      icon: X,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    never: {
      label: 'Never synced',
      icon: Clock,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    },
  }

  const { label, icon: BadgeIcon, className } = config[status]

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <BadgeIcon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

interface CompactSyncStatusProps {
  statuses: SyncStatus[]
  className?: string
}

/**
 * Compact Sync Status - Minimal display for dashboard headers
 */
export function CompactSyncStatus({ statuses, className }: CompactSyncStatusProps) {
  // Handle empty statuses
  if (!statuses || statuses.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">No sync data</span>
      </div>
    )
  }

  const anyFailed = statuses.some((s) => s.last_sync_status === 'failed')
  const anyPending = statuses.some((s) => s.last_sync_status === 'pending')

  let statusIcon = Check
  let statusColor = 'text-green-500'
  let statusLabel = 'All syncs healthy'

  if (anyFailed) {
    statusIcon = X
    statusColor = 'text-red-500'
    statusLabel = 'Sync failed'
  } else if (anyPending) {
    statusIcon = Clock
    statusColor = 'text-yellow-500'
    statusLabel = 'Sync pending'
  }

  const StatusIcon = statusIcon

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <StatusIcon className={cn('h-4 w-4', statusColor)} />
      <span className="text-muted-foreground">{statusLabel}</span>
      {statuses[0].last_sync_at && (
        <span className="text-xs text-muted-foreground">
          ({formatDistanceToNow(new Date(statuses[0].last_sync_at), { addSuffix: true })})
        </span>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/features/shared/components/empty-state'
import { RunStatusBadge } from '@/features/shared/components/run-status-badge'
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
  }
> = {
  epss: {
    name: 'EPSS',
    description: 'Exploit Prediction Scoring System — daily exploitation probability scores',
    icon: TrendingUp,
  },
  kev: {
    name: 'CISA KEV',
    description: "Known Exploited Vulnerabilities — CISA's actively exploited CVE catalog",
    icon: AlertOctagon,
  },
}

/**
 * Sync Status Manager - Control panel for threat intel data sync
 */
export function SyncStatusManager({ statuses, onRefresh, className }: SyncStatusManagerProps) {
  // One card, one row per source (divided) — not a bordered box per source
  // nested inside the card. No refresh button here: the page header has one.
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Data sync</CardTitle>
        <CardDescription>
          Turn each threat-intelligence feed on or off, or sync it now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statuses.length === 0 ? (
          <EmptyState
            card={false}
            icon={Clock}
            title="No sync sources"
            description="No threat-intelligence feeds are configured for sync."
          />
        ) : (
          <div className="divide-y">
            {statuses.map((status) => (
              <SyncStatusRow key={status.source} status={status} onUpdate={onRefresh} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SyncStatusRowProps {
  status: SyncStatus
  onUpdate?: () => void
}

function SyncStatusRow({ status, onUpdate }: SyncStatusRowProps) {
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
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{config.name}</h3>
          <SyncStatusBadge status={status.last_sync_status} />
        </div>
        <p className="text-sm text-muted-foreground">{config.description}</p>

        {/* Sync details */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
          <Alert variant="destructive" className="mt-2 py-2 text-xs">
            <AlertTriangle />
            <AlertDescription className="text-xs">{status.last_error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerSync}
          disabled={isSyncing || !status.enabled}
        >
          {isSyncing ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          Sync now
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
  // The canonical run-status badge covers every state but "never".
  if (status === 'never') return <Badge variant="secondary">Never synced</Badge>
  return <RunStatusBadge status={status === 'success' ? 'completed' : status} />
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

  // Only a failure is coloured; healthy and pending read as quiet status text.
  let statusIcon = Check
  let statusColor = 'text-muted-foreground'
  let statusLabel = 'All syncs healthy'

  if (anyFailed) {
    statusIcon = X
    statusColor = 'text-destructive'
    statusLabel = 'Sync failed'
  } else if (anyPending) {
    statusIcon = Clock
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

'use client'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clock,
  User,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  KeyRound,
  Power,
  PowerOff,
  Ban,
  Pencil,
  Plus,
  Trash,
  Wifi,
  WifiOff,
  Lock,
} from 'lucide-react'

import { useResourceAuditHistory } from '@/lib/api/audit-hooks'
import { useHasModule } from '@/features/integrations/api/use-tenant-modules'
import type { AuditLog, AuditAction, AuditResult } from '@/lib/api/audit-types'
import { getActionLabel, getSeverityColor, getResultColor } from '@/lib/api/audit-types'

interface AgentAuditLogProps {
  agentId: string
}

/**
 * Get icon for audit action
 */
function getActionIcon(action: AuditAction) {
  const iconMap: Partial<Record<AuditAction, React.ReactNode>> = {
    'agent.created': <Plus className="h-4 w-4" />,
    'agent.updated': <Pencil className="h-4 w-4" />,
    'agent.deleted': <Trash className="h-4 w-4" />,
    'agent.activated': <Power className="h-4 w-4" />,
    'agent.deactivated': <PowerOff className="h-4 w-4" />,
    'agent.revoked': <Ban className="h-4 w-4" />,
    'agent.key_regenerated': <KeyRound className="h-4 w-4" />,
    'agent.connected': <Wifi className="h-4 w-4" />,
    'agent.disconnected': <WifiOff className="h-4 w-4" />,
  }
  return iconMap[action] || <FileText className="h-4 w-4" />
}

/**
 * Get result icon
 */
function getResultIcon(result: AuditResult) {
  const iconMap: Record<AuditResult, React.ReactNode> = {
    success: <CheckCircle className="h-3 w-3" />,
    failure: <XCircle className="h-3 w-3" />,
    denied: <AlertTriangle className="h-3 w-3" />,
  }
  return iconMap[result]
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Single audit log entry
 */
function AuditLogEntry({ log }: { log: AuditLog }) {
  return (
    <div className="flex gap-3 border-b border-border/50 py-3 last:border-0">
      {/* Icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
        {getActionIcon(log.action)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Action and badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{getActionLabel(log.action)}</span>
          <Badge variant="outline" className={`text-xs ${getResultColor(log.result)}`}>
            {getResultIcon(log.result)}
            <span className="ml-1 capitalize">{log.result}</span>
          </Badge>
          {log.severity !== 'low' && (
            <Badge variant="outline" className={`text-xs ${getSeverityColor(log.severity)}`}>
              {log.severity}
            </Badge>
          )}
        </div>

        {/* Message */}
        {log.message && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{log.message}</p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {/* Actor */}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.actor_email || 'System'}
          </span>

          {/* IP if available */}
          {log.actor_ip && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {log.actor_ip}
            </span>
          )}

          {/* Timestamp */}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(log.timestamp)}
          </span>
        </div>

        {/* Changes if available */}
        {log.changes && (log.changes.before || log.changes.after) && (
          <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
            {log.changes.before && Object.keys(log.changes.before).length > 0 && (
              <div className="text-red-500/80">
                <span className="font-medium">-</span>{' '}
                {Object.entries(log.changes.before)
                  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                  .join(', ')}
              </div>
            )}
            {log.changes.after && Object.keys(log.changes.after).length > 0 && (
              <div className="text-green-500/80">
                <span className="font-medium">+</span>{' '}
                {Object.entries(log.changes.after)
                  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                  .join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Loading skeleton
 */
function AuditLogSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 py-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Agent Audit Log component
 * Displays audit history for a specific agent
 */
export function AgentAuditLog({ agentId }: AgentAuditLogProps) {
  const { hasModule: hasAuditModule, isLoading: moduleLoading } = useHasModule('audit')
  const { data, isLoading, error } = useResourceAuditHistory('agent', agentId, {
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  // Show loading skeleton while checking module availability
  if (moduleLoading || isLoading) {
    return <AuditLogSkeleton />
  }

  // Show upgrade prompt if audit module is not available
  if (!hasAuditModule) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Audit Log Not Available</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Upgrade your plan to access activity logs
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load audit logs</p>
      </div>
    )
  }

  if (!data?.items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No audit logs yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Activity will appear here when actions are performed
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-1">
        {data.items.map((log) => (
          <AuditLogEntry key={log.id} log={log} />
        ))}
      </div>
      {data.total > data.items.length && (
        <div className="text-center py-3 text-xs text-muted-foreground">
          Showing {data.items.length} of {data.total} entries
        </div>
      )}
    </ScrollArea>
  )
}

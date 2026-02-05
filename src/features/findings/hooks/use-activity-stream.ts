/**
 * Real-time Activity Stream Hook
 *
 * Connects to WebSocket for real-time activity updates.
 * Automatically merges new activities with existing data from useFindingActivitiesInfinite.
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTenant } from '@/context/tenant-provider'
import { useFindingChannel, type ConnectionState } from '@/hooks/use-websocket'
import type { Activity, ActivityType } from '../types'

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

/** WebSocket activity event structure from backend */
interface WSActivityEvent {
  type: 'activity_created'
  activity: {
    id: string
    finding_id: string
    tenant_id: string
    activity_type: string
    actor_id?: string
    actor_type: string
    actor_name?: string
    actor_email?: string
    changes?: Record<string, unknown>
    created_at: string
  }
}

/** Connection status for UI indicators */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'unsupported'

// ============================================
// MAPPERS
// ============================================

/**
 * Map activity type to frontend ActivityType
 */
function mapActivityType(apiType: string): ActivityType {
  const typeMap: Record<string, ActivityType> = {
    created: 'created',
    status_changed: 'status_changed',
    severity_changed: 'severity_changed',
    resolved: 'status_changed',
    reopened: 'reopened',
    assigned: 'assigned',
    unassigned: 'unassigned',
    triage_updated: 'status_changed',
    false_positive_marked: 'false_positive_marked',
    duplicate_marked: 'duplicate_marked',
    comment_added: 'comment',
    comment_updated: 'comment',
    comment_deleted: 'comment',
    scan_detected: 'created',
    auto_resolved: 'status_changed',
    auto_reopened: 'reopened',
    linked: 'linked',
    unlinked: 'linked',
    sla_warning: 'status_changed',
    sla_breach: 'status_changed',
    ai_triage: 'ai_triage',
    ai_triage_requested: 'ai_triage_requested',
    ai_triage_failed: 'ai_triage_failed',
  }
  return typeMap[apiType] || 'status_changed'
}

/**
 * Map WebSocket activity event to frontend Activity type
 */
function mapWSActivity(event: WSActivityEvent): Activity {
  const api = event.activity
  const actorType = api.actor_type

  const actor =
    actorType === 'system'
      ? ('system' as const)
      : actorType === 'ai'
        ? ('ai' as const)
        : {
            id: api.actor_id || 'unknown',
            name: api.actor_name || 'Unknown User',
            email: api.actor_email || '',
            role: 'analyst' as const,
          }

  // Extract values from changes JSONB
  const changes = api.changes || {}
  const previousValue = (changes.old_status as string) || (changes.old_severity as string)
  const newValue = (changes.new_status as string) || (changes.new_severity as string)
  const reason = changes.reason as string | undefined
  const content = (changes.content as string) || (changes.preview as string) || undefined

  // Extract assignment-related fields
  const assigneeName = changes.assignee_name as string | undefined
  const assigneeEmail = changes.assignee_email as string | undefined
  const assigneeId = changes.assignee_id as string | undefined
  const previousAssigneeName = changes.previous_assignee_name as string | undefined

  // Merge all changes into metadata
  const metadata = {
    ...changes,
    assigneeName,
    assigneeEmail,
    assigneeId,
    previousAssigneeName,
  }

  return {
    id: api.id,
    type: mapActivityType(api.activity_type),
    actor,
    content,
    metadata,
    previousValue,
    newValue,
    reason,
    createdAt: api.created_at,
  }
}

/**
 * Map WebSocket connection state to ConnectionStatus
 */
function mapConnectionState(state: ConnectionState): ConnectionStatus {
  switch (state) {
    case 'connecting':
    case 'reconnecting':
      return 'connecting'
    case 'connected':
      return 'connected'
    case 'disconnected':
      return 'disconnected'
    case 'error':
      return 'error'
    default:
      return 'disconnected'
  }
}

// ============================================
// HOOK
// ============================================

interface UseActivityStreamOptions {
  /** Whether to enable the WebSocket connection */
  enabled?: boolean
  /** Callback when a new activity is received */
  onActivity?: (activity: Activity) => void
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void
  /** Maximum reconnection attempts before giving up (handled by WebSocket client) */
  maxRetries?: number
  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: () => void
}

interface UseActivityStreamReturn {
  /** Real-time activities received via WebSocket (newest first) */
  realtimeActivities: Activity[]
  /** Current connection status */
  status: ConnectionStatus
  /** Reconnect to the stream */
  reconnect: () => void
  /** Clear real-time activities */
  clearActivities: () => void
}

/**
 * Hook to connect to real-time activity stream via WebSocket
 *
 * @example
 * ```tsx
 * const { realtimeActivities, status } = useActivityStream(findingId, {
 *   onActivity: (activity) => {
 *     // Optionally trigger SWR mutate to refresh the list
 *     mutateActivities()
 *   }
 * })
 *
 * // Merge with fetched activities (deduplication by ID)
 * const allActivities = useMemo(() => {
 *   const ids = new Set(realtimeActivities.map(a => a.id))
 *   return [
 *     ...realtimeActivities,
 *     ...fetchedActivities.filter(a => !ids.has(a.id))
 *   ]
 * }, [realtimeActivities, fetchedActivities])
 * ```
 */
export function useActivityStream(
  findingId: string | null,
  options: UseActivityStreamOptions = {}
): UseActivityStreamReturn {
  const { enabled = true, onActivity, onStatusChange } = options

  const { currentTenant } = useTenant()

  const [realtimeActivities, setRealtimeActivities] = useState<Activity[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const onActivityRef = useRef(onActivity)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep refs updated
  useEffect(() => {
    onActivityRef.current = onActivity
    onStatusChangeRef.current = onStatusChange
  }, [onActivity, onStatusChange])

  // Handle incoming activity event from WebSocket
  const handleActivityEvent = useCallback((data: WSActivityEvent) => {
    try {
      const activity = mapWSActivity(data)

      setRealtimeActivities((prev) => {
        // Avoid duplicates
        if (prev.some((a) => a.id === activity.id)) {
          return prev
        }
        // Add to front (newest first)
        return [activity, ...prev]
      })

      onActivityRef.current?.(activity)
    } catch (error) {
      console.error('[ActivityStream] Failed to parse activity event:', error)
    }
  }, [])

  // Use WebSocket channel for finding activities
  const { isSubscribed } = useFindingChannel<WSActivityEvent>(
    enabled && currentTenant ? findingId : null,
    {
      enabled: enabled && !!currentTenant,
      onData: handleActivityEvent,
    }
  )

  // Update status based on subscription state
  useEffect(() => {
    const newStatus: ConnectionStatus = isSubscribed ? 'connected' : 'connecting'
    setStatus(newStatus)
    onStatusChangeRef.current?.(newStatus)
  }, [isSubscribed])

  // Clear real-time activities
  const clearActivities = useCallback(() => {
    setRealtimeActivities([])
  }, [])

  // Reconnect function (WebSocket client handles reconnection automatically)
  const reconnect = useCallback(() => {
    // WebSocket client handles reconnection automatically
    // This is here for API compatibility
    console.log('[ActivityStream] Reconnect requested - WebSocket handles this automatically')
  }, [])

  // Clear activities when finding changes
  useEffect(() => {
    setRealtimeActivities([])
  }, [findingId])

  return {
    realtimeActivities,
    status,
    reconnect,
    clearActivities,
  }
}

// Re-export ConnectionStatus type and mapConnectionState for external use
export { mapConnectionState }

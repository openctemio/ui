/**
 * Notification Outbox Types
 *
 * Types for the notification outbox queue management.
 * Tenants can monitor and manage their notification delivery queue.
 */

/**
 * Outbox entry status
 */
export type OutboxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead'

/**
 * Outbox entry severity
 */
export type OutboxSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/**
 * Outbox entry response from API
 */
export interface OutboxEntry {
  id: string
  event_type: string
  aggregate_type: string
  aggregate_id?: string
  title: string
  body?: string
  severity: OutboxSeverity
  url?: string
  status: OutboxStatus
  retry_count: number
  max_retries: number
  last_error?: string
  scheduled_at: string
  locked_at?: string
  processed_at?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

/**
 * Outbox statistics response
 */
export interface OutboxStats {
  pending: number
  processing: number
  completed: number
  failed: number
  dead: number
  total: number
}

/**
 * Outbox list response with pagination
 */
export interface OutboxListResponse {
  data: OutboxEntry[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Outbox list filters
 */
export interface OutboxListFilters {
  status?: OutboxStatus
  page?: number
  page_size?: number
}

/**
 * Status configuration for UI display
 */
export const OUTBOX_STATUS_CONFIG: Record<
  OutboxStatus,
  {
    label: string
    color: string
    bgColor: string
    textColor: string
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  processing: {
    label: 'Processing',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  dead: {
    label: 'Dead',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
}

/**
 * Severity configuration for UI display
 */
export const OUTBOX_SEVERITY_CONFIG: Record<
  OutboxSeverity,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  low: {
    label: 'Low',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  info: {
    label: 'Info',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
}

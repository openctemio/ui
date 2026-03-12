/**
 * User Notification API Hooks
 *
 * SWR hooks for fetching and managing user in-app notifications.
 * All endpoints are tenant-scoped (tenant from JWT token).
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get, patch, post, put } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { notificationEndpoints } from '@/lib/api/endpoints'

// ============================================
// TYPES
// ============================================

export interface UserNotification {
  id: string
  tenant_id: string
  audience: string
  audience_id?: string
  notification_type: string
  title: string
  body?: string
  severity: string
  resource_type?: string
  resource_id?: string
  url?: string
  actor_id?: string
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  data: UserNotification[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface UnreadCountResponse {
  count: number
}

export interface NotificationPreferences {
  in_app_enabled: boolean
  email_digest: string
  muted_types: string[]
  min_severity: string
  updated_at: string
}

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: false, // Notifications are non-critical, don't show error toasts
      logError: true,
    })
  },
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchNotificationList(url: string): Promise<NotificationListResponse> {
  return get<NotificationListResponse>(url)
}

async function fetchUnreadCount(url: string): Promise<UnreadCountResponse> {
  return get<UnreadCountResponse>(url)
}

async function fetchPreferences(url: string): Promise<NotificationPreferences> {
  return get<NotificationPreferences>(url)
}

// ============================================
// LIST HOOKS
// ============================================

/**
 * Fetch user notifications with pagination
 *
 * @example
 * ```typescript
 * const { data, error, isLoading, mutate } = useNotificationsApi(1, 20)
 * ```
 */
export interface NotificationListFilters {
  severity?: string
  type?: string
  is_read?: boolean
}

export function useNotificationsApi(
  page = 1,
  perPage = 20,
  filters?: NotificationListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', String(perPage))
  if (filters?.severity) params.set('severity', filters.severity)
  if (filters?.type) params.set('type', filters.type)
  if (filters?.is_read !== undefined) params.set('is_read', String(filters.is_read))

  const key = currentTenant ? `${notificationEndpoints.list()}?${params.toString()}` : null

  return useSWR<NotificationListResponse>(key, fetchNotificationList, {
    ...defaultConfig,
    revalidateOnFocus: true,
    refreshInterval: 30000, // Poll every 30s as fallback
    ...config,
  })
}

/**
 * Fetch unread notification count
 */
export function useUnreadCountApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? notificationEndpoints.unreadCount() : null

  return useSWR<UnreadCountResponse>(key, fetchUnreadCount, {
    ...defaultConfig,
    revalidateOnFocus: true,
    refreshInterval: 30000, // Poll every 30s
    ...config,
  })
}

/**
 * Fetch notification preferences
 */
export function useNotificationPreferencesApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? notificationEndpoints.preferences() : null

  return useSWR<NotificationPreferences>(key, fetchPreferences, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  await patch<void>(notificationEndpoints.markAsRead(id), {})
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await post<void>(notificationEndpoints.markAllAsRead(), {})
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return put<NotificationPreferences>(notificationEndpoints.preferences(), data)
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate all notification caches (list + unread count)
 */
export async function invalidateNotificationsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) =>
      typeof key === 'string' &&
      key.includes('/api/v1/notifications') &&
      !key.includes('/integrations/'),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate unread count cache only
 */
export async function invalidateUnreadCountCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/notifications/unread-count'),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate notification preferences cache
 */
export async function invalidatePreferencesCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/notifications/preferences'),
    undefined,
    { revalidate: true }
  )
}

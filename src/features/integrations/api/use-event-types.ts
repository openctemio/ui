/**
 * Hook to fetch event types from the API
 *
 * Event types are now database-driven, meaning:
 * - Adding new event types only requires a database migration
 * - No frontend code changes needed for new event types
 * - Event types are filtered based on tenant's plan modules
 */

import useSWR from 'swr'
import { get } from '@/lib/api/client'

// =============================================================================
// Types
// =============================================================================

export interface EventType {
  id: string
  slug: string
  name: string
  description?: string
  category: string
  icon?: string
  color?: string
  severity_applicable: boolean
  is_default: boolean
}

export interface EventTypeCategory {
  id: string
  name: string
  event_types: EventType[]
}

export interface EventTypesResponse {
  event_types: EventType[]
  categories: EventTypeCategory[]
  default_event_ids: string[]
  total_count: number
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch all event types in the system (public endpoint)
 */
export function useAllEventTypes() {
  const { data, error, isLoading, mutate } = useSWR<EventTypesResponse>(
    '/api/v1/event-types',
    (url: string) => get<EventTypesResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    eventTypes: data?.event_types ?? [],
    categories: data?.categories ?? [],
    defaultEventIds: data?.default_event_ids ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Fetch event types available for the current tenant
 * Filtered based on tenant's plan modules
 *
 * @param enabled - Set to false to disable fetching (lazy loading).
 *                  When false, no API call is made until enabled becomes true.
 *                  This is useful for dialogs that should only fetch when opened.
 */
export function useTenantEventTypes(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<EventTypesResponse>(
    enabled ? '/api/v1/me/event-types' : null,
    (url: string) => get<EventTypesResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  return {
    eventTypes: data?.event_types ?? [],
    categories: data?.categories ?? [],
    defaultEventIds: data?.default_event_ids ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading: enabled && isLoading,
    error,
    mutate,
  }
}

/**
 * Get event type IDs from event types array
 */
export function getEventTypeIds(eventTypes: EventType[]): string[] {
  return eventTypes.map((et) => et.id)
}

/**
 * Get event types that have severity applicable
 */
export function getSeverityApplicableEventTypes(eventTypes: EventType[]): EventType[] {
  return eventTypes.filter((et) => et.severity_applicable)
}

/**
 * Find event type by ID
 */
export function findEventTypeById(eventTypes: EventType[], id: string): EventType | undefined {
  return eventTypes.find((et) => et.id === id)
}

/**
 * Check if an event type ID is valid
 */
export function isValidEventType(eventTypes: EventType[], id: string): boolean {
  return eventTypes.some((et) => et.id === id)
}

/**
 * Filter enabled event types
 */
export function filterEnabledEventTypes(
  allEventTypes: EventType[],
  enabledIds: string[]
): EventType[] {
  const enabledSet = new Set(enabledIds)
  return allEventTypes.filter((et) => enabledSet.has(et.id))
}

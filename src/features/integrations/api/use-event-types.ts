/**
 * Notification event-type catalog
 *
 * The catalog is served by the API from `integration.AllEventTypes()` — the
 * same registry the notification outbox routes on. It is deliberately NOT
 * mirrored here.
 *
 * It used to be. A hand-maintained copy lived in `integration.types.ts` and
 * drifted from the backend: six event types the backend routes (`sla_breach`,
 * `finding_assigned`, `approval_requested`, `approval_approved`,
 * `approval_rejected`, `workflow_notification`) had no checkbox, so no operator
 * could switch them on. If you find yourself about to add an event type to a
 * literal in this repo, add it to `AllEventTypes()` in the api instead.
 *
 * Module filtering is the server's job too: the response is already scoped to
 * the tenant's enabled modules.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'

// =============================================================================
// Types — mirror of the api's handler.TenantEventTypesResponse
// =============================================================================

/**
 * One entry of the catalog.
 *
 * `type` is the identity: it is the literal string stored in
 * `enabled_event_types` and matched by the outbox whitelist. Never send a
 * display value in its place.
 */
export interface NotificationEventTypeInfo {
  type: string
  category: string
  label: string
  description: string
  /** Module ID this event type requires. Absent for always-available system events. */
  required_module?: string
  /** Whether a channel created with the defaults receives this event type. */
  default_enabled: boolean
}

/** A category with the label to title its group. */
export interface NotificationEventCategoryInfo {
  category: string
  label: string
}

export interface TenantEventTypesResponse {
  event_types: NotificationEventTypeInfo[]
  categories: NotificationEventCategoryInfo[]
  default_enabled: string[]
  total_count: number
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * The catalog changes only when the tenant's module set does, and the endpoint
 * is ETag'd on exactly that. A 5-minute dedup window is generous rather than
 * risky.
 */
const eventTypesConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5 * 60 * 1000,
}

const EMPTY_EVENT_TYPES: NotificationEventTypeInfo[] = []
const EMPTY_CATEGORIES: NotificationEventCategoryInfo[] = []
const EMPTY_DEFAULTS: string[] = []

// =============================================================================
// Hook
// =============================================================================

/**
 * Fetch the notification event types available to the current tenant.
 *
 * @param enabled - Set false to defer the request (e.g. a dialog that has not
 *                  been opened yet). No request is made until it flips true.
 *
 * @example
 * ```tsx
 * const { eventTypes, categories, defaultEnabled, isLoading, error } = useTenantEventTypes(open)
 * ```
 */
export function useTenantEventTypes(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<TenantEventTypesResponse>(
    enabled ? '/api/v1/me/event-types' : null,
    (url: string) => get<TenantEventTypesResponse>(url),
    eventTypesConfig
  )

  return {
    /** The catalog, already filtered to the tenant's enabled modules. */
    eventTypes: data?.event_types ?? EMPTY_EVENT_TYPES,
    /** Categories present in `eventTypes`, in display order, with their labels. */
    categories: data?.categories ?? EMPTY_CATEGORIES,
    /** Event types a new channel should start with. */
    defaultEnabled: data?.default_enabled ?? EMPTY_DEFAULTS,
    totalCount: data?.total_count ?? 0,
    isLoading: enabled && isLoading,
    error,
    mutate,
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Group a catalog into its categories, in the order the server returned them.
 *
 * Only categories that actually contain an event type are emitted, so a tenant
 * without the scans module is not shown an empty "Scan Events" heading.
 */
export function groupEventTypesByCategory(
  eventTypes: NotificationEventTypeInfo[],
  categories: NotificationEventCategoryInfo[]
): { category: string; label: string; eventTypes: NotificationEventTypeInfo[] }[] {
  const byCategory = new Map<string, NotificationEventTypeInfo[]>()
  for (const et of eventTypes) {
    const bucket = byCategory.get(et.category)
    if (bucket) {
      bucket.push(et)
    } else {
      byCategory.set(et.category, [et])
    }
  }

  const ordered = categories
    .filter((c) => byCategory.has(c.category))
    .map((c) => ({
      category: c.category,
      label: c.label,
      eventTypes: byCategory.get(c.category) as NotificationEventTypeInfo[],
    }))

  // A category present on an event type but absent from `categories` would
  // otherwise drop its event types silently — exactly the failure the old
  // client-side label map had for the approval and workflow categories. Emit
  // them under their raw id rather than losing them.
  const covered = new Set(ordered.map((g) => g.category))
  for (const [category, group] of byCategory) {
    if (!covered.has(category)) {
      ordered.push({ category, label: category, eventTypes: group })
    }
  }

  return ordered
}

/**
 * Resolve event type identifiers to their display labels using the catalog.
 *
 * Unknown identifiers (a legacy value, or one whose module was since disabled)
 * fall back to the raw identifier rather than disappearing — a channel that
 * silently displays fewer event types than it routes is how this whole class of
 * bug hides.
 */
export function labelEventTypes(
  ids: string[],
  eventTypes: NotificationEventTypeInfo[]
): { id: string; label: string; category: string }[] {
  const byId = new Map(eventTypes.map((et) => [et.type, et]))
  return ids.map((id) => {
    const info = byId.get(id)
    return {
      id,
      label: info?.label ?? id,
      category: info?.category ?? 'unknown',
    }
  })
}

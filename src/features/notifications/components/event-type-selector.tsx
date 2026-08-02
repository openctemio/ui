/**
 * Event-type checkbox group for a notification channel.
 *
 * Shared by the add and edit dialogs, which previously each rendered their own
 * flat grid of checkboxes over the same data.
 *
 * The catalog is passed in rather than fetched here so the dialogs keep control
 * of when the request fires (they defer it until opened) and so this component
 * stays presentational and directly testable.
 *
 * Nothing about the catalog is hardcoded: labels, descriptions, grouping and
 * category headings all come from `GET /api/v1/me/event-types`.
 */

'use client'

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import {
  groupEventTypesByCategory,
  type NotificationEventTypeInfo,
  type NotificationEventCategoryInfo,
} from '@/features/integrations/api/use-event-types'

export interface EventTypeSelectorProps {
  /** Catalog for this tenant, from `useTenantEventTypes()`. */
  eventTypes: NotificationEventTypeInfo[]
  /** Categories for grouping, from the same hook. */
  categories: NotificationEventCategoryInfo[]
  /** Currently selected event type identifiers. */
  value: string[]
  onChange: (next: string[]) => void
  /** Prefix for checkbox element ids, so add and edit dialogs do not collide. */
  idPrefix: string
  isLoading?: boolean
  error?: unknown
}

export function EventTypeSelector({
  eventTypes,
  categories,
  value,
  onChange,
  idPrefix,
  isLoading = false,
  error,
}: EventTypeSelectorProps) {
  const toggle = (type: string, checked: boolean) => {
    onChange(checked ? [...value, type] : value.filter((t) => t !== type))
  }

  const groups = groupEventTypesByCategory(eventTypes, categories)

  return (
    <div className="space-y-3">
      <Label>Event Types</Label>
      <p className="text-xs text-muted-foreground">
        Select which event types should be sent to this channel
      </p>

      {isLoading ? (
        // A blank area under a heading reads as "this channel has no event
        // types", which is a different and much worse statement than "still
        // loading". Show the shape of the list instead.
        <div className="space-y-4" data-testid="event-types-loading" aria-busy="true">
          {[0, 1].map((group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // The channel's existing selection is still shown and still editable —
        // downgrading to "you can only remove what is already here" is far
        // better than a blank list the operator saves over, which would wipe
        // their routing.
        <div className="space-y-3" data-testid="event-types-error">
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">
              Could not load the event-type list. Your current selection is shown below and will be
              kept as-is if you save.
            </p>
          </div>
          {value.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {value.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${idPrefix}_${type}`}
                    checked
                    onCheckedChange={(checked) => toggle(type, checked === true)}
                  />
                  <label
                    htmlFor={`${idPrefix}_${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="event-types-empty">
          No event types are available for this workspace. Enable a module in Settings to route
          notifications for it.
        </p>
      ) : (
        <div className="space-y-4" data-testid="event-types-list">
          {groups.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {group.eventTypes.map((eventType) => (
                  <div key={eventType.type} className="flex items-start space-x-2">
                    <Checkbox
                      id={`${idPrefix}_${eventType.type}`}
                      className="mt-0.5"
                      checked={value.includes(eventType.type)}
                      onCheckedChange={(checked) => toggle(eventType.type, checked === true)}
                    />
                    <label
                      htmlFor={`${idPrefix}_${eventType.type}`}
                      className="cursor-pointer text-sm font-normal leading-tight"
                      title={eventType.description}
                    >
                      {eventType.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

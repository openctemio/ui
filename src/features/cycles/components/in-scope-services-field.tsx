'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { AlertTriangle, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { get } from '@/lib/api/client'
import { CRITICALITY_BADGE_SOFT, type CriticalityLevel } from '@/lib/criticality-colors'

interface BusinessServiceOption {
  id: string
  name: string
  criticality?: string
}

interface BusinessServiceList {
  data?: BusinessServiceOption[]
}

/**
 * Picks the business services a cycle covers. The API snapshots scope on
 * Activate from `charter.in_scope_services`, which it reads as business-service
 * IDs (`business_service_assets.service_id = ANY($ids::uuid[])`), so this field
 * stores IDs and shows names. A free-text name would make the snapshot query
 * fail and leave the cycle with an empty scope.
 *
 * Values that are not a known service ID (charters saved before this picker
 * existed) are listed separately so they can be removed.
 */
export function InScopeServicesField({
  value,
  onChange,
  editable,
}: {
  value: string[]
  onChange: (next: string[]) => void
  editable: boolean
}) {
  const { data, error, isLoading } = useSWR<BusinessServiceList>(
    '/api/v1/business-services?per_page=100',
    (url: string) => get<BusinessServiceList>(url)
  )
  const services = useMemo(() => data?.data ?? [], [data])
  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])
  const selected = useMemo(() => new Set(value), [value])
  // Only meaningful once the list has loaded; before that every value is "unknown".
  const unknown = data ? value.filter((v) => v.trim() && !byId.has(v)) : []

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-2">
      <Label>In-scope services</Label>
      <p className="text-xs text-muted-foreground">
        Business services this cycle covers. On Activate, the assets linked to them become the
        cycle&apos;s scope; with none selected, every asset is in scope.
      </p>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          Business services could not be loaded, so they cannot be picked here. With none selected,
          the cycle covers every asset.
        </p>
      ) : !editable ? (
        value.length === 0 ? (
          <p className="text-sm text-muted-foreground">All assets (no services selected)</p>
        ) : (
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {value.map((v) => (
              <li key={v}>
                {byId.get(v)?.name ?? (
                  <span className="text-muted-foreground">{v} (not a business service)</span>
                )}
              </li>
            ))}
          </ul>
        )
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No business services yet. Create them under Scoping › Business Services to scope a cycle
          to them; with none selected, the cycle covers every asset.
        </p>
      ) : (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
          {services.map((s) => {
            const id = `in-scope-${s.id}`
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
              >
                <Checkbox
                  id={id}
                  checked={selected.has(s.id)}
                  onCheckedChange={(c) => toggle(s.id, c === true)}
                />
                <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                  {s.name}
                </Label>
                {s.criticality && (
                  <Badge
                    variant="outline"
                    className={`capitalize ${CRITICALITY_BADGE_SOFT[s.criticality as CriticalityLevel] ?? ''}`}
                  >
                    {s.criticality}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editable && unknown.length > 0 && (
        <div className="space-y-1 rounded-md border border-border bg-muted/40 p-2 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            These entries are not business services and would break the scope snapshot. Remove them.
          </p>
          <ul className="space-y-1">
            {unknown.map((v) => (
              <li key={v} className="flex items-center justify-between gap-2">
                <span className="truncate">{v}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Remove ${v}`}
                  onClick={() => onChange(value.filter((x) => x !== v))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useDeferredValue } from 'react'
import { ArrowLeft, Loader2, Search, Target, UserPlus, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SeverityBadge } from '@/features/shared'
import { FindingStatusBadge } from '@/features/findings/components/finding-status-badge'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { FindingStatus } from '@/features/findings'
import type { Severity } from '@/features/shared/types'

interface FindingPickerPanelProps {
  onClose: () => void
  /** Currently linked finding ids (checked). */
  selectedIds: string[]
  /** Toggle a finding on/off. `next` = the new linked state. */
  onToggle: (findingId: string, next: boolean) => void
  /** finding_id → campaigns already referencing it, to flag cross-linking. */
  findingCampaigns?: Map<string, Array<{ id: string; name: string }>>
  /** Campaign id to exclude from the cross-link flag (the current one). */
  currentCampaignId?: string
  /** UUID → display name for finding assignees. */
  memberNameById?: Map<string, string>
}

/**
 * Findings picker rendered as an INLINE view that replaces the task-drawer body
 * (not an overlay/portal/fixed panel).
 *
 * Every overlay approach failed inside the drawer: portaled Popovers/Dialogs are
 * blocked from touch-scroll by the Sheet's react-remove-scroll, and a `fixed`
 * panel is trapped by the Sheet's containing block. This is just normal content
 * inside the Sheet's own overflow-y-auto scroller — so it scrolls reliably (the
 * drawer already scrolls). Header + search stick to the top; the list is a plain
 * flow. Server-side search reaches every open finding.
 */
export function FindingPickerPanel({
  onClose,
  selectedIds,
  onToggle,
  findingCampaigns,
  currentCampaignId,
  memberNameById,
}: FindingPickerPanelProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const { data, isLoading } = useFindingsApi({
    search: deferredQuery.trim() || undefined,
    statuses: ['new', 'confirmed', 'in_progress'],
    per_page: 100,
  })
  const findings = data?.data ?? []
  const total = data?.total ?? findings.length

  return (
    <div>
      {/* Sticky header + search stay put while the drawer scrolls the list. */}
      <div className="bg-background sticky top-0 z-10 border-b">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Link findings</h3>
            <p className="text-muted-foreground text-xs">
              {selectedIds.length} linked{total ? ` · ${total} open findings` : ''}
            </p>
          </div>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search findings by title or asset…"
              className="h-9 ps-7 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-1">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading findings…
          </div>
        ) : findings.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No open findings match your search.
          </p>
        ) : (
          findings.map((f) => {
            const linked = selectedIds.includes(f.id)
            const others = (findingCampaigns?.get(f.id) ?? []).filter(
              (c) => c.id !== currentCampaignId
            )
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onToggle(f.id, !linked)}
                className="hover:bg-muted flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-start"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                    linked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  }`}
                >
                  {linked && <Check className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {f.severity && (
                      <SeverityBadge severity={f.severity as Severity} className="shrink-0" />
                    )}
                    <span className="line-clamp-2 text-sm">{f.title || f.message || f.id}</span>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    {f.status && (
                      <FindingStatusBadge status={f.status as FindingStatus} variant="outline" />
                    )}
                    {f.asset?.name && (
                      <span className="inline-flex min-w-0 items-center gap-0.5">
                        <Target className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{f.asset.name}</span>
                      </span>
                    )}
                    {f.assigned_to && (
                      <span className="inline-flex items-center gap-0.5">
                        <UserPlus className="h-2.5 w-2.5 shrink-0" />
                        {memberNameById?.get(f.assigned_to) ||
                          f.assigned_to_user?.name ||
                          'Assigned'}
                      </span>
                    )}
                    {others.length > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-500"
                        title={others.map((c) => c.name).join(', ')}
                      >
                        <Link2 className="h-2.5 w-2.5 shrink-0" />
                        also in {others.length}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

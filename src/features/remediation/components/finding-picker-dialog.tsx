'use client'

import { useState, useDeferredValue } from 'react'
import { ArrowLeft, Loader2, Target, UserPlus, Link2, Check } from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { SeverityBadge } from '@/features/shared'
import { FindingStatusBadge } from '@/features/findings/components/finding-status-badge'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { FindingStatus } from '@/features/findings'
import type { Severity } from '@/features/shared/types'

interface FindingPickerPanelProps {
  open: boolean
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
 * Findings picker rendered as a full-cover panel INSIDE the task drawer (Sheet),
 * not a portaled Popover/Dialog.
 *
 * Why: the drawer is a Radix Sheet whose `react-remove-scroll` locks touch-scroll
 * to its own DOM subtree — so any overlay portaled to <body> (Popover/Dialog/
 * CommandDialog) can't be scrolled on iOS. This panel is a DOM child of the Sheet,
 * so scrolling is allowed. It's `fixed` to cover the sheet regardless of drawer
 * scroll position, and uses standalone cmdk (reliable list scroll) + SERVER-SIDE
 * search so it reaches every open finding.
 */
export function FindingPickerPanel({
  open,
  onClose,
  selectedIds,
  onToggle,
  findingCampaigns,
  currentCampaignId,
  memberNameById,
}: FindingPickerPanelProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const { data, isLoading } = useFindingsApi(
    open
      ? {
          search: deferredQuery.trim() || undefined,
          statuses: ['new', 'confirmed', 'in_progress'],
          per_page: 50,
        }
      : undefined
  )
  const findings = data?.data ?? []

  if (!open) return null

  return (
    <div className="bg-background fixed inset-y-0 end-0 z-20 flex w-full max-w-lg flex-col border-s shadow-xl">
      <header className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Link findings</h3>
          <p className="text-muted-foreground text-xs">
            {selectedIds.length} linked · search all open findings
          </p>
        </div>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </header>

      <Command shouldFilter={false} className="flex min-h-0 flex-1 flex-col rounded-none">
        <CommandInput
          placeholder="Search findings by title or asset…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-none min-h-0 flex-1">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading findings…
            </div>
          ) : (
            <>
              <CommandEmpty>No open findings match your search.</CommandEmpty>
              {findings.map((f) => {
                const linked = selectedIds.includes(f.id)
                const others = (findingCampaigns?.get(f.id) ?? []).filter(
                  (c) => c.id !== currentCampaignId
                )
                return (
                  <CommandItem
                    key={f.id}
                    value={f.id}
                    onSelect={() => onToggle(f.id, !linked)}
                    className="items-start gap-3 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                        linked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
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
                          <FindingStatusBadge
                            status={f.status as FindingStatus}
                            variant="outline"
                          />
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
                  </CommandItem>
                )
              })}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  )
}

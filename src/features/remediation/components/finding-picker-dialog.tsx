'use client'

import { useState, useDeferredValue } from 'react'
import { Loader2, Target, UserPlus, Link2, Check } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command'
import { SeverityBadge } from '@/features/shared'
import { FindingStatusBadge } from '@/features/findings/components/finding-status-badge'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { FindingStatus } from '@/features/findings'
import type { Severity } from '@/features/shared/types'

interface FindingPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
 * A standalone, reusable modal for linking findings to a remediation task.
 *
 * Built on cmdk's CommandDialog: a real separate popup (not a Popover nested in
 * the drawer Sheet — those get their touch-scroll blocked by the Sheet's
 * scroll-lock on iOS), with a scroll-reliable CommandList and SERVER-SIDE search
 * so it reaches every open finding (not just the first page loaded client-side).
 * Multi-select — selecting a row toggles it and keeps the dialog open.
 */
export function FindingPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onToggle,
  findingCampaigns,
  currentCampaignId,
  memberNameById,
}: FindingPickerDialogProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  // Server-side search over open findings — only fetch while the dialog is open.
  const { data, isLoading } = useFindingsApi(
    open
      ? {
          search: deferredQuery.trim() || undefined,
          statuses: ['new', 'confirmed', 'in_progress'],
          per_page: 30,
        }
      : undefined
  )
  const findings = data?.data ?? []

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Link findings"
      description="Search and select findings to link to this task"
      className="sm:max-w-xl"
    >
      {/* shouldFilter is off — the server already filtered by `search`. */}
      <CommandInput
        placeholder="Search findings by title or asset…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
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
                  className="items-start gap-2"
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
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <Target className="h-2.5 w-2.5 shrink-0" />
                          {f.asset.name}
                        </span>
                      )}
                      {f.assigned_to && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <UserPlus className="h-2.5 w-2.5 shrink-0" />
                          {memberNameById?.get(f.assigned_to) ||
                            f.assigned_to_user?.name ||
                            'Assigned'}
                        </span>
                      )}
                      {others.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 truncate text-amber-600 dark:text-amber-500"
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
      <div className="text-muted-foreground border-t px-3 py-2 text-[11px]">
        {selectedIds.length} linked · type to search all open findings
      </div>
    </CommandDialog>
  )
}

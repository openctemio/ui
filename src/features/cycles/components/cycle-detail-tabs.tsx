'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Lock, NotebookPen, ScrollText, ShieldQuestion, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DataTable,
  DataTableColumnHeader,
  DetailSection,
  DetailSections,
  EmptyState,
  ErrorState,
} from '@/features/shared'
import { useBusinessServiceOptions } from '@/features/business-services/api/business-service-assets'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  profileTypeLabel,
  saveScopeRefinement,
  syncCycleProfiles,
  useCycleProfiles,
  useCycleScope,
  type CycleScopeItem,
} from '../api'
import type { CtemCycle } from '../types'
import { CharterOutcome } from './charter-outcome'
import { CharterExclusionsField } from './charter-exclusions-field'
import { CharterAttackerProfilesField } from './charter-attacker-profiles-field'

function TextList({ items, numbered }: { items?: string[]; numbered?: boolean }) {
  const filled = (items ?? []).filter((s) => s.trim())
  if (filled.length === 0) return <p className="text-sm text-muted-foreground">Not set</p>
  const List = numbered ? 'ol' : 'ul'
  return (
    <List className={`${numbered ? 'list-decimal' : 'list-disc'} space-y-1 ps-5 text-sm`}>
      {filled.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </List>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

const text = (v?: string) =>
  v?.trim() ? (
    <p className="text-sm whitespace-pre-wrap">{v}</p>
  ) : (
    <p className="text-sm text-muted-foreground">Not set</p>
  )

/** The charter, read-only (it is edited in the charter sheet while planning). */
export function CycleCharterTab({ cycle, onEdit }: { cycle: CtemCycle; onEdit: () => void }) {
  const charter = cycle.charter ?? {}
  const serviceIds = charter.in_scope_services ?? []
  const { data: services } = useBusinessServiceOptions(serviceIds.length > 0)
  const nameOf = useMemo(
    () => new Map((services?.data ?? []).map((s) => [s.id, s.name])),
    [services]
  )
  const planning = cycle.status === 'planning'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {planning ? (
            'The charter can be edited until the cycle is activated.'
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              Frozen when the cycle was activated.
            </>
          )}
        </p>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <ScrollText className="me-2 h-4 w-4" />
          {planning ? 'Edit charter' : 'Open charter'}
        </Button>
      </div>
      <DetailSections>
        <DetailSection title="Scope and objectives">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Objectives">
              <TextList items={charter.objectives} numbered />
            </Field>
            <Field label="Business priorities">
              <TextList items={charter.business_priorities} />
            </Field>
            <Field label="In-scope services">
              {serviceIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None: activating covers every asset.
                </p>
              ) : (
                <ul className="list-disc space-y-1 ps-5 text-sm">
                  {serviceIds.map((id) => (
                    <li key={id}>
                      {nameOf.get(id) ?? (
                        <span className="text-muted-foreground">{id} (not a business service)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            <Field label="Risk appetite">{text(charter.risk_appetite)}</Field>
          </div>
        </DetailSection>
        <DetailSection title="Success criteria" count={charter.success_criteria?.length ?? 0}>
          {(charter.success_criteria ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not set. Criteria with a metric and a target are checked when the cycle closes.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {charter.success_criteria!.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.name || 'Untitled'}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {c.metric || 'no metric'}: {c.target || 'no target'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
        <DetailSection title="Exclusions" count={charter.exclusions?.length ?? 0}>
          <CharterExclusionsField
            value={charter.exclusions ?? []}
            onChange={() => {}}
            editable={false}
          />
        </DetailSection>
        <DetailSection title="Escalation, roles and timeline">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Sponsor">{text(charter.roles?.sponsor)}</Field>
            <Field label="Operator">{text(charter.roles?.operator)}</Field>
            <Field label="Engineering partner">{text(charter.roles?.engineering_partner)}</Field>
            <Field label="Escalation path">{text(charter.escalation_path)}</Field>
            <Field label="Timeline">{text(charter.timeline)}</Field>
          </div>
        </DetailSection>
      </DetailSections>
    </div>
  )
}

const scopeColumns: ColumnDef<CycleScopeItem>[] = [
  {
    id: 'name',
    accessorFn: (r) => r.asset_name || r.asset_id,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asset" />,
    // An empty name means the asset was deleted after the snapshot; no name
    // field at all is an API from before the join, so link the id instead.
    cell: ({ row }) =>
      row.original.asset_name === '' ? (
        <span className="text-muted-foreground">Deleted asset</span>
      ) : (
        <Link href={`/assets/${row.original.asset_id}`} className="font-medium hover:underline">
          {row.original.asset_name ?? (
            <span className="font-mono text-xs">{row.original.asset_id}</span>
          )}
        </Link>
      ),
  },
  {
    id: 'type',
    accessorFn: (r) => r.asset_type ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => (
      <span className="capitalize">{(row.original.asset_type ?? '—').replace(/_/g, ' ')}</span>
    ),
  },
  {
    id: 'criticality',
    accessorFn: (r) => r.asset_criticality ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
    cell: ({ row }) => <span className="capitalize">{row.original.asset_criticality || '—'}</span>,
  },
  {
    accessorKey: 'included_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Frozen" />,
    cell: ({ row }) => new Date(row.original.included_at).toLocaleDateString(),
  },
]

/** The assets frozen into the cycle on Activate. */
export function CycleScopeTab({ cycle }: { cycle: CtemCycle }) {
  const planning = cycle.status === 'planning'
  const { data, error, isLoading, mutate } = useCycleScope(planning ? null : cycle.id)

  if (planning) {
    const services = cycle.charter?.in_scope_services?.length ?? 0
    return (
      <EmptyState
        icon={ShieldQuestion}
        title="Scope is frozen on Activate"
        description={
          services > 0
            ? `Activating snapshots the assets linked to the ${services} in-scope service${services === 1 ? '' : 's'}. Link assets to those services under Business context first.`
            : 'No in-scope services are chosen, so activating snapshots every asset. Pick services in the charter to narrow it.'
        }
      />
    )
  }
  if (error) return <ErrorState title="the scope snapshot" error={error} onRetry={() => mutate()} />
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />
  return (
    <DataTable
      columns={scopeColumns}
      data={data}
      searchPlaceholder="Search assets in scope..."
      emptyMessage="Nothing was frozen into scope"
      emptyDescription="The snapshot is empty: the in-scope services had no linked assets when the cycle was activated."
    />
  )
}

/**
 * The attacker profiles the cycle assumes. Editable while the cycle is open
 * (planning, active, review); closed cycles are archive.
 */
export function CycleProfilesTab({ cycle }: { cycle: CtemCycle }) {
  const { can } = usePermissions()
  const { data, error, isLoading, mutate } = useCycleProfiles(cycle.id)
  const linked = useMemo(() => data?.data ?? [], [data])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const editable = cycle.status !== 'closed' && can(Permission.CTEMCyclesWrite)

  const save = async () => {
    setSaving(true)
    try {
      await syncCycleProfiles(
        cycle.id,
        linked.map((p) => p.id),
        draft
      )
      await mutate()
      toast.success('Attacker profiles saved')
      setEditing(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save attacker profiles'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Who this cycle assumes it defends against. The threat model reasons over the same
          profiles.
        </p>
        {editable && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(linked.map((p) => p.id))
              setEditing(true)
            }}
          >
            <Swords className="me-2 h-4 w-4" />
            Choose profiles
          </Button>
        )}
      </div>
      {error ? (
        <ErrorState title="attacker profiles" error={error} onRetry={() => mutate()} />
      ) : isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : linked.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No attacker profiles chosen"
          description="Choose the attackers this cycle assumes: external, with stolen credentials, an insider, a supplier."
          card={false}
          className="rounded-lg border border-dashed py-8"
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {linked.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {p.name}
                {p.is_default && (
                  <Lock className="h-3 w-3 text-muted-foreground" aria-label="Built-in profile" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {profileTypeLabel(p.profile_type)}
                {p.description ? ` · ${p.description}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing} onOpenChange={(o) => !saving && setEditing(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attacker profiles</DialogTitle>
            <DialogDescription>Choose the attackers {cycle.name} assumes.</DialogDescription>
          </DialogHeader>
          <CharterAttackerProfilesField value={draft} onChange={setDraft} editable />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Close-time verdict on the success criteria, and what the cycle taught about scope. */
export function CycleOutcomeTab({ cycle, onSaved }: { cycle: CtemCycle; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const canNote = cycle.status === 'review' || cycle.status === 'closed'
  const saved = cycle.charter?.scope_refinement_notes ?? ''

  const save = async () => {
    setSaving(true)
    try {
      await saveScopeRefinement(cycle.id, notes)
      toast.success('Scope refinement notes saved')
      setEditing(false)
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save scope refinement notes'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DetailSections>
      <DetailSection title="Success criteria outcome">
        {cycle.charter_evaluation ? (
          <CharterOutcome evaluation={cycle.charter_evaluation} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Evaluated when the cycle closes, against the charter&apos;s success criteria.
          </p>
        )}
      </DetailSection>
      <DetailSection
        title="Scope refinement"
        actions={
          canNote ? (
            <Can permission={Permission.CTEMCyclesWrite}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNotes(saved)
                  setEditing(true)
                }}
              >
                <NotebookPen className="me-2 h-4 w-4" />
                {saved ? 'Edit notes' : 'Add notes'}
              </Button>
            </Can>
          ) : undefined
        }
      >
        {saved ? (
          <p className="text-sm whitespace-pre-wrap">{saved}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canNote
              ? 'What this cycle taught about scope: gaps to add, items to exclude, lessons for the next charter.'
              : 'Recorded at review and close; the next cycle is created with them in view.'}
          </p>
        )}
      </DetailSection>

      <Dialog open={editing} onOpenChange={(o) => !saving && setEditing(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scope refinement and lessons</DialogTitle>
            <DialogDescription>
              What {cycle.name} taught about scope. Shown when the next cycle is created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scope-notes">Notes</Label>
            <Textarea
              id="scope-notes"
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Add exposed RDP to scope next cycle; the legacy VPN exclusion held up."
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSections>
  )
}

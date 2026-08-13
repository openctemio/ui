'use client'

/**
 * Threat Actors management tab.
 *
 * Backed by /api/v1/threat-actors (list/create/get/delete — no update endpoint,
 * so there is no edit action). Read gated by threat_intel:read, create/delete by
 * threat_intel:write. Type filter lives in the URL (?actor_type=) so a filtered
 * view is linkable.
 */

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Eye, Trash2, Users, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  SheetBody,
  SheetDetailToolbar,
  SheetInfoRow,
  SheetSectionHeading,
} from '@/features/shared'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useUrlFilter } from '@/hooks/use-url-param'
import {
  useThreatActors,
  useCreateThreatActor,
  useDeleteThreatActor,
  ACTOR_TYPES,
  ACTOR_TYPE_LABELS,
  type ThreatActor,
  type ActorType,
  type CreateThreatActorInput,
} from '../api/use-threat-actors-api'

const ALL = 'all'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

/** Split a comma/newline separated field into a trimmed, non-empty string list. */
function splitList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ThreatActorsPanel() {
  const { can } = usePermissions()
  const canRead = can(Permission.ThreatIntelRead)

  const { data, error, isLoading, mutate } = useThreatActors(
    canRead ? { per_page: 200 } : undefined
  )
  const [typeFilter, setTypeFilter] = useUrlFilter('actor_type', ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ThreatActor | null>(null)

  const actors = useMemo(() => {
    const rows = data?.data ?? []
    if (typeFilter === ALL) return rows
    return rows.filter((a) => a.actor_type === typeFilter)
  }, [data, typeFilter])

  const selected = useMemo(
    () => actors.find((a) => a.id === selectedId) ?? null,
    [actors, selectedId]
  )

  const columns = useMemo<ColumnDef<ThreatActor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const a = row.original
          return (
            <div className="min-w-0">
              <div className="font-medium truncate">{a.name}</div>
              {a.aliases.length > 0 && (
                <div className="text-xs text-muted-foreground truncate">
                  {a.aliases.join(', ')}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'actor_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="secondary">
            {ACTOR_TYPE_LABELS[row.original.actor_type] ?? row.original.actor_type}
          </Badge>
        ),
      },
      {
        accessorKey: 'motivation',
        header: 'Motivation',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.motivation || '—'}</span>
        ),
      },
      {
        id: 'ttps',
        header: 'TTPs',
        cell: ({ row }) => {
          const n = row.original.ttps?.length ?? 0
          return n > 0 ? <Badge variant="outline">{n}</Badge> : <span className="text-muted-foreground">—</span>
        },
      },
      {
        accessorKey: 'mitre_group_id',
        header: 'MITRE Group',
        cell: ({ row }) =>
          row.original.mitre_group_id ? (
            <span className="font-mono text-xs">{row.original.mitre_group_id}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.updated_at)}</span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              { label: 'View details', icon: Eye, onClick: () => setSelectedId(row.original.id) },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                permission: Permission.ThreatIntelWrite,
                onClick: () => setDeleteTarget(row.original),
              },
            ]}
          />
        ),
      },
    ],
    []
  )

  if (!canRead) {
    return (
      <EmptyState
        icon={Users}
        title="No access to threat actors"
        description="You need the View Threat Intel permission to see the threat actor catalogue."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Threat Actors"
        description="Adversary groups tracked for this tenant — motivations, TTPs and MITRE mapping."
      >
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {ACTOR_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ACTOR_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Can permission={Permission.ThreatIntelWrite} mode="disable">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Add Actor
            </Button>
          </Can>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Users}
          title="Failed to load threat actors"
          description={getErrorMessage(error, 'Please try again.')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={actors}
          searchPlaceholder="Search actors..."
          emptyMessage="No threat actors"
          emptyDescription="Add an adversary group to start tracking it."
          onRowClick={(row) => setSelectedId(row.id)}
        />
      )}

      <ThreatActorDetailSheet
        actor={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onDelete={(a) => {
          setSelectedId(null)
          setDeleteTarget(a)
        }}
      />

      <CreateThreatActorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate()}
      />

      <DeleteThreatActorConfirm
        actor={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null)
          mutate()
        }}
      />
    </div>
  )
}

// ── Detail sheet ────────────────────────────────────────────────────────────
function ThreatActorDetailSheet({
  actor,
  open,
  onOpenChange,
  onDelete,
}: {
  actor: ThreatActor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (actor: ThreatActor) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="[&>button]:hidden w-full gap-0 p-0 sm:max-w-xl">
        {actor && (
          <>
            <SheetDetailToolbar
              title={actor.name}
              onClose={() => onOpenChange(false)}
              extraActions={[
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => onDelete(actor),
                },
              ]}
            />
            <SheetBody className="space-y-6 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {ACTOR_TYPE_LABELS[actor.actor_type] ?? actor.actor_type}
                </Badge>
                <Badge variant={actor.is_active ? 'default' : 'outline'}>
                  {actor.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {actor.mitre_group_id && (
                  <Badge variant="outline" className="font-mono">
                    {actor.mitre_group_id}
                  </Badge>
                )}
              </div>

              {actor.description && (
                <p className="text-sm text-muted-foreground">{actor.description}</p>
              )}

              <div className="space-y-1">
                {actor.aliases.length > 0 && (
                  <SheetInfoRow label="Aliases">{actor.aliases.join(', ')}</SheetInfoRow>
                )}
                {actor.motivation && (
                  <SheetInfoRow label="Motivation">{actor.motivation}</SheetInfoRow>
                )}
                {actor.sophistication && (
                  <SheetInfoRow label="Sophistication">{actor.sophistication}</SheetInfoRow>
                )}
                {actor.country_of_origin && (
                  <SheetInfoRow label="Country of origin">{actor.country_of_origin}</SheetInfoRow>
                )}
                {actor.target_industries.length > 0 && (
                  <SheetInfoRow label="Target industries">
                    {actor.target_industries.join(', ')}
                  </SheetInfoRow>
                )}
                {actor.target_regions.length > 0 && (
                  <SheetInfoRow label="Target regions">
                    {actor.target_regions.join(', ')}
                  </SheetInfoRow>
                )}
                <SheetInfoRow label="Updated">{formatDate(actor.updated_at)}</SheetInfoRow>
              </div>

              {actor.ttps.length > 0 && (
                <div className="space-y-2">
                  <SheetSectionHeading icon={Users}>TTPs</SheetSectionHeading>
                  <div className="space-y-1">
                    {actor.ttps.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {t.technique_id && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.technique_id}
                          </span>
                        )}
                        <span>{t.technique_name || t.tactic}</span>
                        {t.tactic && t.technique_name && (
                          <Badge variant="outline">{t.tactic}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {actor.external_references.length > 0 && (
                <div className="space-y-2">
                  <SheetSectionHeading icon={ExternalLink}>References</SheetSectionHeading>
                  <div className="space-y-1">
                    {actor.external_references.map((ref, i) => (
                      <a
                        key={i}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {ref.source || ref.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {actor.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {actor.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Create dialog ───────────────────────────────────────────────────────────
function CreateThreatActorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { trigger } = useCreateThreatActor()
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [actorType, setActorType] = useState<ActorType>('unknown')
  const [aliases, setAliases] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')
  const [country, setCountry] = useState('')
  const [mitreId, setMitreId] = useState('')
  const [tags, setTags] = useState('')

  const reset = () => {
    setName('')
    setActorType('unknown')
    setAliases('')
    setDescription('')
    setMotivation('')
    setCountry('')
    setMitreId('')
    setTags('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    const payload: CreateThreatActorInput = {
      name: name.trim(),
      actor_type: actorType,
      aliases: splitList(aliases),
      description: description.trim(),
      motivation: motivation.trim(),
      country_of_origin: country.trim(),
      mitre_group_id: mitreId.trim(),
      tags: splitList(tags),
    }
    setSubmitting(true)
    try {
      await trigger(payload)
      toast.success(`Threat actor "${payload.name}" added`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add threat actor'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Threat Actor</DialogTitle>
          <DialogDescription>Track a new adversary group for this tenant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ta-name">Name *</Label>
            <Input
              id="ta-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. APT29"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ta-type">Type</Label>
            <Select value={actorType} onValueChange={(v) => setActorType(v as ActorType)}>
              <SelectTrigger id="ta-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTOR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTOR_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ta-aliases">Aliases</Label>
            <Input
              id="ta-aliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Comma-separated, e.g. Cozy Bear, The Dukes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ta-desc">Description</Label>
            <Textarea
              id="ta-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ta-motivation">Motivation</Label>
              <Input
                id="ta-motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="e.g. Espionage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ta-country">Country of origin</Label>
              <Input
                id="ta-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ta-mitre">MITRE Group ID</Label>
              <Input
                id="ta-mitre"
                value={mitreId}
                onChange={(e) => setMitreId(e.target.value)}
                placeholder="e.g. G0016"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ta-tags">Tags</Label>
              <Input
                id="ta-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Add Actor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm ──────────────────────────────────────────────────────────
function DeleteThreatActorConfirm({
  actor,
  onOpenChange,
  onDeleted,
}: {
  actor: ThreatActor | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { trigger } = useDeleteThreatActor(actor?.id ?? '')
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!actor) return
    setDeleting(true)
    try {
      await trigger()
      toast.success(`Threat actor "${actor.name}" deleted`)
      onDeleted()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete threat actor'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      open={!!actor}
      onOpenChange={onOpenChange}
      title="Delete threat actor?"
      desc={
        actor
          ? `"${actor.name}" will be removed from this tenant's catalogue. This cannot be undone.`
          : ''
      }
      confirmText={deleting ? 'Deleting...' : 'Delete'}
      destructive
      handleConfirm={handleConfirm}
    />
  )
}

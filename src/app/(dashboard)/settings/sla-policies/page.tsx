'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, ShieldCheck, Timer } from 'lucide-react'

import { Main } from '@/components/layout'
import { PageHeader, DataTable, DataTableColumnHeader, EmptyState } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can, Permission } from '@/lib/permissions'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import { cn } from '@/lib/utils'

import { SlaPolicyDialog } from '@/features/sla/components/sla-policy-dialog'
import {
  useSlaPoliciesApi,
  useDeleteSlaPolicy,
  invalidateSlaPoliciesCache,
  type SlaPolicy,
} from '@/features/sla/api/use-sla-policies-api'

const WINDOW_FIELDS: {
  key: keyof SlaPolicy
  label: string
  dot: 'critical' | 'high' | 'medium' | 'low' | 'info'
}[] = [
  { key: 'critical_days', label: 'C', dot: 'critical' },
  { key: 'high_days', label: 'H', dot: 'high' },
  { key: 'medium_days', label: 'M', dot: 'medium' },
  { key: 'low_days', label: 'L', dot: 'low' },
  { key: 'info_days', label: 'I', dot: 'info' },
]

function WindowCells({ policy }: { policy: SlaPolicy }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {WINDOW_FIELDS.map((f) => (
        <div key={f.key} className="flex items-center gap-1.5 text-sm tabular-nums" title={f.label}>
          <span className={cn('h-2 w-2 rounded-full', SEVERITY_DOT_COLORS[f.dot])} />
          <span className="text-muted-foreground">{f.label}</span>
          <span className="font-medium">{policy[f.key] as number}d</span>
        </div>
      ))}
    </div>
  )
}

export default function SlaPoliciesPage() {
  const { data, isLoading } = useSlaPoliciesApi()
  const policies = useMemo(() => data?.data ?? [], [data])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SlaPolicy | null>(null)

  const { trigger: deletePolicy, isMutating: isDeleting } = useDeleteSlaPolicy()

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (policy: SlaPolicy) => {
    setEditing(policy)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePolicy({ id: deleteTarget.id })
      toast.success(`Policy "${deleteTarget.name}" deleted`)
      await invalidateSlaPoliciesCache()
      setDeleteTarget(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete SLA policy'))
    }
  }

  const columns = useMemo<ColumnDef<SlaPolicy>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Policy" />,
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {p.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Default
                  </Badge>
                )}
                {p.asset_id && (
                  <Badge variant="outline" className="text-xs">
                    Asset override
                  </Badge>
                )}
              </div>
              {p.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">{p.description}</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'windows',
        header: 'Remediation windows',
        enableSorting: false,
        cell: ({ row }) => <WindowCells policy={row.original} />,
      },
      {
        accessorKey: 'warning_threshold_pct',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Warning at" />,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.warning_threshold_pct}%</span>
        ),
      },
      {
        accessorKey: 'escalation_enabled',
        header: 'Escalation',
        cell: ({ row }) =>
          row.original.escalation_enabled ? (
            <Badge variant="outline">On</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Off</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <Can permission={Permission.SLAWrite}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Can>
              <Can permission={Permission.SLADelete}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Can>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <Main>
      <PageHeader
        title="SLA Policies"
        description="Define per-severity remediation windows that drive finding SLA deadlines."
      >
        <Can permission={Permission.SLAWrite}>
          <Button onClick={openCreate}>
            <Plus className="me-2 h-4 w-4" />
            New Policy
          </Button>
        </Can>
      </PageHeader>

      <div className="mt-6">
        {isLoading ? (
          <Card>
            <CardContent className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No SLA policies yet"
            description="Create a policy to set remediation deadlines by severity. The default policy applies to every asset without a specific one."
            action={
              <Can permission={Permission.SLAWrite}>
                <Button onClick={openCreate}>
                  <Plus className="me-2 h-4 w-4" />
                  New Policy
                </Button>
              </Can>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={policies}
            searchKey="name"
            searchPlaceholder="Search policies..."
            pageSize={10}
          />
        )}
      </div>

      <SlaPolicyDialog open={dialogOpen} onOpenChange={setDialogOpen} policy={editing} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete SLA policy"
        desc={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? Assets using it fall back to the default
            policy. This action cannot be undone.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </Main>
  )
}

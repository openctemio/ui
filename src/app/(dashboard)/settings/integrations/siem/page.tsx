'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Shield, Plus, Send, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import { csrfFetch } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'
import {
  useNotificationIntegrationsApi,
  useCreateNotificationIntegrationApi,
  invalidateNotificationIntegrationsCache,
} from '@/features/integrations'
import type { Integration } from '@/features/integrations'
import {
  DataTable,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  PageHeader,
  StackedCell,
} from '@/features/shared'

const META = (i: Integration, k: string): string => {
  const v = i.metadata?.[k]
  return typeof v === 'string' ? v : ''
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'connected'
  return (
    <Badge variant={ok ? 'default' : 'secondary'} className="gap-1">
      {ok ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
      {status}
    </Badge>
  )
}

export default function SIEMIntegrationPage() {
  const { data, error, isLoading, mutate } = useNotificationIntegrationsApi()
  const { trigger: createIntegration, isMutating: creating } = useCreateNotificationIntegrationApi()

  const splunkIntegrations = useMemo(
    () => (data?.data ?? []).filter((i) => i.provider === 'splunk'),
    [data]
  )

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', hecUrl: '', token: '', index: '', sourcetype: '' })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null)
  const [deleting, setDeleting] = useState(false)

  const resetForm = () => setForm({ name: '', hecUrl: '', token: '', index: '', sourcetype: '' })

  const handleCreate = useCallback(async () => {
    if (!form.name.trim() || !form.hecUrl.trim() || !form.token.trim()) {
      toast.error('Name, HEC endpoint URL, and HEC token are required')
      return
    }
    try {
      await createIntegration({
        name: form.name.trim(),
        provider: 'splunk',
        auth_type: 'token',
        credentials: form.token.trim(),
        metadata: {
          hec_url: form.hecUrl.trim(),
          index: form.index.trim(),
          sourcetype: form.sourcetype.trim(),
        },
      })
      toast.success('Splunk HEC integration created')
      resetForm()
      setShowForm(false)
      await invalidateNotificationIntegrationsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [form, createIntegration, mutate])

  const handleTest = useCallback(
    async (integration: Integration) => {
      setTestingId(integration.id)
      try {
        const res = await csrfFetch(`/api/v1/integrations/${integration.id}/test-notification`, {
          method: 'POST',
        })
        if (res.ok) {
          toast.success('Test event delivered to Splunk')
        } else {
          const body = await res.json().catch(() => ({}))
          toast.error(body?.error || `Test failed (HTTP ${res.status})`)
        }
        await mutate()
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setTestingId(null)
      }
    },
    [mutate]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await csrfFetch(`/api/v1/integrations/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`)
      toast.success('Integration deleted')
      setDeleteTarget(null)
      await invalidateNotificationIntegrationsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, mutate])

  const endpointSummary = (integration: Integration) =>
    [
      META(integration, 'hec_url'),
      META(integration, 'index') && `index: ${META(integration, 'index')}`,
      META(integration, 'sourcetype') && `sourcetype: ${META(integration, 'sourcetype')}`,
    ]
      .filter(Boolean)
      .join(' · ')

  const columns: ColumnDef<Integration>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <StackedCell primary={row.original.name} secondary={row.original.status_message} truncate />
      ),
    },
    {
      id: 'endpoint',
      header: 'HEC endpoint',
      accessorFn: (i) => endpointSummary(i),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{endpointSummary(row.original)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            {
              label: testingId === row.original.id ? 'Sending test…' : 'Send test event',
              icon: Send,
              onClick: () => void handleTest(row.original),
              disabled: testingId === row.original.id,
              permission: Permission.IntegrationsManage,
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => setDeleteTarget(row.original),
              destructive: true,
              separatorBefore: true,
              permission: Permission.IntegrationsManage,
            },
          ]}
        />
      ),
    },
  ]

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  return (
    <Main>
      <PageHeader
        title="SIEM"
        description="Forward findings, exposures, scans and SLA breaches to Splunk through the HTTP Event Collector (HEC)."
      >
        <Can permission={Permission.IntegrationsManage}>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="me-2 h-4 w-4" />
            Add Splunk HEC
          </Button>
        </Can>
      </PageHeader>

      <div className="mt-5">
        {error ? (
          <ErrorState title="SIEM integrations" error={error} onRetry={() => void mutate()} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : splunkIntegrations.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No SIEM integrations yet"
            description="Add a Splunk HTTP Event Collector to start forwarding security events to your SIEM."
            action={
              <Can permission={Permission.IntegrationsManage}>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  Add Splunk HEC
                </Button>
              </Can>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={splunkIntegrations}
            getRowId={(i) => i.id}
            searchPlaceholder="Search integrations..."
            showSelectionCount={false}
          />
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : closeForm())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Splunk HEC integration</DialogTitle>
            <DialogDescription>
              The HEC token is stored encrypted. The endpoint, index and sourcetype are
              non-sensitive routing config.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="siem-name">Name</Label>
              <Input
                id="siem-name"
                placeholder="Production Splunk"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siem-url">HEC endpoint URL</Label>
              <Input
                id="siem-url"
                placeholder="https://splunk.example.com:8088"
                value={form.hecUrl}
                onChange={(e) => setForm({ ...form, hecUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="siem-token">HEC token</Label>
              <Input
                id="siem-token"
                type="password"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siem-index">Index (optional)</Label>
              <Input
                id="siem-index"
                placeholder="main"
                value={form.index}
                onChange={(e) => setForm({ ...form, index: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siem-sourcetype">Sourcetype (optional)</Label>
              <Input
                id="siem-sourcetype"
                placeholder="openctem:notification"
                value={form.sourcetype}
                onChange={(e) => setForm({ ...form, sourcetype: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete SIEM integration"
        desc={`Stop forwarding events to "${deleteTarget?.name ?? ''}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={() => void handleDelete()}
      />
    </Main>
  )
}

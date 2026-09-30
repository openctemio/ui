'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  FolderSync,
  RefreshCw,
  GitBranch,
  Database,
  Globe,
  Pencil,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  PageHeader,
} from '@/features/shared'
import { AddTemplateSourceDialog } from './add-template-source-dialog'
import { EditTemplateSourceDialog } from './edit-template-source-dialog'
import { Can, Permission } from '@/lib/permissions'
import {
  useTemplateSources,
  useDeleteTemplateSource,
  useEnableTemplateSource,
  useDisableTemplateSource,
  useSyncTemplateSource,
  invalidateTemplateSourcesCache,
} from '@/lib/api/template-source-hooks'
import type { TemplateSource, SyncStatus } from '@/lib/api/template-source-types'
import {
  SOURCE_TYPE_DISPLAY_NAMES,
  SYNC_STATUS_DISPLAY_NAMES,
  formatSyncTime,
  getSourceDisplayUrl,
} from '@/lib/api/template-source-types'

const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  git: GitBranch,
  s3: Database,
  http: Globe,
}

function SyncStatusBadge({ status }: { status?: SyncStatus }) {
  if (!status) return null

  const IconMap: Record<string, React.ElementType> = {
    pending: Clock,
    syncing: RefreshCw,
    success: CheckCircle,
    failed: XCircle,
    disabled: Pause,
  }

  const Icon = IconMap[status] || Clock
  // Only a failed sync is a problem worth colour; every other state is neutral.
  return (
    <Badge variant={status === 'failed' ? 'destructive' : 'outline'} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {SYNC_STATUS_DISPLAY_NAMES[status]}
    </Badge>
  )
}

export function TemplateSourcesSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected source for dialogs
  const [selectedSource, setSelectedSource] = useState<TemplateSource | null>(null)

  // API data
  const { data: sourcesData, error, isLoading, mutate } = useTemplateSources()
  const sources: TemplateSource[] = React.useMemo(
    () => sourcesData?.items ?? [],
    [sourcesData?.items]
  )

  // Mutations
  const { trigger: deleteSource, isMutating: isDeleting } = useDeleteTemplateSource(
    selectedSource?.id || ''
  )
  const { trigger: enableSource, isMutating: isEnabling } = useEnableTemplateSource(
    selectedSource?.id || ''
  )
  const { trigger: disableSource, isMutating: isDisabling } = useDisableTemplateSource(
    selectedSource?.id || ''
  )
  const { trigger: syncSource, isMutating: isSyncing } = useSyncTemplateSource(
    selectedSource?.id || ''
  )

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateTemplateSourcesCache()
    await mutate()
    toast.success('Template sources refreshed')
  }, [mutate])

  const handleEditSource = useCallback((source: TemplateSource) => {
    setSelectedSource(source)
    setEditDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((source: TemplateSource) => {
    setSelectedSource(source)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedSource) return
    try {
      await deleteSource()
      toast.success(`Source "${selectedSource.name}" deleted`)
      await invalidateTemplateSourcesCache()
      setDeleteDialogOpen(false)
      setSelectedSource(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete source'))
    }
  }, [selectedSource, deleteSource])

  const handleToggleEnabled = useCallback(
    async (source: TemplateSource) => {
      setSelectedSource(source)
      try {
        if (source.is_enabled) {
          await disableSource()
          toast.success(`Source "${source.name}" disabled`)
        } else {
          await enableSource()
          toast.success(`Source "${source.name}" enabled`)
        }
        await invalidateTemplateSourcesCache()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update source'))
      }
    },
    [enableSource, disableSource]
  )

  const handleSync = useCallback(
    async (source: TemplateSource) => {
      setSelectedSource(source)
      try {
        const result = await syncSource()
        if (result?.status === 'success') {
          toast.success(`Synced ${result.templates_found} templates from "${source.name}"`)
        } else {
          toast.error(result?.error || 'Sync failed')
        }
        await invalidateTemplateSourcesCache()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to sync source'))
      }
    },
    [syncSource]
  )

  const columns = useMemo<ColumnDef<TemplateSource>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (src) => `${src.name} ${src.description ?? ''} ${getSourceDisplayUrl(src)}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
        cell: ({ row }) => {
          const source = row.original
          const Icon = SOURCE_TYPE_ICONS[source.source_type] || Globe
          const url = getSourceDisplayUrl(source)
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{source.name}</span>
                  {!source.is_enabled && <Badge variant="outline">Disabled</Badge>}
                </div>
                <p
                  className="max-w-xs truncate font-mono text-xs text-muted-foreground"
                  title={url}
                >
                  {url}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'type',
        accessorFn: (src) => SOURCE_TYPE_DISPLAY_NAMES[src.source_type],
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'templates',
        accessorKey: 'template_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Templates" />,
        cell: ({ row }) => <Badge variant="secondary">{row.original.template_type}</Badge>,
      },
      {
        id: 'last_sync',
        accessorFn: (src) => src.last_sync_at ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last sync" />,
        cell: ({ row }) => {
          const source = row.original
          return (
            <span className="text-sm text-muted-foreground">
              {formatSyncTime(source.last_sync_at)}
              {source.templates_synced != null && source.templates_synced > 0 && (
                <span className="ms-1 text-xs tabular-nums">
                  ({source.templates_synced} templates)
                </span>
              )}
            </span>
          )
        },
      },
      {
        id: 'status',
        enableSorting: false,
        header: 'Status',
        cell: ({ row }) => <SyncStatusBadge status={row.original.last_sync_status} />,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const source = row.original
          return (
            <Can permission={Permission.CredentialsWrite}>
              <DataTableRowActions
                actions={[
                  {
                    label: 'Sync now',
                    icon: RefreshCw,
                    onClick: () => handleSync(source),
                    disabled: isSyncing || !source.is_enabled,
                    permission: Permission.CredentialsWrite,
                  },
                  {
                    label: source.is_enabled ? 'Disable' : 'Enable',
                    icon: source.is_enabled ? Pause : Play,
                    onClick: () => handleToggleEnabled(source),
                    disabled: isEnabling || isDisabling,
                    permission: Permission.CredentialsWrite,
                  },
                  {
                    label: 'Edit',
                    icon: Pencil,
                    onClick: () => handleEditSource(source),
                    permission: Permission.CredentialsWrite,
                  },
                  {
                    label: 'Delete',
                    icon: Trash2,
                    onClick: () => handleDeleteClick(source),
                    destructive: true,
                    separatorBefore: true,
                    permission: Permission.CredentialsWrite,
                  },
                ]}
              />
            </Can>
          )
        },
      },
    ],
    [
      handleSync,
      handleToggleEnabled,
      handleEditSource,
      handleDeleteClick,
      isSyncing,
      isEnabling,
      isDisabling,
    ]
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="template sources" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={3} />
  } else if (sources.length === 0) {
    body = (
      <EmptyState
        icon={FolderSync}
        title="No template sources"
        description="Add a source to sync custom templates from Git, S3, or HTTP."
        action={
          <Can permission={Permission.CredentialsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add source
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <DataTable
        columns={columns}
        data={sources}
        getRowId={(src) => src.id}
        searchPlaceholder="Search sources…"
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
        emptyMessage="No sources match your search"
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Template sources"
        description="External Git, S3 and HTTP sources that custom scanner templates are synced from."
      >
        <Can permission={Permission.CredentialsWrite}>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add source
          </Button>
        </Can>
      </PageHeader>

      <div className="mt-5">{body}</div>

      {/* Dialogs */}
      <AddTemplateSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />

      {selectedSource && (
        <EditTemplateSourceDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          source={selectedSource}
          onSuccess={handleRefresh}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete template source"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedSource?.name}</strong>? This will also
            remove all synced templates from this source. This action cannot be undone.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />
    </>
  )
}

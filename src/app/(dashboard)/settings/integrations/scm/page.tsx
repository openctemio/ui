'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { csrfFetch } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import {
  PageHeader,
  EmptyState,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  StackedCell,
  RelativeTime,
  ErrorState,
  MetricStrip,
  type MetricStripItem,
  type RowAction,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Link2,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  GitBranch,
  ExternalLink,
  Clock,
} from 'lucide-react'
import {
  AddConnectionDialog,
  EditConnectionDialog,
  SyncRepositoriesDialog,
  ProviderIcon,
} from '@/features/scm-connections'
import {
  useSCMConnections,
  invalidateSCMConnectionsCache,
} from '@/features/repositories/hooks/use-repositories'
import type { SCMConnection } from '@/features/repositories/types/repository.types'
import { getErrorMessage } from '@/lib/api/error-handler'

// Only a problem (error) is coloured; the other states stay neutral.
const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  connected: {
    label: 'Connected',
    variant: 'default',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  disconnected: {
    label: 'Disconnected',
    variant: 'secondary',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: 'Pending',
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  azure_devops: 'Azure DevOps',
}

export default function SCMConnectionsPage() {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<SCMConnection | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Fetch SCM connections
  const { data: connectionsData, error, isLoading, mutate } = useSCMConnections()

  // Handle the API response format - useSCMConnections returns SCMConnection[] directly
  const connections = useMemo(() => {
    if (!connectionsData) return []
    // Handle both array format and { data: [...] } format
    return Array.isArray(connectionsData) ? connectionsData : []
  }, [connectionsData])

  // Calculate stats - SCMConnection uses repositoryCount (camelCase)
  const stats = useMemo(() => {
    const total = connections.length
    const connected = connections.filter((c) => c.status === 'connected').length
    const errorCount = connections.filter((c) => c.status === 'error').length
    const totalRepos = connections.reduce((sum, c) => sum + (c.repositoryCount || 0), 0)
    return { total, connected, error: errorCount, totalRepos }
  }, [connections])

  const handleRefresh = useCallback(async () => {
    setActionInProgress('refresh')
    try {
      await invalidateSCMConnectionsCache()
      await mutate()
      toast.success('Connections refreshed')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to refresh connections'))
    } finally {
      setActionInProgress(null)
    }
  }, [mutate])

  const handleTestConnection = useCallback(
    async (connection: SCMConnection) => {
      setActionInProgress(connection.id)
      try {
        const response = await csrfFetch(`/api/v1/integrations/${connection.id}/test`, {
          method: 'POST',
        })
        if (!response.ok) throw new Error('Test failed')
        const result = await response.json()
        if (result.status === 'connected') {
          toast.success(`Connection "${connection.name}" is working`)
        } else {
          toast.error(result.status_message || 'Connection test failed')
        }
        await mutate()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to test connection'))
      } finally {
        setActionInProgress(null)
      }
    },
    [mutate]
  )

  const handleDelete = useCallback(async () => {
    if (!selectedConnection) return
    setActionInProgress(selectedConnection.id)
    try {
      const response = await csrfFetch(`/api/v1/integrations/${selectedConnection.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      toast.success(`Connection "${selectedConnection.name}" deleted`)
      await invalidateSCMConnectionsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete connection'))
    } finally {
      setDeleteDialogOpen(false)
      setSelectedConnection(null)
      setActionInProgress(null)
    }
  }, [selectedConnection, mutate])

  const handleEditClick = (connection: SCMConnection) => {
    setSelectedConnection(connection)
    setEditDialogOpen(true)
  }

  const handleSyncClick = (connection: SCMConnection) => {
    setSelectedConnection(connection)
    setSyncDialogOpen(true)
  }

  const handleDeleteClick = (connection: SCMConnection) => {
    setSelectedConnection(connection)
    setDeleteDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<SCMConnection>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Connection" />,
        cell: ({ row }) => {
          const connection = row.original
          return (
            <div className="flex items-center gap-3">
              <ProviderIcon provider={connection.provider} className="h-5 w-5 shrink-0" />
              <StackedCell
                primary={connection.name}
                secondary={
                  <span className="truncate max-w-[200px] inline-block align-bottom">
                    {connection.baseUrl}
                  </span>
                }
              />
            </div>
          )
        },
      },
      {
        accessorKey: 'provider',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Provider" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {PROVIDER_LABELS[row.original.provider] || row.original.provider}
          </Badge>
        ),
      },
      {
        accessorKey: 'scmOrganization',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
        cell: ({ row }) => <span className="text-sm">{row.original.scmOrganization || '-'}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const connection = row.original
          const statusConfig = STATUS_CONFIG[connection.status] || STATUS_CONFIG.pending
          return (
            <>
              <Badge variant={statusConfig.variant} className="gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              {connection.errorMessage && connection.status === 'error' && (
                <p className="mt-1 max-w-[200px] truncate text-xs text-destructive">
                  {connection.errorMessage}
                </p>
              )}
            </>
          )
        },
      },
      {
        id: 'repositories',
        header: 'Repositories',
        enableSorting: false,
        cell: ({ row }) => {
          const connection = row.original
          return (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => handleSyncClick(connection)}
            >
              {connection.repositoryCount || 0} repos
              <ExternalLink className="ms-1 h-3 w-3" />
            </Button>
          )
        },
      },
      {
        accessorKey: 'lastValidatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last verified" />,
        cell: ({ row }) => <RelativeTime date={row.original.lastValidatedAt} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const connection = row.original
          const actions: RowAction[] = [
            {
              label: 'Sync repositories',
              icon: GitBranch,
              onClick: () => handleSyncClick(connection),
            },
            {
              label: 'Test connection',
              icon: Eye,
              onClick: () => handleTestConnection(connection),
            },
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => handleEditClick(connection),
              permission: Permission.ScmConnectionsWrite,
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => handleDeleteClick(connection),
              destructive: true,
              separatorBefore: true,
              permission: Permission.ScmConnectionsDelete,
            },
          ]
          return <DataTableRowActions actions={actions} />
        },
      },
    ],
    [handleTestConnection]
  )

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Connections', value: stats.total },
    { key: 'connected', label: 'Connected', value: stats.connected },
    { key: 'error', label: 'Errors', value: stats.error, tone: 'danger' },
    { key: 'repos', label: 'Repositories', value: stats.totalRepos },
  ]

  return (
    <>
      <Main>
        <PageHeader
          title="SCM connections"
          description="Connect GitHub, GitLab, Bitbucket or Azure DevOps, then import repositories for scanning."
        >
          <Button variant="outline" size="sm" onClick={() => router.push('/assets/repositories')}>
            <GitBranch className="me-2 h-4 w-4" />
            Repositories
          </Button>
          <Can permission={Permission.ScmConnectionsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Add connection
            </Button>
          </Can>
        </PageHeader>

        {error ? (
          <div className="mt-5">
            <ErrorState title="SCM connections" error={error} onRetry={() => void mutate()} />
          </div>
        ) : (
          <>
            <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full max-w-sm" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : connections.length === 0 ? (
                <EmptyState
                  icon={Link2}
                  title="No SCM connections"
                  description="Connect your GitHub, GitLab, Bitbucket, or Azure DevOps account to import and scan repositories."
                  action={
                    <Can permission={Permission.ScmConnectionsWrite}>
                      <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="me-2 h-4 w-4" />
                        Add connection
                      </Button>
                    </Can>
                  }
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={connections}
                  getRowId={(c) => c.id}
                  searchPlaceholder="Search connections..."
                  showSelectionCount={false}
                  toolbarEnd={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Refresh"
                      title="Refresh"
                      onClick={handleRefresh}
                      disabled={actionInProgress === 'refresh'}
                    >
                      {actionInProgress === 'refresh' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  }
                  emptyMessage="No connections match your search"
                />
              )}
            </div>
          </>
        )}
      </Main>

      {/* Dialogs */}
      <AddConnectionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={async () => {
          await invalidateSCMConnectionsCache()
          await mutate()
        }}
      />

      {selectedConnection && (
        <>
          <EditConnectionDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            connection={selectedConnection}
            onSuccess={async () => {
              await invalidateSCMConnectionsCache()
              await mutate()
              setSelectedConnection(null)
            }}
          />

          <SyncRepositoriesDialog
            open={syncDialogOpen}
            onOpenChange={setSyncDialogOpen}
            connection={selectedConnection}
            onSuccess={async () => {
              await mutate()
            }}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete SCM connection"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedConnection?.name}</strong>? This will
            not delete the imported repositories, but you won&apos;t be able to sync them anymore.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={() => void handleDelete()}
      />
    </>
  )
}

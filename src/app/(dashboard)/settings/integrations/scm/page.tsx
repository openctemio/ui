'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Link2,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  GitBranch,
  ArrowLeft,
  ExternalLink,
  Clock,
} from 'lucide-react'
import {
  AddConnectionDialog,
  EditConnectionDialog,
  SyncRepositoriesDialog,
  ProviderIcon,
  SCM_PROVIDER_COLORS,
} from '@/features/scm-connections'
import {
  useSCMConnections,
  invalidateSCMConnectionsCache,
} from '@/features/repositories/hooks/use-repositories'
import type { SCMConnection } from '@/features/repositories/types/repository.types'
import { getErrorMessage } from '@/lib/api/error-handler'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  connected: {
    label: 'Connected',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  disconnected: {
    label: 'Disconnected',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  error: {
    label: 'Error',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
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
        const response = await fetch(`/api/v1/integrations/${connection.id}/test`, {
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
      const response = await fetch(`/api/v1/integrations/${selectedConnection.id}`, {
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

  // Error state
  if (error) {
    return (
      <Main>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to load SCM connections</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main>
        {/* Breadcrumb */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/settings/integrations')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Integrations
          </Button>
        </div>

        <PageHeader
          title="SCM Connections"
          description="Manage connections to your source code management providers (GitHub, GitLab, Bitbucket, Azure DevOps)"
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={actionInProgress === 'refresh'}
            >
              {actionInProgress === 'refresh' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Can permission={Permission.ScmConnectionsWrite}>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Total Connections
              </CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Connected
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.connected}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Errors
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.error}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-blue-500" />
                Total Repositories
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.totalRepos}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Connections Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              All Connections
            </CardTitle>
            <CardDescription>
              Source code management provider connections for importing repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <Link2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No SCM Connections</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your GitHub, GitLab, Bitbucket, or Azure DevOps account to import and scan
                  repositories.
                </p>
                <Can permission={Permission.ScmConnectionsWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Connection
                  </Button>
                </Can>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connection</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Repositories</TableHead>
                      <TableHead>Last Verified</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((connection) => {
                      const statusConfig = STATUS_CONFIG[connection.status] || STATUS_CONFIG.pending
                      return (
                        <TableRow key={connection.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg',
                                  SCM_PROVIDER_COLORS[connection.provider] || 'bg-gray-100'
                                )}
                              >
                                <ProviderIcon provider={connection.provider} className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{connection.name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {connection.baseUrl}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {PROVIDER_LABELS[connection.provider] || connection.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{connection.scmOrganization || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                            {connection.errorMessage && connection.status === 'error' && (
                              <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                                {connection.errorMessage}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-500"
                              onClick={() => handleSyncClick(connection)}
                            >
                              {connection.repositoryCount || 0} repos
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {connection.lastValidatedAt
                                ? new Date(connection.lastValidatedAt).toLocaleDateString()
                                : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={actionInProgress === connection.id}
                                >
                                  {actionInProgress === connection.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSyncClick(connection)}>
                                  <GitBranch className="mr-2 h-4 w-4" />
                                  Sync Repositories
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTestConnection(connection)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Test Connection
                                </DropdownMenuItem>
                                <Can permission={Permission.ScmConnectionsWrite}>
                                  <DropdownMenuItem onClick={() => handleEditClick(connection)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </Can>
                                <Can permission={Permission.ScmConnectionsDelete}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleDeleteClick(connection)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </Can>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <GitBranch className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-500 mb-1">Import Repositories</h4>
                <p className="text-sm text-muted-foreground">
                  After adding a connection, go to{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-blue-500"
                    onClick={() => router.push('/assets/repositories')}
                  >
                    Discovery &gt; Repositories
                  </Button>{' '}
                  to import and manage your repositories for security scanning.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SCM Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedConnection?.name}</strong>? This will
              not delete the imported repositories, but you won&apos;t be able to sync them anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

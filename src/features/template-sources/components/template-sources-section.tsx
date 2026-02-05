'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  FolderSync,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  GitBranch,
  Database,
  Globe,
  MoreHorizontal,
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

  const colorMap: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    syncing: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    disabled: 'bg-gray-100 text-gray-500',
  }

  const IconMap: Record<string, React.ElementType> = {
    pending: Clock,
    syncing: RefreshCw,
    success: CheckCircle,
    failed: XCircle,
    disabled: Pause,
  }

  const Icon = IconMap[status] || Clock
  const className = colorMap[status] || colorMap.pending

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter sources
  const filteredSources = useMemo(() => {
    if (!searchQuery) return sources
    const query = searchQuery.toLowerCase()
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        getSourceDisplayUrl(s).toLowerCase().includes(query)
    )
  }, [sources, searchQuery])

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

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load template sources</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderSync className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Template Sources</CardTitle>
                  <CardDescription>
                    External sources for custom scanner templates (Git, S3, HTTP)
                  </CardDescription>
                </div>
                {!isLoading && sources.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {sources.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Can permission={Permission.CredentialsWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Source
                  </Button>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredSources.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSources.map((source) => {
                    const Icon = SOURCE_TYPE_ICONS[source.source_type] || Globe
                    return (
                      <TableRow key={source.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 font-medium">
                                {source.name}
                                {!source.is_enabled && (
                                  <Badge variant="outline" className="text-xs">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                                      {getSourceDisplayUrl(source)}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{getSourceDisplayUrl(source)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SOURCE_TYPE_DISPLAY_NAMES[source.source_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{source.template_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatSyncTime(source.last_sync_at)}
                          </span>
                          {source.templates_synced != null && source.templates_synced > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({source.templates_synced} templates)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <SyncStatusBadge status={source.last_sync_status} />
                        </TableCell>
                        <TableCell>
                          <Can
                            permission={[Permission.CredentialsWrite, Permission.CredentialsWrite]}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <Can permission={Permission.CredentialsWrite}>
                                  <DropdownMenuItem
                                    onClick={() => handleSync(source)}
                                    disabled={isSyncing || !source.is_enabled}
                                  >
                                    <RefreshCw
                                      className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                                    />
                                    Sync Now
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleEnabled(source)}
                                    disabled={isEnabling || isDisabling}
                                  >
                                    {source.is_enabled ? (
                                      <>
                                        <Pause className="mr-2 h-4 w-4" />
                                        Disable
                                      </>
                                    ) : (
                                      <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Enable
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditSource(source)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </Can>
                                <Can permission={Permission.CredentialsWrite}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleDeleteClick(source)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </Can>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Can>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FolderSync className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Template Sources Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No sources match your search criteria.'
                    : 'Add a source to sync custom templates from Git, S3, or HTTP.'}
                </p>
                {!searchQuery && (
                  <Can permission={Permission.CredentialsWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Source
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSource?.name}</strong>? This will
              also remove all synced templates from this source. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

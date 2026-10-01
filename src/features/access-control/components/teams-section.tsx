'use client'

import type { ReactNode } from 'react'

import { useState, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  MetricStrip,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Pencil, Loader2, AlertCircle, FolderKey, RefreshCw } from 'lucide-react'
import { useSWRConfig } from 'swr'
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  type Group,
  generateSlug,
} from '@/features/access-control'
import { GroupDetailSheet } from '@/features/access-control/components/group-detail-sheet'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface SectionProps {
  /**
   * Renders the page header with this section's actions (its Create button),
   * so the page keeps one header and one set of tabs while each section keeps
   * its own dialogs and state.
   */
  header: (actions: ReactNode) => ReactNode
}

/** The Teams tab of /settings/teams (moved from its own page; content unchanged). */
export function TeamsSection({ header }: SectionProps) {
  const { mutate } = useSWRConfig()

  // API Hooks
  const { groups, uniqueMemberCount, isLoading, isError, mutate: mutateGroups } = useGroups()
  const { createGroup, isCreating } = useCreateGroup()

  // UI State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  })

  // Delete hook - need to pass groupId
  const { deleteGroup, isDeleting } = useDeleteGroup(groupToDelete?.id || null)

  // Refresh data
  const refreshData = useCallback(() => {
    mutateGroups()
  }, [mutateGroups])

  // Calculate stats
  const totalGroups = groups.length
  const totalAssets = groups.reduce((acc, g) => acc + (g.asset_count ?? 0), 0)

  // Table columns
  const columns: ColumnDef<Group>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="text-muted-foreground text-xs line-clamp-1">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'member_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.member_count ?? 0}</span>
      ),
    },
    {
      accessorKey: 'asset_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.asset_count ?? 0}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const group = row.original

        return (
          <DataTableRowActions
            actions={[
              { label: 'View details', icon: Eye, onClick: () => setSelectedGroupId(group.id) },
              {
                label: 'Edit team',
                icon: Pencil,
                permission: Permission.GroupsWrite,
                onClick: () => setSelectedGroupId(group.id),
              },
              {
                label: 'Delete team',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                permission: Permission.GroupsDelete,
                onClick: () => {
                  setGroupToDelete(group)
                  setDeleteDialogOpen(true)
                },
              },
            ]}
          />
        )
      },
    },
  ]

  // Actions
  const handleCreateGroup = async () => {
    if (!createForm.name) {
      toast.error('Please enter a team name')
      return
    }

    try {
      await createGroup({
        slug: generateSlug(createForm.name),
        name: createForm.name,
        description: createForm.description || undefined,
        group_type: 'team', // Default type for data scoping groups
      })
      toast.success(`Team "${createForm.name}" created successfully`)
      setCreateDialogOpen(false)
      setCreateForm({ name: '', description: '' })
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create team'))
    }
  }

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return

    try {
      await deleteGroup()
      toast.success(`Team "${groupToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
      // Invalidate all group-related caches
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/v1/groups'),
        undefined,
        { revalidate: true }
      )
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete team'))
    }
  }

  return (
    <>
      {header(
        <>
          <Can permission={Permission.GroupsWrite} mode="disable">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Create team
            </Button>
          </Can>
        </>
      )}

      {isError && !isLoading ? (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load teams</AlertTitle>
          <AlertDescription>
            <p>The team list could not be loaded.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={refreshData}>
              <RefreshCw className="me-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <MetricStrip
            className="mt-5"
            loading={isLoading}
            items={[
              { key: 'teams', label: 'Teams', value: totalGroups },
              { key: 'members', label: 'Members', value: uniqueMemberCount },
              { key: 'assets', label: 'Assigned assets', value: totalAssets },
            ]}
          />

          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full max-w-sm" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={FolderKey}
                title="No teams yet"
                description="Create a team to group users and scope their access to assets."
                action={
                  <Can permission={Permission.GroupsWrite}>
                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="me-2 h-4 w-4" />
                      Create team
                    </Button>
                  </Can>
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={groups}
                getRowId={(g) => g.id}
                searchPlaceholder="Search teams..."
                onRowClick={(g) => setSelectedGroupId(g.id)}
                showColumnToggle={false}
                emptyMessage="No teams match your search"
              />
            )}
          </div>
        </>
      )}

      {/* Group Detail Sheet */}
      <GroupDetailSheet
        groupId={selectedGroupId}
        open={!!selectedGroupId}
        onOpenChange={(open) => !open && setSelectedGroupId(null)}
        onUpdate={refreshData}
      />

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
            <DialogDescription>
              Create a new team to organize users and control access to assets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Team name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Security Team, DevOps"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                placeholder="Describe the purpose of this group..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={isCreating || !createForm.name}>
              {isCreating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="me-2 h-4 w-4" />
              )}
              Create team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the team &quot;{groupToDelete?.name}&quot;? This
              action cannot be undone. Members will lose access to assets owned by this team.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setGroupToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              Delete team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

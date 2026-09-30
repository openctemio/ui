'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  MetricStrip,
  type RowAction,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Shield,
  Trash2,
  Search as SearchIcon,
  Eye,
  Pencil,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useSWRConfig } from 'swr'
import {
  useRoles,
  useDeleteRole,
  type Role,
  CreateRoleSheet,
  RoleDetailSheet,
  EditRoleSheet,
  filterPermissionsByTenantModules,
} from '@/features/access-control'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'
import { useUrlFilter } from '@/hooks/use-url-param'

type TypeFilter = 'all' | 'system' | 'custom'

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'system', label: 'System' },
  { value: 'custom', label: 'Custom' },
]

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function RolesPage() {
  const { mutate } = useSWRConfig()

  // API Hooks
  const { roles, isLoading, isError, mutate: mutateRoles } = useRoles()
  const { moduleIds: enabledModuleIds } = useTenantModules()

  // Helper to get filtered permission count based on tenant's modules
  const getFilteredPermissionCount = useCallback(
    (role: Role) => {
      if (!enabledModuleIds.length) return role.permission_count
      return filterPermissionsByTenantModules(role.permissions, enabledModuleIds).length
    },
    [enabledModuleIds]
  )

  // UI State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [pendingEditRole, setPendingEditRole] = useState<Role | null>(null) // For transition from detail to edit
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [typeParam, setTypeFilter] = useUrlFilter('type', 'all')
  const typeFilter: TypeFilter =
    typeParam === 'system' || typeParam === 'custom' ? typeParam : 'all'

  // Handle transition from detail sheet to edit sheet
  // When detail sheet closes and there's a pending edit, open the edit sheet
  useEffect(() => {
    if (!selectedRole && pendingEditRole) {
      // Small delay to ensure detail sheet animation is complete
      const timer = setTimeout(() => {
        setEditRole(pendingEditRole)
        setPendingEditRole(null)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedRole, pendingEditRole])

  // Ensure mutual exclusivity: when edit sheet opens, close detail sheet
  useEffect(() => {
    if (editRole && selectedRole) {
      setSelectedRole(null)
    }
  }, [editRole, selectedRole])

  // Delete hook
  const { deleteRole, isDeleting } = useDeleteRole(roleToDelete?.id || null)

  // Refresh data
  const refreshData = useCallback(() => {
    mutateRoles()
  }, [mutateRoles])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...roles]

    if (typeFilter === 'system') {
      data = data.filter((role) => role.is_system)
    } else if (typeFilter === 'custom') {
      data = data.filter((role) => !role.is_system)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      data = data.filter(
        (role) =>
          role.name.toLowerCase().includes(q) ||
          role.slug.toLowerCase().includes(q) ||
          role.description?.toLowerCase().includes(q)
      )
    }

    return data
  }, [roles, typeFilter, searchQuery])

  // Type counts
  const typeCounts = useMemo(
    () => ({
      all: roles.length,
      system: roles.filter((r) => r.is_system).length,
      custom: roles.filter((r) => !r.is_system).length,
    }),
    [roles]
  )

  // Table columns
  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{row.original.name}</p>
            {row.original.is_system && (
              <Badge variant="outline" className="text-xs">
                System
              </Badge>
            )}
          </div>
          {row.original.description && (
            <p className="text-muted-foreground text-xs line-clamp-1">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'permission_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Permissions" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{getFilteredPermissionCount(row.original)}</span>
      ),
    },
    {
      accessorKey: 'has_full_data_access',
      header: 'Data access',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant={row.original.has_full_data_access ? 'default' : 'secondary'}
          className="text-xs"
        >
          {row.original.has_full_data_access ? 'Full access' : 'Team-based'}
        </Badge>
      ),
    },
    {
      accessorKey: 'hierarchy_level',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Level" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.original.hierarchy_level}
        </span>
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
        const role = row.original

        const actions: RowAction[] = [
          { label: 'View details', icon: Eye, onClick: () => setSelectedRole(role) },
          ...(!role.is_system
            ? [
                {
                  label: 'Edit role',
                  icon: Pencil,
                  permission: Permission.RolesWrite,
                  onClick: () => setEditRole(role),
                },
                {
                  label: 'Delete role',
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  permission: Permission.RolesDelete,
                  onClick: () => {
                    setRoleToDelete(role)
                    setDeleteDialogOpen(true)
                  },
                },
              ]
            : []),
        ]

        return <DataTableRowActions actions={actions} />
      },
    },
  ]

  // Actions
  const handleDeleteRole = async () => {
    if (!roleToDelete) return

    try {
      await deleteRole()
      toast.success(`Role "${roleToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/v1/roles'),
        undefined,
        { revalidate: true }
      )
      refreshData()
    } catch (error) {
      toast.error(
        `Failed to delete role: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const toggleType = (next: TypeFilter) => setTypeFilter(typeFilter === next ? 'all' : next)

  return (
    <>
      <Main>
        <PageHeader
          title="Roles"
          description="Roles bundle permissions; a user can hold several roles."
        >
          <Can permission={Permission.RolesWrite}>
            <Button size="sm" onClick={() => setCreateSheetOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Create role
            </Button>
          </Can>
        </PageHeader>

        {isError && !isLoading ? (
          <Alert variant="destructive" className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load roles</AlertTitle>
            <AlertDescription>
              <p>The role list could not be loaded.</p>
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
                {
                  key: 'all',
                  label: 'Roles',
                  value: typeCounts.all,
                  onClick: () => setTypeFilter('all'),
                  active: typeFilter === 'all',
                },
                {
                  key: 'system',
                  label: 'System roles',
                  value: typeCounts.system,
                  onClick: () => toggleType('system'),
                  active: typeFilter === 'system',
                },
                {
                  key: 'custom',
                  label: 'Custom roles',
                  value: typeCounts.custom,
                  onClick: () => toggleType('custom'),
                  active: typeFilter === 'custom',
                },
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
              ) : roles.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No roles yet"
                  description="Create a role to grant a set of permissions to users."
                  action={
                    <Can permission={Permission.RolesWrite}>
                      <Button size="sm" onClick={() => setCreateSheetOpen(true)}>
                        <Plus className="me-2 h-4 w-4" />
                        Create role
                      </Button>
                    </Can>
                  }
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredData}
                  getRowId={(r) => r.id}
                  showSearch={false}
                  showColumnToggle={false}
                  onRowClick={(r) => setSelectedRole(r)}
                  toolbarStart={
                    <>
                      <div className="relative min-w-0 flex-1 sm:max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search roles..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="ps-9"
                          aria-label="Search roles"
                        />
                      </div>
                      <Select
                        value={typeFilter}
                        onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                      >
                        <SelectTrigger className="h-9 w-[130px]" aria-label="Role type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {typeFilters.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                  emptyMessage="No roles match these filters"
                />
              )}
            </div>
          </>
        )}
      </Main>

      {/* Create Role Sheet */}
      <CreateRoleSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        onSuccess={refreshData}
      />

      {/* Role Detail Sheet */}
      <RoleDetailSheet
        role={selectedRole}
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
        onEdit={(role) => {
          // Use pending edit pattern to wait for detail sheet to close
          setPendingEditRole(role)
          setSelectedRole(null) // This triggers the close animation
        }}
        onDelete={(role) => {
          setRoleToDelete(role)
          setDeleteDialogOpen(true)
          setSelectedRole(null)
        }}
      />

      {/* Edit Role Sheet */}
      <EditRoleSheet
        role={editRole}
        open={!!editRole}
        onOpenChange={(open) => !open && setEditRole(null)}
        onSuccess={() => {
          setEditRole(null)
          refreshData()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;? This action
              cannot be undone. Users with this role will lose its permissions.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRoleToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

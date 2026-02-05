'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Shield,
  MoreHorizontal,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search as SearchIcon,
  Eye,
  Pencil,
  Loader2,
  AlertCircle,
  Crown,
  ShieldCheck,
  User,
  Lock,
  Key,
  Database,
} from 'lucide-react'
import { useSWRConfig } from 'swr'
import {
  useRoles,
  useDeleteRole,
  type Role,
  getRoleConfig,
  CreateRoleSheet,
  RoleDetailSheet,
  EditRoleSheet,
  filterPermissionsByTenantModules,
} from '@/features/access-control'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'

type TypeFilter = 'all' | 'system' | 'custom'

const typeFilters: { value: TypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Roles', icon: <Shield className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Lock className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', icon: <Key className="h-4 w-4" /> },
]

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Get icon for role based on slug
const getRoleIcon = (slug: string, isSystem: boolean) => {
  if (!isSystem) return Key
  switch (slug) {
    case 'owner':
      return Crown
    case 'admin':
      return ShieldCheck
    case 'member':
      return User
    case 'viewer':
      return Eye
    default:
      return Shield
  }
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [rowSelection, setRowSelection] = useState({})

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

    return data
  }, [roles, typeFilter])

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
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={row.original.is_system}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const config = getRoleConfig(row.original.slug, row.original.is_system)
        const Icon = getRoleIcon(row.original.slug, row.original.is_system)
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{row.original.name}</p>
                {row.original.is_system && (
                  <Badge variant="outline" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
              {row.original.description && (
                <p className="text-muted-foreground text-xs line-clamp-1">
                  {row.original.description}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'permission_count',
      header: 'Permissions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{getFilteredPermissionCount(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'has_full_data_access',
      header: 'Data Access',
      cell: ({ row }) => (
        <Badge
          variant={row.original.has_full_data_access ? 'default' : 'secondary'}
          className="text-xs"
        >
          {row.original.has_full_data_access ? (
            <>
              <Database className="mr-1 h-3 w-3" />
              Full Access
            </>
          ) : (
            'Group-based'
          )}
        </Badge>
      ),
    },
    {
      accessorKey: 'hierarchy_level',
      header: 'Level',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.hierarchy_level}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const role = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedRole(role)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {!role.is_system && (
                <>
                  <Can permission={Permission.RolesWrite}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditRole(role)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Role
                    </DropdownMenuItem>
                  </Can>
                  <Can permission={Permission.RolesDelete}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRoleToDelete(role)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Role
                    </DropdownMenuItem>
                  </Can>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

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

  // Active filters count
  const activeFiltersCount = [typeFilter !== 'all'].filter(Boolean).length

  const clearFilters = () => {
    setTypeFilter('all')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Roles"
          description="Manage roles and their permissions. Users can have multiple roles."
        >
          <Can permission={Permission.RolesWrite}>
            <Button onClick={() => setCreateSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </Can>
        </PageHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="mt-6 flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-muted-foreground">Failed to load roles</p>
            <Button variant="outline" onClick={refreshData}>
              Try Again
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${typeFilter === 'all' ? 'border-primary' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Total Roles
                  </CardDescription>
                  <CardTitle className="text-3xl">{typeCounts.all}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-blue-500 transition-colors ${typeFilter === 'system' ? 'border-blue-500' : ''}`}
                onClick={() => setTypeFilter('system')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-500" />
                    System Roles
                  </CardDescription>
                  <CardTitle className="text-3xl text-blue-500">{typeCounts.system}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-purple-500 transition-colors ${typeFilter === 'custom' ? 'border-purple-500' : ''}`}
                onClick={() => setTypeFilter('custom')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-purple-500" />
                    Custom Roles
                  </CardDescription>
                  <CardTitle className="text-3xl text-purple-500">{typeCounts.custom}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Roles Table */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">All Roles</CardTitle>
                    <CardDescription>Manage roles and their permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Filter Tabs */}
                <Tabs
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                  className="mb-4"
                >
                  <TabsList>
                    {typeFilters.map((filter) => (
                      <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                        {filter.icon}
                        {filter.label}
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {typeCounts[filter.value]}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Search and Filters */}
                <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search roles..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}

                    {Object.keys(rowSelection).length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {Object.keys(rowSelection).length} selected
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => toast.info('Bulk delete not implemented yet')}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer"
                            onClick={(e) => {
                              if (
                                (e.target as HTMLElement).closest('[role="checkbox"]') ||
                                (e.target as HTMLElement).closest('button')
                              ) {
                                return
                              }
                              setSelectedRole(row.original)
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            {roles.length === 0 ? (
                              <div className="flex flex-col items-center gap-2">
                                <Shield className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No roles yet</p>
                                <Can permission={Permission.RolesWrite}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateSheetOpen(true)}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create your first role
                                  </Button>
                                </Can>
                              </div>
                            ) : (
                              'No roles found.'
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {table.getState().pagination.pageIndex + 1} of{' '}
                      {table.getPageCount() || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Delete Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;? This action
              cannot be undone. Users with this role will lose its permissions.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRoleToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

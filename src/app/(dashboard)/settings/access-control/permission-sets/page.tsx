'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Shield,
  Plus,
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
  Lock,
  KeyRound,
  Settings,
} from 'lucide-react'
import {
  usePermissionSets,
  useCreatePermissionSet,
  useDeletePermissionSet,
  type PermissionSet,
  PermissionCategories,
  generateSlug,
  formatDate,
} from '@/features/access-control'
import { PermissionSetDetailSheet } from '@/features/access-control/components/permission-set-detail-sheet'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'

type FilterType = 'all' | 'system' | 'custom'

const typeFilters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Shield className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Lock className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', icon: <Settings className="h-4 w-4" /> },
]

export default function PermissionSetsPage() {
  // API Hooks
  const { permissionSets, isLoading, isError, mutate: mutatePermissionSets } = usePermissionSets()
  const { createPermissionSet, isCreating } = useCreatePermissionSet()

  // UI State
  const [selectedPermissionSetId, setSelectedPermissionSetId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionSetToDelete, setPermissionSetToDelete] = useState<PermissionSet | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  })

  // Delete hook
  const { deletePermissionSet, isDeleting } = useDeletePermissionSet(
    permissionSetToDelete?.id || null
  )

  // Refresh data
  const refreshData = useCallback(() => {
    mutatePermissionSets()
  }, [mutatePermissionSets])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...permissionSets]

    if (typeFilter === 'system') {
      data = data.filter((ps) => ps.is_system)
    } else if (typeFilter === 'custom') {
      data = data.filter((ps) => !ps.is_system)
    }

    return data
  }, [permissionSets, typeFilter])

  // Type counts
  const typeCounts = useMemo(
    () => ({
      all: permissionSets.length,
      system: permissionSets.filter((ps) => ps.is_system).length,
      custom: permissionSets.filter((ps) => !ps.is_system).length,
    }),
    [permissionSets]
  )

  // Table columns
  const columns: ColumnDef<PermissionSet>[] = [
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
          Permission Set
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isSystem = row.original.is_system
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSystem ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
              {isSystem ? (
                <Lock className={`h-4 w-4 text-purple-500`} />
              ) : (
                <KeyRound className={`h-4 w-4 text-blue-500`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{row.original.name}</p>
                {isSystem && (
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
        <Badge variant="secondary">{row.original.permission_count} permissions</Badge>
      ),
    },
    {
      accessorKey: 'group_count',
      header: 'Groups',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.original.group_count}</span>
        </div>
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
        const permissionSet = row.original
        const isSystem = permissionSet.is_system

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedPermissionSetId(permissionSet.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {!isSystem && (
                <>
                  <Can permission={Permission.PermissionSetsWrite}>
                    <DropdownMenuItem onClick={() => setSelectedPermissionSetId(permissionSet.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </Can>
                  <Can permission={Permission.PermissionSetsDelete}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={() => {
                        setPermissionSetToDelete(permissionSet)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
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
    enableRowSelection: (row) => !row.original.is_system,
  })

  // Toggle permission in create form
  const togglePermission = (permission: string) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  // Actions
  const handleCreatePermissionSet = async () => {
    if (!createForm.name) {
      toast.error('Please enter a name')
      return
    }

    if (createForm.permissions.length === 0) {
      toast.error('Please select at least one permission')
      return
    }

    try {
      await createPermissionSet({
        slug: generateSlug(createForm.name),
        name: createForm.name,
        description: createForm.description || undefined,
        set_type: 'custom',
        permissions: createForm.permissions,
      })
      toast.success(`Permission set "${createForm.name}" created successfully`)
      setCreateDialogOpen(false)
      setCreateForm({ name: '', description: '', permissions: [] })
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create permission set'))
    }
  }

  const handleDeletePermissionSet = async () => {
    if (!permissionSetToDelete) return

    try {
      await deletePermissionSet()
      toast.success(`Permission set "${permissionSetToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setPermissionSetToDelete(null)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete permission set'))
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
          title="Permission Sets"
          description="Manage permission sets that can be assigned to groups"
        >
          <Can permission={Permission.PermissionSetsWrite} mode="disable">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Permission Set
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
            <p className="text-muted-foreground">Failed to load permission sets</p>
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
                    Total Permission Sets
                  </CardDescription>
                  <CardTitle className="text-3xl">{typeCounts.all}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-purple-500 transition-colors ${typeFilter === 'system' ? 'border-purple-500' : ''}`}
                onClick={() => setTypeFilter('system')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-500" />
                    System (Read-only)
                  </CardDescription>
                  <CardTitle className="text-3xl text-purple-500">{typeCounts.system}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-blue-500 transition-colors ${typeFilter === 'custom' ? 'border-blue-500' : ''}`}
                onClick={() => setTypeFilter('custom')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-500" />
                    Custom
                  </CardDescription>
                  <CardTitle className="text-3xl text-blue-500">{typeCounts.custom}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Permission Sets Table */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">All Permission Sets</CardTitle>
                    <CardDescription>
                      System permission sets are read-only and cannot be modified
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Filter Tabs */}
                <Tabs
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as FilterType)}
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
                      placeholder="Search permission sets..."
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
                              setSelectedPermissionSetId(row.original.id)
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
                            {permissionSets.length === 0 ? (
                              <div className="flex flex-col items-center gap-2">
                                <Shield className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No permission sets yet</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCreateDialogOpen(true)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create your first permission set
                                </Button>
                              </div>
                            ) : (
                              'No permission sets found.'
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

      {/* Permission Set Detail Sheet */}
      <PermissionSetDetailSheet
        permissionSetId={selectedPermissionSetId}
        open={!!selectedPermissionSetId}
        onOpenChange={(open) => !open && setSelectedPermissionSetId(null)}
        onUpdate={refreshData}
      />

      {/* Create Permission Set Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              Create Permission Set
            </DialogTitle>
            <DialogDescription>
              Create a custom permission set with specific permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="permission-set-name">Name</Label>
              <Input
                id="permission-set-name"
                placeholder="e.g., Developer Access"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="permission-set-description">Description (optional)</Label>
              <Textarea
                id="permission-set-description"
                placeholder="Describe what this permission set grants..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Permissions Selection */}
            <div className="space-y-4">
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground">
                Selected: {createForm.permissions.length} permissions
              </p>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {PermissionCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.permissions.map((permission) => {
                        const isSelected = createForm.permissions.includes(permission.key)
                        return (
                          <div
                            key={permission.key}
                            onClick={() => togglePermission(permission.key)}
                            className={`
                              flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                              ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-muted-foreground/30'
                              }
                            `}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePermission(permission.key)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{permission.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermissionSet}
              disabled={isCreating || !createForm.name || createForm.permissions.length === 0}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Permission Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Delete Permission Set
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the permission set &quot;{permissionSetToDelete?.name}
              &quot;? This action cannot be undone. Groups using this permission set will lose these
              permissions.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPermissionSetToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePermissionSet} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  GitBranch,
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
  Play,
  Target,
  Zap,
  ZapOff,
} from 'lucide-react'
import {
  useAssignmentRules,
  useCreateAssignmentRule,
  useDeleteAssignmentRule,
  useGroups,
  type AssignmentRule,
  formatDate,
} from '@/features/access-control'
import { AssignmentRuleDetailSheet } from '@/features/access-control/components/assignment-rule-detail-sheet'
import { getErrorMessage } from '@/lib/api/error-handler'
import { fetcherWithOptions } from '@/lib/api/client'
import { Can, Permission } from '@/lib/permissions'

type FilterType = 'all' | 'active' | 'inactive'

const typeFilters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <GitBranch className="h-4 w-4" /> },
  { value: 'active', label: 'Active', icon: <Zap className="h-4 w-4" /> },
  { value: 'inactive', label: 'Inactive', icon: <ZapOff className="h-4 w-4" /> },
]

const CONDITION_LABELS: Record<string, string> = {
  asset_type: 'Asset Type',
  finding_severity: 'Severity',
  asset_status: 'Status',
  asset_criticality: 'Criticality',
}

const CONDITION_OPTIONS: Record<string, string[]> = {
  asset_type: [
    'host',
    'website',
    'domain',
    'ip_address',
    'network',
    'cloud_resource',
    'repository',
    'container',
    'api_endpoint',
  ],
  finding_severity: ['critical', 'high', 'medium', 'low', 'info'],
  asset_status: ['active', 'inactive', 'decommissioned'],
  asset_criticality: ['critical', 'high', 'medium', 'low'],
}

export default function AssignmentRulesPage() {
  // API Hooks
  const { assignmentRules, isLoading, isError, mutate: mutateRules } = useAssignmentRules()
  const { createAssignmentRule, isCreating } = useCreateAssignmentRule()
  const { groups } = useGroups()

  // UI State
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<AssignmentRule | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    priority: 0,
    target_group_id: '',
    conditions: {} as Record<string, string[]>,
  })

  // Delete hook
  const { deleteAssignmentRule, isDeleting } = useDeleteAssignmentRule(ruleToDelete?.id || null)

  // Group lookup map: id → name
  const groupMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of groups) {
      map[g.id] = g.name
    }
    return map
  }, [groups])

  // Refresh data
  const refreshData = useCallback(() => {
    mutateRules()
  }, [mutateRules])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...assignmentRules]

    if (typeFilter === 'active') {
      data = data.filter((r) => r.is_active)
    } else if (typeFilter === 'inactive') {
      data = data.filter((r) => !r.is_active)
    }

    return data
  }, [assignmentRules, typeFilter])

  // Type counts
  const typeCounts = useMemo(
    () => ({
      all: assignmentRules.length,
      active: assignmentRules.filter((r) => r.is_active).length,
      inactive: assignmentRules.filter((r) => !r.is_active).length,
    }),
    [assignmentRules]
  )

  // Table columns
  const columns: ColumnDef<AssignmentRule>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Rule
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500/20' : 'bg-muted'}`}>
              <GitBranch
                className={`h-4 w-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{row.original.name}</p>
                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
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
      accessorKey: 'target_group_id',
      header: 'Target Group',
      cell: ({ row }) => {
        const name = groupMap[row.original.target_group_id]
        return (
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{name || 'Unknown Group'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <Badge variant="outline">{row.original.priority}</Badge>,
    },
    {
      id: 'conditions',
      header: 'Conditions',
      cell: ({ row }) => {
        const conditions = row.original.conditions || {}
        const keys = Object.keys(conditions)
        if (keys.length === 0) {
          return <span className="text-xs text-muted-foreground">No conditions</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {keys.map((key) => (
              <Badge key={key} variant="outline" className="text-xs">
                {CONDITION_LABELS[key] || key}: {conditions[key].join(', ')}
              </Badge>
            ))}
          </div>
        )
      },
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
        const rule = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedRuleId(rule.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssignmentRulesWrite}>
                <DropdownMenuItem onClick={() => setSelectedRuleId(rule.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const result = await fetcherWithOptions<{ total_matched: number }>(
                        `/api/v1/assignment-rules/${rule.id}/test`,
                        { method: 'POST' }
                      )
                      if (result) {
                        toast.success(`Rule matched ${result.total_matched} asset(s)`)
                      }
                    } catch (error) {
                      toast.error(getErrorMessage(error, 'Failed to test rule'))
                    }
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Rule
                </DropdownMenuItem>
              </Can>
              <Can permission={Permission.AssignmentRulesDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={() => {
                    setRuleToDelete(rule)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </Can>
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
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Actions
  const handleCreateRule = async () => {
    if (!createForm.name) {
      toast.error('Please enter a rule name')
      return
    }
    if (!createForm.target_group_id) {
      toast.error('Please select a target group')
      return
    }

    try {
      // Filter out empty condition arrays
      const conditions: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(createForm.conditions)) {
        if (values.length > 0) conditions[key] = values
      }

      await createAssignmentRule({
        name: createForm.name,
        description: createForm.description || undefined,
        priority: createForm.priority,
        target_group_id: createForm.target_group_id,
        conditions,
      })
      toast.success(`Assignment rule "${createForm.name}" created successfully`)
      setCreateDialogOpen(false)
      setCreateForm({ name: '', description: '', priority: 0, target_group_id: '', conditions: {} })
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create assignment rule'))
    }
  }

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      await deleteAssignmentRule()
      toast.success(`Assignment rule "${ruleToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setRuleToDelete(null)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete assignment rule'))
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Assignment Rules"
          description="Manage rules that automatically assign assets to groups"
        >
          <Can permission={Permission.AssignmentRulesWrite} mode="disable">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
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
            <p className="text-muted-foreground">Failed to load assignment rules</p>
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
                    <GitBranch className="h-4 w-4" />
                    Total Rules
                  </CardDescription>
                  <CardTitle className="text-3xl">{typeCounts.all}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-green-500 transition-colors ${typeFilter === 'active' ? 'border-green-500' : ''}`}
                onClick={() => setTypeFilter('active')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    Active
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-500">{typeCounts.active}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-muted-foreground transition-colors ${typeFilter === 'inactive' ? 'border-muted-foreground' : ''}`}
                onClick={() => setTypeFilter('inactive')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <ZapOff className="h-4 w-4 text-muted-foreground" />
                    Inactive
                  </CardDescription>
                  <CardTitle className="text-3xl text-muted-foreground">
                    {typeCounts.inactive}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Assignment Rules Table */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">All Assignment Rules</CardTitle>
                    <CardDescription>
                      Rules are evaluated in priority order when assigning assets to groups
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

                {/* Search */}
                <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignment rules..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9"
                    />
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
                            className="cursor-pointer"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button')) {
                                return
                              }
                              setSelectedRuleId(row.original.id)
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
                            {assignmentRules.length === 0 ? (
                              <div className="flex flex-col items-center gap-2">
                                <GitBranch className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No assignment rules yet</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCreateDialogOpen(true)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create your first rule
                                </Button>
                              </div>
                            ) : (
                              'No assignment rules found.'
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
                    {table.getFilteredRowModel().rows.length} rule(s)
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

      {/* Detail Sheet */}
      <AssignmentRuleDetailSheet
        ruleId={selectedRuleId}
        open={!!selectedRuleId}
        onOpenChange={(open) => !open && setSelectedRuleId(null)}
        onUpdate={refreshData}
        onDelete={refreshData}
      />

      {/* Create Rule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              Create Assignment Rule
            </DialogTitle>
            <DialogDescription>
              Create a rule to automatically assign assets to a group based on conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Critical assets to Security team"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description (optional)</Label>
              <Textarea
                id="rule-description"
                placeholder="Describe what this rule does..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                type="number"
                value={createForm.priority}
                onChange={(e) =>
                  setCreateForm({ ...createForm, priority: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">Lower numbers have higher priority</p>
            </div>

            <div className="space-y-2">
              <Label>Target Group</Label>
              <Select
                value={createForm.target_group_id}
                onValueChange={(v) => setCreateForm({ ...createForm, target_group_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions Builder */}
          <div className="space-y-3 py-2">
            <Label>Conditions (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Assets matching these conditions will be automatically assigned to the target group.
            </p>
            <div className="space-y-3">
              {Object.entries(CONDITION_OPTIONS).map(([condKey, options]) => {
                const selected = createForm.conditions[condKey] || []
                return (
                  <div key={condKey} className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {CONDITION_LABELS[condKey] || condKey}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt) => {
                        const isSelected = selected.includes(opt)
                        return (
                          <Badge
                            key={opt}
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              const newValues = isSelected
                                ? selected.filter((v) => v !== opt)
                                : [...selected, opt]
                              setCreateForm({
                                ...createForm,
                                conditions: {
                                  ...createForm.conditions,
                                  [condKey]: newValues,
                                },
                              })
                            }}
                          >
                            {opt.replace(/_/g, ' ')}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={isCreating || !createForm.name || !createForm.target_group_id}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Rule
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
              Delete Assignment Rule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{ruleToDelete?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRuleToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={isDeleting}>
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

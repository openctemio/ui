'use client'

import { useState, useMemo } from 'react'
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
import { PageHeader, StatusBadge, RiskScoreBadge } from '@/features/shared'
import {
  AssetDetailSheet,
  StatCard,
  StatsGrid,
  SectionTitle,
  ClassificationBadges,
} from '@/features/assets'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Cpu,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Clock,
  Zap,
  Cloud,
  Network,
} from 'lucide-react'
import {
  useAssets,
  deleteAsset,
  bulkDeleteAssets,
  getAssetRelationships,
  type Asset,
} from '@/features/assets'
import type { Status } from '@/features/shared/types'
import type { CloudProvider } from '@/features/assets/types/asset.types'

// Filter types
type StatusFilter = Status | 'all'
type RuntimeFilter = 'all' | 'nodejs' | 'python' | 'java' | 'dotnet' | 'go'
type ProviderFilter = 'all' | CloudProvider

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const runtimeFilters: { value: RuntimeFilter; label: string }[] = [
  { value: 'all', label: 'All Runtimes' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'dotnet', label: '.NET' },
  { value: 'go', label: 'Go' },
]

const providerFilters: { value: ProviderFilter; label: string }[] = [
  { value: 'all', label: 'All Providers' },
  { value: 'aws', label: 'AWS Lambda' },
  { value: 'gcp', label: 'GCP Functions' },
  { value: 'azure', label: 'Azure Functions' },
]

const runtimeColors: Record<string, string> = {
  nodejs: 'bg-green-500/10 text-green-500',
  python: 'bg-blue-500/10 text-blue-500',
  java: 'bg-orange-500/10 text-orange-500',
  dotnet: 'bg-purple-500/10 text-purple-500',
  go: 'bg-cyan-500/10 text-cyan-500',
}

const providerColors: Record<string, string> = {
  aws: 'bg-orange-500/10 text-orange-500',
  gcp: 'bg-blue-500/10 text-blue-500',
  azure: 'bg-cyan-500/10 text-cyan-500',
}

const getRuntimeCategory = (runtime: string): string => {
  const r = runtime.toLowerCase()
  if (r.includes('node')) return 'nodejs'
  if (r.includes('python')) return 'python'
  if (r.includes('java')) return 'java'
  if (r.includes('dotnet') || r.includes('.net')) return 'dotnet'
  if (r.includes('go')) return 'go'
  return 'nodejs'
}

export default function ServerlessPage() {
  // Fetch serverless functions from API
  const {
    assets: functions,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['serverless'],
  })

  const [selectedFunction, setSelectedFunction] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [functionToDelete, setFunctionToDelete] = useState<Asset | null>(null)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...functions]
    if (statusFilter !== 'all') {
      data = data.filter((f) => f.status === statusFilter)
    }
    if (runtimeFilter !== 'all') {
      data = data.filter((f) => {
        const runtime = f.metadata.functionRuntime || ''
        return getRuntimeCategory(runtime) === runtimeFilter
      })
    }
    if (providerFilter !== 'all') {
      data = data.filter((f) => f.metadata.cloudProvider === providerFilter)
    }
    return data
  }, [functions, statusFilter, runtimeFilter, providerFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: functions.length,
      active: functions.filter((f) => f.status === 'active').length,
      inactive: functions.filter((f) => f.status === 'inactive').length,
      pending: functions.filter((f) => f.status === 'pending').length,
    }),
    [functions]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      vpcEnabled: functions.filter((f) => f.metadata.functionVpcEnabled).length,
      withFindings: functions.filter((f) => f.findingCount > 0).length,
      avgMemory: Math.round(
        functions.reduce((acc, f) => acc + (f.metadata.functionMemory || 0), 0) / functions.length
      ),
    }),
    [functions]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each serverless function
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    functions.forEach((fn) => {
      const match = getScopeMatchesForAsset(
        { id: fn.id, type: 'cloud_resource', name: fn.metadata.functionName || fn.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(fn.id, match)
    })
    return map
  }, [functions, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = functions.map((f) => ({
      id: f.id,
      name: f.metadata.functionName || f.name,
      type: 'cloud_resource' as const,
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [functions, scopeTargets, scopeExclusions])

  // Table columns
  const columns: ColumnDef<Asset>[] = [
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
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Function
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-violet-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">
              {row.original.metadata.functionHandler}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.functionRuntime',
      header: 'Runtime',
      cell: ({ row }) => {
        const runtime = row.original.metadata.functionRuntime || ''
        const category = getRuntimeCategory(runtime)
        return (
          <Badge variant="secondary" className={runtimeColors[category]}>
            {runtime}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = row.original.metadata.cloudProvider || 'aws'
        return (
          <Badge variant="secondary" className={providerColors[provider]}>
            {provider.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.functionMemory',
      header: 'Memory',
      cell: ({ row }) => {
        const memory = row.original.metadata.functionMemory
        return <span className="text-sm">{memory ? `${memory} MB` : '-'}</span>
      },
    },
    {
      accessorKey: 'metadata.functionTimeout',
      header: 'Timeout',
      cell: ({ row }) => {
        const timeout = row.original.metadata.functionTimeout
        return <span className="text-sm">{timeout ? `${timeout}s` : '-'}</span>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'classification',
      header: 'Classification',
      cell: ({ row }) => (
        <ClassificationBadges
          scope={row.original.scope}
          exposure={row.original.exposure}
          size="sm"
          showTooltips
        />
      ),
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => {
        const match = scopeMatchesMap.get(row.original.id)
        if (!match) return <span className="text-muted-foreground">-</span>
        return <ScopeBadge match={match} />
      },
    },
    {
      accessorKey: 'findingCount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Findings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.original.findingCount
        if (count === 0) return <span className="text-muted-foreground">0</span>
        return <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count}</Badge>
      },
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Risk
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const fn = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFunction(fn)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyArn(fn)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ARN
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  toast.info('Scanning function...')
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400"
                onClick={(e) => {
                  e.stopPropagation()
                  setFunctionToDelete(fn)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Handlers
  const handleCopyArn = (fn: Asset) => {
    const arn = `arn:${fn.metadata.cloudProvider}:lambda:${fn.metadata.region}:${fn.metadata.functionName}`
    navigator.clipboard.writeText(arn)
    toast.success('ARN copied to clipboard')
  }

  const handleDeleteFunction = async () => {
    if (!functionToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(functionToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setFunctionToDelete(null)
      toast.success('Function removed from inventory')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete function'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedFunctionIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedFunctionIds.length === 0) return
    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedFunctionIds)
      await mutate()
      setRowSelection({})
      toast.success(`Removed ${selectedFunctionIds.length} functions from inventory`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete functions'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      [
        'Name',
        'Runtime',
        'Provider',
        'Memory (MB)',
        'Timeout (s)',
        'VPC Enabled',
        'Status',
        'Risk Score',
        'Findings',
      ].join(','),
      ...functions.map((f) =>
        [
          f.name,
          f.metadata.functionRuntime || '',
          f.metadata.cloudProvider || '',
          f.metadata.functionMemory || '',
          f.metadata.functionTimeout || '',
          f.metadata.functionVpcEnabled ? 'Yes' : 'No',
          f.status,
          f.riskScore,
          f.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'serverless-functions.csv'
    a.click()
    toast.success('Functions exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Serverless Functions"
          description={`${functions.length} Lambda functions, Cloud Functions, and Azure Functions`}
        >
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Total Functions
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-green-500 transition-colors ${statusFilter === 'active' ? 'border-green-500' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Active
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{statusCounts.active}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                VPC Enabled
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{stats.vpcEnabled}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                With Findings
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-orange-500">{stats.withFindings}</CardTitle>
              )}
            </CardHeader>
          </Card>
        </div>
        <div className="mt-4">
          <ScopeCoverageCard coverage={scopeCoverage} showBreakdown={false} />
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  All Functions
                </CardTitle>
                <CardDescription>Manage your serverless functions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Quick Filter Tabs */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList>
                  {statusFilters.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                      {filter.label}
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {statusCounts[filter.value as keyof typeof statusCounts] || 0}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Select
                  value={runtimeFilter}
                  onValueChange={(v) => setRuntimeFilter(v as RuntimeFilter)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by runtime" />
                  </SelectTrigger>
                  <SelectContent>
                    {runtimeFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={providerFilter}
                  onValueChange={(v) => setProviderFilter(v as ProviderFilter)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search functions..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(rowSelection).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toast.info('Scanning selected functions...')}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rescan Selected
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-400" onClick={handleBulkDelete}>
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
                          setSelectedFunction(row.original)
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
                        No functions found.
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
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
      </Main>

      {/* Function Details Sheet */}
      <AssetDetailSheet
        asset={selectedFunction}
        open={!!selectedFunction}
        onOpenChange={() => setSelectedFunction(null)}
        icon={Cpu}
        iconColor="text-violet-500"
        gradientFrom="from-violet-500/20"
        gradientVia="via-violet-500/10"
        assetTypeName="Serverless Function"
        relationships={selectedFunction ? getAssetRelationships(selectedFunction.id) : []}
        subtitle={
          selectedFunction
            ? `${selectedFunction.metadata.cloudProvider?.toUpperCase()} - ${selectedFunction.metadata.functionRuntime}`
            : undefined
        }
        onEdit={() => toast.info('Edit functionality coming soon')}
        onDelete={() => {
          if (selectedFunction) {
            setFunctionToDelete(selectedFunction)
            setDeleteDialogOpen(true)
            setSelectedFunction(null)
          }
        }}
        quickActions={
          selectedFunction && (
            <Button size="sm" variant="outline" onClick={() => handleCopyArn(selectedFunction)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy ARN
            </Button>
          )
        }
        statsContent={
          selectedFunction && (
            <StatsGrid columns={2}>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedFunction.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedFunction.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedFunction && (
            <>
              {/* Function Configuration */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Function Configuration</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Runtime</p>
                    <p className="font-medium">
                      {selectedFunction.metadata.functionRuntime || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Handler</p>
                    <p className="font-medium font-mono text-xs">
                      {selectedFunction.metadata.functionHandler || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Memory</p>
                    <p className="font-medium">
                      {selectedFunction.metadata.functionMemory
                        ? `${selectedFunction.metadata.functionMemory} MB`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timeout</p>
                    <p className="font-medium">
                      {selectedFunction.metadata.functionTimeout
                        ? `${selectedFunction.metadata.functionTimeout}s`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Code Size</p>
                    <p className="font-medium">
                      {selectedFunction.metadata.functionCodeSize
                        ? `${(selectedFunction.metadata.functionCodeSize / 1024).toFixed(1)} MB`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Environment Variables</p>
                    <p className="font-medium">{selectedFunction.metadata.functionEnvVars || 0}</p>
                  </div>
                </div>
              </div>

              {/* Cloud & Network */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Cloud and Network</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Cloud
                      className={`h-5 w-5 ${providerColors[selectedFunction.metadata.cloudProvider || 'aws']?.split(' ')[1] || 'text-muted-foreground'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedFunction.metadata.cloudProvider?.toUpperCase() || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Provider</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Network
                      className={`h-5 w-5 ${selectedFunction.metadata.functionVpcEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedFunction.metadata.functionVpcEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-xs text-muted-foreground">VPC</p>
                    </div>
                  </div>
                </div>
                {selectedFunction.metadata.region && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs">Region</p>
                    <p className="font-medium text-sm">{selectedFunction.metadata.region}</p>
                  </div>
                )}
              </div>

              {/* Triggers */}
              {selectedFunction.metadata.functionTriggers &&
                selectedFunction.metadata.functionTriggers.length > 0 && (
                  <div className="rounded-xl border p-4 bg-card">
                    <SectionTitle>Triggers</SectionTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedFunction.metadata.functionTriggers.map((trigger, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          <Zap className="h-3 w-3" />
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Layers */}
              {selectedFunction.metadata.functionLayers &&
                selectedFunction.metadata.functionLayers.length > 0 && (
                  <div className="rounded-xl border p-4 bg-card">
                    <SectionTitle>Layers</SectionTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedFunction.metadata.functionLayers.map((layer, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {layer}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timeline */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Timeline</SectionTitle>
                <div className="space-y-3 mt-3">
                  {selectedFunction.metadata.functionLastModified && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                        <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Modified</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            selectedFunction.metadata.functionLastModified
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">First Discovered</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedFunction.firstSeen).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Seen</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedFunction.lastSeen).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Function</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{functionToDelete?.name}</strong> from your
              inventory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteFunction}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

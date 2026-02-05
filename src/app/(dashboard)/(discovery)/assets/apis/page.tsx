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
import { PageHeader, RiskScoreBadge } from '@/features/shared'
import { ApiDetailSheet, StatCard, StatsGrid, SectionTitle } from '@/features/assets'
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
import {
  Plus,
  Webhook,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Pencil,
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
  Lock,
  Zap,
  Activity,
  ExternalLink,
} from 'lucide-react'
import { getApis, getApiEndpoints, type Api } from '@/features/assets'

// Filter types
type StatusFilter = Api['status'] | 'all'
type TypeFilter = Api['type'] | 'all'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'deprecated', label: 'Deprecated' },
  { value: 'development', label: 'Development' },
]

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'rest', label: 'REST' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'soap', label: 'SOAP' },
]

const authTypeLabels: Record<Api['authType'], string> = {
  none: 'No Auth',
  api_key: 'API Key',
  oauth2: 'OAuth 2.0',
  jwt: 'JWT',
  basic: 'Basic Auth',
  mtls: 'mTLS',
}

const apiTypeColors: Record<Api['type'], string> = {
  rest: 'bg-blue-500',
  graphql: 'bg-pink-500',
  grpc: 'bg-green-500',
  websocket: 'bg-purple-500',
  soap: 'bg-orange-500',
}

// Empty form state
const emptyApiForm = {
  name: '',
  description: '',
  type: 'rest' as Api['type'],
  baseUrl: '',
  version: '',
  authType: 'none' as Api['authType'],
  documentationUrl: '',
  openApiSpec: false,
  owner: '',
  team: '',
  tlsVersion: 'TLS 1.3',
  corsEnabled: false,
  rateLimitEnabled: false,
  rateLimit: '',
}

export default function ApisPage() {
  const [apis, setApis] = useState<Api[]>(getApis())
  const [selectedApi, setSelectedApi] = useState<Api | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [rowSelection, setRowSelection] = useState({})

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [apiToDelete, setApiToDelete] = useState<Api | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyApiForm)

  // Endpoints for selected API
  const selectedApiEndpoints = useMemo(() => {
    if (!selectedApi) return []
    return getApiEndpoints(selectedApi.id)
  }, [selectedApi])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...apis]
    if (statusFilter !== 'all') {
      data = data.filter((d) => d.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      data = data.filter((d) => d.type === typeFilter)
    }
    return data
  }, [apis, statusFilter, typeFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: apis.length,
      active: apis.filter((d) => d.status === 'active').length,
      inactive: apis.filter((d) => d.status === 'inactive').length,
      deprecated: apis.filter((d) => d.status === 'deprecated').length,
      development: apis.filter((d) => d.status === 'development').length,
    }),
    [apis]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      totalEndpoints: apis.reduce((acc, a) => acc + a.endpointCount, 0),
      withFindings: apis.filter((a) => a.findingCount > 0).length,
      withDocs: apis.filter((a) => a.openApiSpec).length,
    }),
    [apis]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each API
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    apis.forEach((api) => {
      const match = getScopeMatchesForAsset(
        { id: api.id, type: 'api', name: api.baseUrl },
        scopeTargets,
        scopeExclusions
      )
      map.set(api.id, match)
    })
    return map
  }, [apis, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = apis.map((a) => ({
      id: a.id,
      name: a.baseUrl,
      type: 'api' as const,
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [apis, scopeTargets, scopeExclusions])

  // Table columns
  const columns: ColumnDef<Api>[] = [
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
          API
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${apiTypeColors[row.original.type]}`}
          >
            <Webhook className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate max-w-[200px]">
              {row.original.baseUrl}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase text-xs">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'authType',
      header: 'Auth',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{authTypeLabels[row.original.authType]}</span>
        </div>
      ),
    },
    {
      accessorKey: 'endpointCount',
      header: 'Endpoints',
      cell: ({ row }) => <Badge variant="secondary">{row.original.endpointCount}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const variant =
          status === 'active'
            ? 'default'
            : status === 'deprecated'
              ? 'destructive'
              : status === 'development'
                ? 'outline'
                : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
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
        const api = row.original
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
                  setSelectedApi(api)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenEdit(api)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyUrl(api)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              {api.documentationUrl && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(api.documentationUrl, '_blank')
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Docs
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400"
                onClick={(e) => {
                  e.stopPropagation()
                  setApiToDelete(api)
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
  const handleCopyUrl = (api: Api) => {
    navigator.clipboard.writeText(api.baseUrl)
    toast.success('URL copied to clipboard')
  }

  const handleOpenEdit = (api: Api) => {
    setFormData({
      name: api.name,
      description: api.description || '',
      type: api.type,
      baseUrl: api.baseUrl,
      version: api.version || '',
      authType: api.authType,
      documentationUrl: api.documentationUrl || '',
      openApiSpec: api.openApiSpec,
      owner: api.owner || '',
      team: api.team || '',
      tlsVersion: api.tlsVersion || 'TLS 1.3',
      corsEnabled: api.corsEnabled || false,
      rateLimitEnabled: api.rateLimitEnabled || false,
      rateLimit: api.rateLimit?.toString() || '',
    })
    setSelectedApi(api)
    setEditDialogOpen(true)
  }

  const handleAddApi = () => {
    if (!formData.name || !formData.baseUrl) {
      toast.error('Please fill in required fields')
      return
    }

    const newApi: Api = {
      id: `api-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      baseUrl: formData.baseUrl,
      version: formData.version,
      authType: formData.authType,
      status: 'development',
      endpointCount: 0,
      documentationUrl: formData.documentationUrl,
      openApiSpec: formData.openApiSpec,
      owner: formData.owner,
      team: formData.team,
      riskScore: 0,
      findingCount: 0,
      tlsVersion: formData.tlsVersion,
      corsEnabled: formData.corsEnabled,
      rateLimitEnabled: formData.rateLimitEnabled,
      rateLimit: formData.rateLimit ? parseInt(formData.rateLimit) : undefined,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    }

    setApis([newApi, ...apis])
    setFormData(emptyApiForm)
    setAddDialogOpen(false)
    toast.success('API added successfully')
  }

  const handleEditApi = () => {
    if (!selectedApi || !formData.name || !formData.baseUrl) {
      toast.error('Please fill in required fields')
      return
    }

    const updatedApis = apis.map((a) =>
      a.id === selectedApi.id
        ? {
            ...a,
            name: formData.name,
            description: formData.description,
            type: formData.type,
            baseUrl: formData.baseUrl,
            version: formData.version,
            authType: formData.authType,
            documentationUrl: formData.documentationUrl,
            openApiSpec: formData.openApiSpec,
            owner: formData.owner,
            team: formData.team,
            tlsVersion: formData.tlsVersion,
            corsEnabled: formData.corsEnabled,
            rateLimitEnabled: formData.rateLimitEnabled,
            rateLimit: formData.rateLimit ? parseInt(formData.rateLimit) : undefined,
          }
        : a
    )

    setApis(updatedApis)
    setFormData(emptyApiForm)
    setEditDialogOpen(false)
    setSelectedApi(null)
    toast.success('API updated successfully')
  }

  const handleDeleteApi = () => {
    if (!apiToDelete) return
    setApis(apis.filter((a) => a.id !== apiToDelete.id))
    setDeleteDialogOpen(false)
    setApiToDelete(null)
    toast.success('API deleted successfully')
  }

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection)
    const selectedApiIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    setApis(apis.filter((a) => !selectedApiIds.includes(a.id)))
    setRowSelection({})
    toast.success(`Deleted ${selectedIds.length} APIs`)
  }

  const handleExport = () => {
    const csv = [
      [
        'Name',
        'Type',
        'Base URL',
        'Version',
        'Auth Type',
        'Status',
        'Endpoints',
        'Risk Score',
        'Findings',
      ].join(','),
      ...apis.map((a) =>
        [
          a.name,
          a.type,
          a.baseUrl,
          a.version || '',
          a.authType,
          a.status,
          a.endpointCount,
          a.riskScore,
          a.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'apis.csv'
    anchor.click()
    toast.success('APIs exported')
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <>
      <Main>
        <PageHeader title="API Assets" description={`${apis.length} APIs in your infrastructure`}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setFormData(emptyApiForm)
                setAddDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add API
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Total APIs
              </CardDescription>
              <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
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
              <CardTitle className="text-3xl text-green-500">{statusCounts.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Total Endpoints
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.totalEndpoints}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                With Findings
              </CardDescription>
              <CardTitle className="text-3xl text-orange-500">{stats.withFindings}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Scope Coverage Card */}
        <div className="mt-4">
          <ScopeCoverageCard coverage={scopeCoverage} showBreakdown={false} />
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  All APIs
                </CardTitle>
                <CardDescription>Manage your API assets</CardDescription>
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

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {typeFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search APIs..."
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
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected APIs...')}>
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
                          setSelectedApi(row.original)
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
                        No APIs found.
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

      {/* API Details Sheet */}
      <ApiDetailSheet
        api={selectedApi}
        open={!!selectedApi && !editDialogOpen}
        onOpenChange={() => setSelectedApi(null)}
        icon={Webhook}
        iconColor="text-cyan-500"
        gradientFrom="from-cyan-500/20"
        gradientVia="via-cyan-500/10"
        subtitle={selectedApi?.baseUrl}
        onEdit={() => selectedApi && handleOpenEdit(selectedApi)}
        statusBadge={
          selectedApi && (
            <Badge variant={selectedApi.status === 'active' ? 'default' : 'secondary'}>
              {selectedApi.status}
            </Badge>
          )
        }
        quickActions={
          selectedApi && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleCopyUrl(selectedApi)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
              {selectedApi.documentationUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedApi.documentationUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Docs
                </Button>
              )}
            </>
          )
        }
        statsContent={
          selectedApi && (
            <StatsGrid columns={2}>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedApi.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedApi.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        extraTabs={
          selectedApi
            ? [
                {
                  value: 'endpoints',
                  label: `Endpoints (${selectedApi.endpointCount})`,
                  content: (
                    <>
                      {selectedApiEndpoints.length > 0 ? (
                        <div className="space-y-2">
                          {selectedApiEndpoints.map((endpoint) => (
                            <div
                              key={endpoint.id}
                              className="rounded-lg border p-3 bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    endpoint.method === 'GET'
                                      ? 'secondary'
                                      : endpoint.method === 'POST'
                                        ? 'default'
                                        : endpoint.method === 'PUT'
                                          ? 'outline'
                                          : endpoint.method === 'DELETE'
                                            ? 'destructive'
                                            : 'secondary'
                                  }
                                  className="font-mono text-xs"
                                >
                                  {endpoint.method}
                                </Badge>
                                <code className="text-sm font-mono flex-1 truncate">
                                  {endpoint.path}
                                </code>
                                {endpoint.deprecated && (
                                  <Badge variant="destructive" className="text-xs">
                                    Deprecated
                                  </Badge>
                                )}
                                <RiskScoreBadge score={endpoint.riskScore} size="sm" />
                              </div>
                              {endpoint.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {endpoint.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  {endpoint.authenticated ? 'Auth Required' : 'Public'}
                                </span>
                                {endpoint.avgResponseTime && (
                                  <span>{endpoint.avgResponseTime}ms</span>
                                )}
                                {endpoint.findingCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {endpoint.findingCount} findings
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No endpoints discovered yet</p>
                        </div>
                      )}
                    </>
                  ),
                },
              ]
            : undefined
        }
        overviewContent={
          selectedApi && (
            <>
              {/* API Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>API Information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <Badge variant="outline" className="mt-1 uppercase">
                      {selectedApi.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{selectedApi.version || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Authentication</p>
                    <p className="font-medium flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      {authTypeLabels[selectedApi.authType]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">TLS Version</p>
                    <p className="font-medium">{selectedApi.tlsVersion || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Scope Information */}
              {(() => {
                const scopeMatch = scopeMatchesMap.get(selectedApi.id)
                if (!scopeMatch) return null
                return (
                  <div className="rounded-xl border p-4 bg-card space-y-3">
                    <SectionTitle>Scope Information</SectionTitle>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <ScopeBadge match={scopeMatch} />
                      </div>
                      {scopeMatch.matchedTargets.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Matched Scope Rules:</p>
                          <div className="flex flex-wrap gap-1">
                            {scopeMatch.matchedTargets.map((target, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {target.pattern} ({target.matchType})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {scopeMatch.matchedExclusions.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Exclusion Rules:</p>
                          <div className="space-y-1">
                            {scopeMatch.matchedExclusions.map((exclusion, idx) => (
                              <div key={idx} className="text-sm">
                                <Badge
                                  variant="outline"
                                  className="text-xs border-orange-500/50 text-orange-500"
                                >
                                  {exclusion.pattern}
                                </Badge>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {exclusion.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Traffic Stats */}
              {selectedApi.requestsPerDay && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Traffic Statistics</SectionTitle>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {formatNumber(selectedApi.requestsPerDay)}
                        </p>
                        <p className="text-xs text-muted-foreground">Req/Day</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-lg font-bold">{selectedApi.avgResponseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Avg Response</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {((selectedApi.errorRate || 0) * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Error Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Security Settings</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedApi.corsEnabled ? 'default' : 'secondary'}>
                    CORS {selectedApi.corsEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Badge variant={selectedApi.rateLimitEnabled ? 'default' : 'secondary'}>
                    Rate Limit{' '}
                    {selectedApi.rateLimitEnabled ? `(${selectedApi.rateLimit}/min)` : 'Disabled'}
                  </Badge>
                  <Badge variant={selectedApi.openApiSpec ? 'default' : 'secondary'}>
                    OpenAPI {selectedApi.openApiSpec ? 'Available' : 'N/A'}
                  </Badge>
                </div>
              </div>

              {/* Ownership */}
              {(selectedApi.owner || selectedApi.team) && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Ownership</SectionTitle>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedApi.owner && (
                      <div>
                        <p className="text-muted-foreground">Owner</p>
                        <p className="font-medium">{selectedApi.owner}</p>
                      </div>
                    )}
                    {selectedApi.team && (
                      <div>
                        <p className="text-muted-foreground">Team</p>
                        <p className="font-medium">{selectedApi.team}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        }
      />

      {/* Add API Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Add API
            </DialogTitle>
            <DialogDescription>Add a new API to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">API Name *</Label>
                <Input
                  id="name"
                  placeholder="My API"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">API Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Api['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rest">REST</SelectItem>
                    <SelectItem value="graphql">GraphQL</SelectItem>
                    <SelectItem value="grpc">gRPC</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                    <SelectItem value="soap">SOAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.example.com/v1"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authType">Authentication</Label>
                <Select
                  value={formData.authType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, authType: value as Api['authType'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select auth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="jwt">JWT</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="mtls">mTLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentationUrl">Documentation URL</Label>
              <Input
                id="documentationUrl"
                placeholder="https://docs.example.com"
                value={formData.documentationUrl}
                onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  placeholder="Team or person"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input
                  id="team"
                  placeholder="Team name"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="openApiSpec"
                  checked={formData.openApiSpec}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, openApiSpec: checked === true })
                  }
                />
                <Label htmlFor="openApiSpec">Has OpenAPI Spec</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="corsEnabled"
                  checked={formData.corsEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, corsEnabled: checked === true })
                  }
                />
                <Label htmlFor="corsEnabled">CORS Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rateLimitEnabled"
                  checked={formData.rateLimitEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, rateLimitEnabled: checked === true })
                  }
                />
                <Label htmlFor="rateLimitEnabled">Rate Limited</Label>
              </div>
            </div>
            {formData.rateLimitEnabled && (
              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (requests/min)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  placeholder="1000"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddApi}>
              <Plus className="mr-2 h-4 w-4" />
              Add API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit API
            </DialogTitle>
            <DialogDescription>Update API information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">API Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="My API"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">API Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Api['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rest">REST</SelectItem>
                    <SelectItem value="graphql">GraphQL</SelectItem>
                    <SelectItem value="grpc">gRPC</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                    <SelectItem value="soap">SOAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-baseUrl">Base URL *</Label>
              <Input
                id="edit-baseUrl"
                placeholder="https://api.example.com/v1"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-authType">Authentication</Label>
                <Select
                  value={formData.authType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, authType: value as Api['authType'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select auth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="jwt">JWT</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="mtls">mTLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-documentationUrl">Documentation URL</Label>
              <Input
                id="edit-documentationUrl"
                placeholder="https://docs.example.com"
                value={formData.documentationUrl}
                onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-owner">Owner</Label>
                <Input
                  id="edit-owner"
                  placeholder="Team or person"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team">Team</Label>
                <Input
                  id="edit-team"
                  placeholder="Team name"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-openApiSpec"
                  checked={formData.openApiSpec}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, openApiSpec: checked === true })
                  }
                />
                <Label htmlFor="edit-openApiSpec">Has OpenAPI Spec</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-corsEnabled"
                  checked={formData.corsEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, corsEnabled: checked === true })
                  }
                />
                <Label htmlFor="edit-corsEnabled">CORS Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-rateLimitEnabled"
                  checked={formData.rateLimitEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, rateLimitEnabled: checked === true })
                  }
                />
                <Label htmlFor="edit-rateLimitEnabled">Rate Limited</Label>
              </div>
            </div>
            {formData.rateLimitEnabled && (
              <div className="space-y-2">
                <Label htmlFor="edit-rateLimit">Rate Limit (requests/min)</Label>
                <Input
                  id="edit-rateLimit"
                  type="number"
                  placeholder="1000"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditApi}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{apiToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteApi}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

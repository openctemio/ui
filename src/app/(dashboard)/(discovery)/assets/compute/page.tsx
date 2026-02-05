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
  Server,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Cloud,
  Play,
  Square,
  Pause,
} from 'lucide-react'
import type { Status } from '@/features/shared/types'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'

// Compute instance type
interface ComputeInstance {
  id: string
  name: string
  instanceId: string
  provider: 'aws' | 'gcp' | 'azure'
  instanceType: string
  state: 'running' | 'stopped' | 'terminated' | 'pending'
  status: Status
  region: string
  availabilityZone: string
  privateIp: string
  publicIp?: string
  vpcId: string
  os: string
  riskScore: number
  findingCount: number
  launchTime: string
  tags?: string[]
}

// Mock compute instances data
const mockComputeInstances: ComputeInstance[] = [
  {
    id: 'compute-1',
    name: 'prod-web-server-01',
    instanceId: 'i-0a1b2c3d4e5f6g7h8',
    provider: 'aws',
    instanceType: 't3.large',
    state: 'running',
    status: 'active',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    privateIp: '10.0.1.100',
    publicIp: '54.123.45.67',
    vpcId: 'vpc-12345678',
    os: 'Amazon Linux 2',
    riskScore: 35,
    findingCount: 3,
    launchTime: '2024-01-15T10:30:00Z',
    tags: ['production', 'web'],
  },
  {
    id: 'compute-2',
    name: 'prod-api-server-01',
    instanceId: 'i-1b2c3d4e5f6g7h8i',
    provider: 'aws',
    instanceType: 'm5.xlarge',
    state: 'running',
    status: 'active',
    region: 'us-east-1',
    availabilityZone: 'us-east-1b',
    privateIp: '10.0.2.100',
    publicIp: '54.234.56.78',
    vpcId: 'vpc-12345678',
    os: 'Ubuntu 22.04 LTS',
    riskScore: 25,
    findingCount: 1,
    launchTime: '2024-02-01T14:00:00Z',
    tags: ['production', 'api'],
  },
  {
    id: 'compute-3',
    name: 'dev-test-instance',
    instanceId: 'i-2c3d4e5f6g7h8i9j',
    provider: 'aws',
    instanceType: 't3.medium',
    state: 'stopped',
    status: 'inactive',
    region: 'us-west-2',
    availabilityZone: 'us-west-2a',
    privateIp: '10.1.1.50',
    vpcId: 'vpc-87654321',
    os: 'Windows Server 2022',
    riskScore: 45,
    findingCount: 5,
    launchTime: '2024-03-10T09:00:00Z',
    tags: ['development', 'testing'],
  },
  {
    id: 'compute-4',
    name: 'gcp-backend-vm',
    instanceId: 'gcp-vm-12345678',
    provider: 'gcp',
    instanceType: 'n2-standard-4',
    state: 'running',
    status: 'active',
    region: 'us-central1',
    availabilityZone: 'us-central1-a',
    privateIp: '10.128.0.10',
    publicIp: '35.192.123.45',
    vpcId: 'vpc-gcp-prod',
    os: 'Debian 11',
    riskScore: 20,
    findingCount: 2,
    launchTime: '2024-01-20T08:00:00Z',
    tags: ['production', 'backend'],
  },
  {
    id: 'compute-5',
    name: 'azure-db-server',
    instanceId: 'azure-vm-abcdef12',
    provider: 'azure',
    instanceType: 'Standard_D4s_v3',
    state: 'running',
    status: 'active',
    region: 'eastus',
    availabilityZone: 'eastus-1',
    privateIp: '10.200.1.20',
    vpcId: 'vnet-prod-001',
    os: 'RHEL 8',
    riskScore: 55,
    findingCount: 7,
    launchTime: '2023-12-01T12:00:00Z',
    tags: ['production', 'database'],
  },
  {
    id: 'compute-6',
    name: 'staging-app-server',
    instanceId: 'i-3d4e5f6g7h8i9j0k',
    provider: 'aws',
    instanceType: 't3.small',
    state: 'running',
    status: 'active',
    region: 'eu-west-1',
    availabilityZone: 'eu-west-1a',
    privateIp: '10.2.1.30',
    publicIp: '52.18.123.45',
    vpcId: 'vpc-staging',
    os: 'Amazon Linux 2023',
    riskScore: 30,
    findingCount: 2,
    launchTime: '2024-04-01T16:00:00Z',
    tags: ['staging', 'application'],
  },
  {
    id: 'compute-7',
    name: 'build-runner-01',
    instanceId: 'i-4e5f6g7h8i9j0k1l',
    provider: 'aws',
    instanceType: 'c5.2xlarge',
    state: 'running',
    status: 'active',
    region: 'us-east-1',
    availabilityZone: 'us-east-1c',
    privateIp: '10.0.3.100',
    vpcId: 'vpc-12345678',
    os: 'Ubuntu 20.04 LTS',
    riskScore: 15,
    findingCount: 0,
    launchTime: '2024-03-15T11:00:00Z',
    tags: ['ci-cd', 'build'],
  },
  {
    id: 'compute-8',
    name: 'legacy-server',
    instanceId: 'i-5f6g7h8i9j0k1l2m',
    provider: 'aws',
    instanceType: 't2.medium',
    state: 'running',
    status: 'pending',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    privateIp: '10.0.1.200',
    vpcId: 'vpc-legacy',
    os: 'CentOS 7',
    riskScore: 75,
    findingCount: 12,
    launchTime: '2022-06-01T10:00:00Z',
    tags: ['legacy', 'deprecated'],
  },
]

// Provider config
const providerConfig: Record<ComputeInstance['provider'], { label: string; color: string }> = {
  aws: { label: 'AWS EC2', color: 'bg-orange-500/10 text-orange-500' },
  gcp: { label: 'GCP GCE', color: 'bg-blue-500/10 text-blue-500' },
  azure: { label: 'Azure VM', color: 'bg-cyan-500/10 text-cyan-500' },
}

// State config
const stateConfig: Record<
  ComputeInstance['state'],
  { label: string; color: string; icon: typeof Play }
> = {
  running: { label: 'Running', color: 'text-green-500 bg-green-500/10', icon: Play },
  stopped: { label: 'Stopped', color: 'text-gray-500 bg-gray-500/10', icon: Square },
  pending: { label: 'Pending', color: 'text-yellow-500 bg-yellow-500/10', icon: Pause },
  terminated: { label: 'Terminated', color: 'text-red-500 bg-red-500/10', icon: Square },
}

// Filter types
type StatusFilter = Status | 'all'
type ProviderFilter = 'all' | ComputeInstance['provider']

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const providerFilters: { value: ProviderFilter; label: string }[] = [
  { value: 'all', label: 'All Providers' },
  { value: 'aws', label: 'AWS' },
  { value: 'gcp', label: 'GCP' },
  { value: 'azure', label: 'Azure' },
]

export default function ComputePage() {
  const [instances] = useState<ComputeInstance[]>(mockComputeInstances)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [rowSelection, setRowSelection] = useState({})

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...instances]
    if (statusFilter !== 'all') {
      data = data.filter((d) => d.status === statusFilter)
    }
    if (providerFilter !== 'all') {
      data = data.filter((d) => d.provider === providerFilter)
    }
    return data
  }, [instances, statusFilter, providerFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: instances.length,
      active: instances.filter((d) => d.status === 'active').length,
      inactive: instances.filter((d) => d.status === 'inactive').length,
      pending: instances.filter((d) => d.status === 'pending').length,
    }),
    [instances]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      running: instances.filter((i) => i.state === 'running').length,
      withFindings: instances.filter((i) => i.findingCount > 0).length,
    }),
    [instances]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each instance (using "host" type for compute instances)
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    instances.forEach((instance) => {
      const match = getScopeMatchesForAsset(
        { id: instance.id, type: 'host', name: instance.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(instance.id, match)
    })
    return map
  }, [instances, scopeTargets, scopeExclusions])

  // Calculate scope coverage for all instances
  const scopeCoverage = useMemo(() => {
    const assets = instances.map((i) => ({
      id: i.id,
      name: i.name,
      type: 'host',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [instances, scopeTargets, scopeExclusions])

  // Table columns
  const columns: ColumnDef<ComputeInstance>[] = [
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
          Instance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs font-mono truncate">
              {row.original.instanceId}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = providerConfig[row.original.provider]
        return (
          <Badge variant="secondary" className={provider.color}>
            {provider.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'instanceType',
      header: 'Type',
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.instanceType}</span>,
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => {
        const state = stateConfig[row.original.state]
        const Icon = state.icon
        return (
          <Badge variant="secondary" className={state.color}>
            <Icon className="h-3 w-3 mr-1" />
            {state.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'region',
      header: 'Region',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.region}</p>
          <p className="text-xs text-muted-foreground">{row.original.availabilityZone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        const instance = row.original
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
                  toast.info(`Viewing ${instance.name}`)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(instance.instanceId)
                  toast.success('Instance ID copied')
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Instance ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  toast.info('Scanning instance...')
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan
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

  const handleExport = () => {
    const csv = [
      [
        'Name',
        'Instance ID',
        'Provider',
        'Type',
        'State',
        'Region',
        'Private IP',
        'Public IP',
        'OS',
        'Status',
        'Risk Score',
        'Findings',
      ].join(','),
      ...instances.map((i) =>
        [
          i.name,
          i.instanceId,
          i.provider,
          i.instanceType,
          i.state,
          i.region,
          i.privateIp,
          i.publicIp || '',
          i.os,
          i.status,
          i.riskScore,
          i.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compute-instances.csv'
    a.click()
    toast.success('Compute instances exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Compute"
          description={`${instances.length} compute instances across cloud providers`}
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
                <Server className="h-4 w-4" />
                Total Instances
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
                <Play className="h-4 w-4 text-blue-500" />
                Running
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.running}</CardTitle>
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
          <ScopeCoverageCard
            coverage={scopeCoverage}
            title="Scope Coverage"
            showBreakdown={false}
          />
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  All Compute Instances
                </CardTitle>
                <CardDescription>EC2, GCE, and Azure VMs</CardDescription>
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

              <Select
                value={providerFilter}
                onValueChange={(v) => setProviderFilter(v as ProviderFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Provider" />
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

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search instances..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(rowSelection).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Scanning selected instances...')}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Rescan ({Object.keys(rowSelection).length})
                  </Button>
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
                          toast.info(`Viewing ${row.original.name}`)
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
                        No compute instances found.
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
    </>
  )
}

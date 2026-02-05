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
import { AssetDetailSheet, StatCard, StatsGrid, SectionTitle } from '@/features/assets'
import { Skeleton } from '@/components/ui/skeleton'
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
  Server,
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
  Cpu,
  HardDrive,
  Network,
} from 'lucide-react'
import {
  useAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  getAssetRelationships,
  ClassificationBadges,
  type Asset,
} from '@/features/assets'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import { AssetGroupSelect } from '@/features/asset-groups'
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

// Filter types
type StatusFilter = Status | 'all'
type OSFilter = 'all' | 'linux' | 'windows' | 'macos'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const osFilters: { value: OSFilter; label: string }[] = [
  { value: 'all', label: 'All OS' },
  { value: 'linux', label: 'Linux' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
]

// Empty form state
const emptyHostForm = {
  name: '',
  description: '',
  groupId: '',
  ip: '',
  hostname: '',
  os: '',
  osVersion: '',
  architecture: 'x64' as 'x86' | 'x64' | 'arm64',
  cpuCores: '',
  memoryGB: '',
  isVirtual: false,
  hypervisor: '',
  openPorts: '',
  tags: '',
}

export default function HostsPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch hosts from API
  const {
    assets: hosts,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['host'],
  })

  const [selectedHost, setSelectedHost] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [osFilter, setOSFilter] = useState<OSFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hostToDelete, setHostToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyHostForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...hosts]
    if (statusFilter !== 'all') {
      data = data.filter((d) => d.status === statusFilter)
    }
    if (osFilter !== 'all') {
      data = data.filter((d) => {
        const os = d.metadata.os?.toLowerCase() || ''
        if (osFilter === 'linux')
          return (
            os.includes('ubuntu') ||
            os.includes('centos') ||
            os.includes('debian') ||
            os.includes('linux')
          )
        if (osFilter === 'windows') return os.includes('windows')
        if (osFilter === 'macos') return os.includes('mac') || os.includes('darwin')
        return true
      })
    }
    return data
  }, [hosts, statusFilter, osFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: hosts.length,
      active: hosts.filter((d) => d.status === 'active').length,
      inactive: hosts.filter((d) => d.status === 'inactive').length,
      pending: hosts.filter((d) => d.status === 'pending').length,
    }),
    [hosts]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      virtual: hosts.filter((h) => h.metadata.isVirtual).length,
      withFindings: hosts.filter((h) => h.findingCount > 0).length,
    }),
    [hosts]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each host
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    hosts.forEach((host) => {
      const match = getScopeMatchesForAsset(
        { id: host.id, type: 'host', name: host.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(host.id, match)
    })
    return map
  }, [hosts, scopeTargets, scopeExclusions])

  // Calculate scope coverage for all hosts
  const scopeCoverage = useMemo(() => {
    const assets = hosts.map((h) => ({
      id: h.id,
      name: h.name,
      type: 'host',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [hosts, scopeTargets, scopeExclusions])

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
          Host
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.metadata.ip}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.os',
      header: 'OS',
      cell: ({ row }) => {
        const os = row.original.metadata.os
        const version = row.original.metadata.osVersion
        return (
          <div>
            <p className="text-sm">{os || '-'}</p>
            {version && <p className="text-xs text-muted-foreground">{version}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.cpuCores',
      header: 'Resources',
      cell: ({ row }) => {
        const cpu = row.original.metadata.cpuCores
        const mem = row.original.metadata.memoryGB
        return (
          <div className="flex flex-wrap items-center gap-2">
            {cpu && (
              <Badge variant="outline" className="gap-1">
                <Cpu className="h-3 w-3" />
                {cpu}
              </Badge>
            )}
            {mem && (
              <Badge variant="outline" className="gap-1">
                <HardDrive className="h-3 w-3" />
                {mem}GB
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.openPorts',
      header: 'Ports',
      cell: ({ row }) => {
        const ports = row.original.metadata.openPorts
        if (!ports || ports.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {ports.slice(0, 3).map((port) => (
              <Badge key={port} variant="secondary" className="text-xs">
                {port}
              </Badge>
            ))}
            {ports.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{ports.length - 3}
              </Badge>
            )}
          </div>
        )
      },
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
        const host = row.original
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
                  setSelectedHost(host)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(host)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyIP(host)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy IP
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setHostToDelete(host)
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
  const handleCopyIP = (host: Asset) => {
    navigator.clipboard.writeText(host.metadata.ip || host.name)
    toast.success('IP copied to clipboard')
  }

  const handleOpenEdit = (host: Asset) => {
    setFormData({
      name: host.name,
      description: host.description || '',
      groupId: host.groupId || '',
      ip: host.metadata.ip || '',
      hostname: host.metadata.hostname || '',
      os: host.metadata.os || '',
      osVersion: host.metadata.osVersion || '',
      architecture: host.metadata.architecture || 'x64',
      cpuCores: host.metadata.cpuCores?.toString() || '',
      memoryGB: host.metadata.memoryGB?.toString() || '',
      isVirtual: host.metadata.isVirtual || false,
      hypervisor: host.metadata.hypervisor || '',
      openPorts: host.metadata.openPorts?.join(', ') || '',
      tags: host.tags?.join(', ') || '',
    })
    setSelectedHost(host)
    setEditDialogOpen(true)
  }

  const handleAddHost = async () => {
    if (!formData.name || !formData.ip) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'host',
        criticality: 'medium',
        description: formData.description,
        scope: 'internal',
        exposure: 'private',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyHostForm)
      setAddDialogOpen(false)
      toast.success('Host added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add host'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditHost = async () => {
    if (!selectedHost || !formData.name || !formData.ip) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedHost.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyHostForm)
      setEditDialogOpen(false)
      setSelectedHost(null)
      toast.success('Host updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update host'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteHost = async () => {
    if (!hostToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(hostToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setHostToDelete(null)
      toast.success('Host deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete host'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedHostIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedHostIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedHostIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedHostIds.length} hosts`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete hosts'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      [
        'Name',
        'IP',
        'Hostname',
        'OS',
        'Version',
        'CPU',
        'Memory',
        'Status',
        'Risk Score',
        'Findings',
      ].join(','),
      ...hosts.map((h) =>
        [
          h.name,
          h.metadata.ip || '',
          h.metadata.hostname || '',
          h.metadata.os || '',
          h.metadata.osVersion || '',
          h.metadata.cpuCores || '',
          h.metadata.memoryGB || '',
          h.status,
          h.riskScore,
          h.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hosts.csv'
    a.click()
    toast.success('Hosts exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Host Assets"
          description={`${hosts.length} hosts in your infrastructure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyHostForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Host
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards - with inline skeleton loading */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Total Hosts
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
                Virtual
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{stats.virtual}</CardTitle>
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
                  <Server className="h-5 w-5" />
                  All Hosts
                </CardTitle>
                <CardDescription>Manage your host assets</CardDescription>
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

              <Select value={osFilter} onValueChange={(v) => setOSFilter(v as OSFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by OS" />
                </SelectTrigger>
                <SelectContent>
                  {osFilters.map((filter) => (
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
                  placeholder="Search hosts..."
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
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected hosts...')}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rescan Selected
                      </DropdownMenuItem>
                      <Can permission={Permission.AssetsDelete}>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={handleBulkDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Selected
                        </DropdownMenuItem>
                      </Can>
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
                  {isLoading ? (
                    // Skeleton loading rows
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
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
                          setSelectedHost(row.original)
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
                        No hosts found.
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

      {/* Host Details Sheet */}
      <AssetDetailSheet
        asset={selectedHost}
        open={!!selectedHost && !editDialogOpen}
        onOpenChange={() => setSelectedHost(null)}
        icon={Server}
        iconColor="text-purple-500"
        gradientFrom="from-purple-500/20"
        gradientVia="via-purple-500/10"
        assetTypeName="Host"
        relationships={selectedHost ? getAssetRelationships(selectedHost.id) : []}
        subtitle={selectedHost?.metadata.ip}
        onEdit={() => selectedHost && handleOpenEdit(selectedHost)}
        onDelete={() => {
          if (selectedHost) {
            setHostToDelete(selectedHost)
            setDeleteDialogOpen(true)
            setSelectedHost(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedHost && (
            <Button size="sm" variant="outline" onClick={() => handleCopyIP(selectedHost)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy IP
            </Button>
          )
        }
        statsContent={
          selectedHost && (
            <StatsGrid columns={2}>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedHost.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedHost.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedHost && (
            <>
              {/* System Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>System Information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Hostname</p>
                    <p className="font-medium">{selectedHost.metadata.hostname || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Operating System</p>
                    <p className="font-medium">
                      {selectedHost.metadata.os} {selectedHost.metadata.osVersion}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Architecture</p>
                    <p className="font-medium">{selectedHost.metadata.architecture || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {selectedHost.metadata.isVirtual ? 'Virtual' : 'Physical'}
                      {selectedHost.metadata.hypervisor && ` (${selectedHost.metadata.hypervisor})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Resources</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{selectedHost.metadata.cpuCores || '-'}</p>
                      <p className="text-xs text-muted-foreground">CPU Cores</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-lg font-bold">
                        {selectedHost.metadata.memoryGB || '-'} GB
                      </p>
                      <p className="text-xs text-muted-foreground">Memory</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Ports */}
              {selectedHost.metadata.openPorts && selectedHost.metadata.openPorts.length > 0 && (
                <div className="rounded-xl border p-4 bg-card">
                  <SectionTitle>Open Ports</SectionTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedHost.metadata.openPorts.map((port) => (
                      <Badge key={port} variant="outline" className="text-xs">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        }
      />

      {/* Add Host Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Add Host
            </DialogTitle>
            <DialogDescription>Add a new host to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Host Name *</Label>
                <Input
                  id="name"
                  placeholder="prod-web-01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address *</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.100"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                placeholder="prod-web-01.internal.local"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="os">Operating System</Label>
                <Input
                  id="os"
                  placeholder="Ubuntu, Windows Server..."
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="osVersion">OS Version</Label>
                <Input
                  id="osVersion"
                  placeholder="22.04 LTS, 2019..."
                  value={formData.osVersion}
                  onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="architecture">Architecture</Label>
                <Select
                  value={formData.architecture}
                  onValueChange={(value) =>
                    setFormData({ ...formData, architecture: value as 'x86' | 'x64' | 'arm64' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x64">x64</SelectItem>
                    <SelectItem value="x86">x86</SelectItem>
                    <SelectItem value="arm64">ARM64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpuCores">CPU Cores</Label>
                <Input
                  id="cpuCores"
                  type="number"
                  placeholder="8"
                  value={formData.cpuCores}
                  onChange={(e) => setFormData({ ...formData, cpuCores: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryGB">Memory (GB)</Label>
                <Input
                  id="memoryGB"
                  type="number"
                  placeholder="32"
                  value={formData.memoryGB}
                  onChange={(e) => setFormData({ ...formData, memoryGB: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isVirtual: checked === true })
                  }
                />
                <Label htmlFor="isVirtual">Virtual Machine</Label>
              </div>
              {formData.isVirtual && (
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Hypervisor (VMware, KVM...)"
                    value={formData.hypervisor}
                    onChange={(e) => setFormData({ ...formData, hypervisor: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="openPorts">Open Ports (comma separated)</Label>
              <Input
                id="openPorts"
                placeholder="22, 80, 443"
                value={formData.openPorts}
                onChange={(e) => setFormData({ ...formData, openPorts: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="production, web, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHost}>
              <Plus className="mr-2 h-4 w-4" />
              Add Host
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Host Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Host
            </DialogTitle>
            <DialogDescription>Update host information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Host Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="prod-web-01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ip">IP Address *</Label>
                <Input
                  id="edit-ip"
                  placeholder="192.168.1.100"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hostname">Hostname</Label>
              <Input
                id="edit-hostname"
                placeholder="prod-web-01.internal.local"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-os">Operating System</Label>
                <Input
                  id="edit-os"
                  placeholder="Ubuntu, Windows Server..."
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-osVersion">OS Version</Label>
                <Input
                  id="edit-osVersion"
                  placeholder="22.04 LTS, 2019..."
                  value={formData.osVersion}
                  onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-architecture">Architecture</Label>
                <Select
                  value={formData.architecture}
                  onValueChange={(value) =>
                    setFormData({ ...formData, architecture: value as 'x86' | 'x64' | 'arm64' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x64">x64</SelectItem>
                    <SelectItem value="x86">x86</SelectItem>
                    <SelectItem value="arm64">ARM64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpuCores">CPU Cores</Label>
                <Input
                  id="edit-cpuCores"
                  type="number"
                  placeholder="8"
                  value={formData.cpuCores}
                  onChange={(e) => setFormData({ ...formData, cpuCores: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-memoryGB">Memory (GB)</Label>
                <Input
                  id="edit-memoryGB"
                  type="number"
                  placeholder="32"
                  value={formData.memoryGB}
                  onChange={(e) => setFormData({ ...formData, memoryGB: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isVirtual"
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isVirtual: checked === true })
                  }
                />
                <Label htmlFor="edit-isVirtual">Virtual Machine</Label>
              </div>
              {formData.isVirtual && (
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Hypervisor (VMware, KVM...)"
                    value={formData.hypervisor}
                    onChange={(e) => setFormData({ ...formData, hypervisor: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-openPorts">Open Ports (comma separated)</Label>
              <Input
                id="edit-openPorts"
                placeholder="22, 80, 443"
                value={formData.openPorts}
                onChange={(e) => setFormData({ ...formData, openPorts: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                placeholder="production, web, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditHost}>
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
            <AlertDialogTitle>Delete Host</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{hostToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteHost}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

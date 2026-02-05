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
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Plus,
  Database,
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
  HardDrive,
  Lock,
  Save,
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
import { AssetGroupSelect } from '@/features/asset-groups'
import type { Status } from '@/features/shared/types'

// Filter types
type StatusFilter = Status | 'all'
type EngineFilter =
  | 'all'
  | 'mysql'
  | 'postgresql'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch'
  | 'mssql'
  | 'oracle'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const engineFilters: { value: EngineFilter; label: string }[] = [
  { value: 'all', label: 'All Engines' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
  { value: 'elasticsearch', label: 'Elasticsearch' },
  { value: 'mssql', label: 'MS SQL' },
  { value: 'oracle', label: 'Oracle' },
]

// Empty form state
const emptyDatabaseForm = {
  name: '',
  description: '',
  groupId: '',
  engine: 'postgresql' as
    | 'mysql'
    | 'postgresql'
    | 'mongodb'
    | 'redis'
    | 'elasticsearch'
    | 'mssql'
    | 'oracle'
    | 'dynamodb'
    | 'cosmosdb',
  dbVersion: '',
  dbHost: '',
  dbPort: '',
  sizeGB: '',
  encryption: false,
  backupEnabled: false,
  replication: 'single' as 'single' | 'replica-set' | 'cluster',
  tags: '',
}

export default function DatabasesPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch databases from API
  const {
    assets: databases,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['database'],
  })

  const [selectedDatabase, setSelectedDatabase] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [engineFilter, setEngineFilter] = useState<EngineFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [databaseToDelete, setDatabaseToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyDatabaseForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...databases]
    if (statusFilter !== 'all') {
      data = data.filter((d) => d.status === statusFilter)
    }
    if (engineFilter !== 'all') {
      data = data.filter((d) => d.metadata.engine === engineFilter)
    }
    return data
  }, [databases, statusFilter, engineFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: databases.length,
      active: databases.filter((d) => d.status === 'active').length,
      inactive: databases.filter((d) => d.status === 'inactive').length,
      pending: databases.filter((d) => d.status === 'pending').length,
    }),
    [databases]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      encrypted: databases.filter((d) => d.metadata.encryption).length,
      withBackup: databases.filter((d) => d.metadata.backupEnabled).length,
      withFindings: databases.filter((d) => d.findingCount > 0).length,
    }),
    [databases]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each database
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    databases.forEach((database) => {
      const match = getScopeMatchesForAsset(
        { id: database.id, type: 'database', name: database.metadata.dbHost || database.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(database.id, match)
    })
    return map
  }, [databases, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = databases.map((d) => ({
      id: d.id,
      name: d.metadata.dbHost || d.name,
      type: 'database' as const,
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [databases, scopeTargets, scopeExclusions])

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
          Database
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">
              {row.original.metadata.dbHost}:{row.original.metadata.dbPort}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.engine',
      header: 'Engine',
      cell: ({ row }) => {
        const engine = row.original.metadata.engine
        const version = row.original.metadata.dbVersion
        const colors: Record<string, string> = {
          mysql: 'bg-blue-500/10 text-blue-500',
          postgresql: 'bg-indigo-500/10 text-indigo-500',
          mongodb: 'bg-green-500/10 text-green-500',
          redis: 'bg-red-500/10 text-red-500',
          elasticsearch: 'bg-yellow-500/10 text-yellow-500',
          mssql: 'bg-purple-500/10 text-purple-500',
          oracle: 'bg-orange-500/10 text-orange-500',
        }
        return (
          <div>
            <Badge variant="secondary" className={colors[engine || 'postgresql']}>
              {engine || 'postgresql'}
            </Badge>
            {version && <p className="text-xs text-muted-foreground mt-1">{version}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.sizeGB',
      header: 'Size',
      cell: ({ row }) => {
        const size = row.original.metadata.sizeGB
        return (
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{size ? `${size} GB` : '-'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.encryption',
      header: 'Security',
      cell: ({ row }) => {
        const encrypted = row.original.metadata.encryption
        const backup = row.original.metadata.backupEnabled
        return (
          <div className="flex items-center gap-1">
            {encrypted && (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <Lock className="h-3 w-3" />
              </Badge>
            )}
            {backup && (
              <Badge variant="outline" className="gap-1 text-blue-500 border-blue-500/30">
                <Save className="h-3 w-3" />
              </Badge>
            )}
            {!encrypted && !backup && <span className="text-muted-foreground">-</span>}
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
        const database = row.original
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
                  setSelectedDatabase(database)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(database)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyConnection(database)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Connection
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDatabaseToDelete(database)
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
  const handleCopyConnection = (database: Asset) => {
    const conn = `${database.metadata.dbHost}:${database.metadata.dbPort}`
    navigator.clipboard.writeText(conn)
    toast.success('Connection string copied')
  }

  const handleOpenEdit = (database: Asset) => {
    setFormData({
      name: database.name,
      description: database.description || '',
      groupId: database.groupId || '',
      engine: database.metadata.engine || 'postgresql',
      dbVersion: database.metadata.dbVersion || '',
      dbHost: database.metadata.dbHost || '',
      dbPort: database.metadata.dbPort?.toString() || '',
      sizeGB: database.metadata.sizeGB?.toString() || '',
      encryption: database.metadata.encryption || false,
      backupEnabled: database.metadata.backupEnabled || false,
      replication: database.metadata.replication || 'single',
      tags: database.tags?.join(', ') || '',
    })
    setSelectedDatabase(database)
    setEditDialogOpen(true)
  }

  const handleAddDatabase = async () => {
    if (!formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'database',
        criticality: 'high',
        description: formData.description,
        scope: 'internal',
        exposure: 'private',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyDatabaseForm)
      setAddDialogOpen(false)
      toast.success('Database added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add database'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditDatabase = async () => {
    if (!selectedDatabase || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedDatabase.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyDatabaseForm)
      setEditDialogOpen(false)
      setSelectedDatabase(null)
      toast.success('Database updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update database'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(databaseToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setDatabaseToDelete(null)
      toast.success('Database deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete database'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedDatabaseIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedDatabaseIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedDatabaseIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedDatabaseIds.length} databases`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete databases'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      [
        'Name',
        'Engine',
        'Version',
        'Host',
        'Port',
        'Size (GB)',
        'Encrypted',
        'Backup',
        'Status',
        'Risk Score',
      ].join(','),
      ...databases.map((d) =>
        [
          d.name,
          d.metadata.engine || '',
          d.metadata.dbVersion || '',
          d.metadata.dbHost || '',
          d.metadata.dbPort || '',
          d.metadata.sizeGB || '',
          d.metadata.encryption ? 'Yes' : 'No',
          d.metadata.backupEnabled ? 'Yes' : 'No',
          d.status,
          d.riskScore,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'databases.csv'
    a.click()
    toast.success('Databases exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Database Assets"
          description={`${databases.length} databases in your infrastructure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyDatabaseForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Database
              </Button>
            </Can>
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
                <Database className="h-4 w-4" />
                Total Databases
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
                <Lock className="h-4 w-4 text-blue-500" />
                Encrypted
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{stats.encrypted}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Save className="h-4 w-4 text-purple-500" />
                With Backup
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-purple-500">{stats.withBackup}</CardTitle>
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
                  <Database className="h-5 w-5" />
                  All Databases
                </CardTitle>
                <CardDescription>Manage your database assets</CardDescription>
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
                value={engineFilter}
                onValueChange={(v) => setEngineFilter(v as EngineFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by engine" />
                </SelectTrigger>
                <SelectContent>
                  {engineFilters.map((filter) => (
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
                  placeholder="Search databases..."
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
                        onClick={() => toast.info('Scanning selected databases...')}
                      >
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
                          setSelectedDatabase(row.original)
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
                        No databases found.
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

      {/* Database Details Sheet */}
      <AssetDetailSheet
        asset={selectedDatabase}
        open={!!selectedDatabase && !editDialogOpen}
        onOpenChange={() => setSelectedDatabase(null)}
        icon={Database}
        iconColor="text-indigo-500"
        gradientFrom="from-indigo-500/20"
        gradientVia="via-indigo-500/10"
        assetTypeName="Database"
        relationships={selectedDatabase ? getAssetRelationships(selectedDatabase.id) : []}
        subtitle={
          selectedDatabase
            ? `${selectedDatabase.metadata.dbHost}:${selectedDatabase.metadata.dbPort}`
            : undefined
        }
        onEdit={() => selectedDatabase && handleOpenEdit(selectedDatabase)}
        onDelete={() => {
          if (selectedDatabase) {
            setDatabaseToDelete(selectedDatabase)
            setDeleteDialogOpen(true)
            setSelectedDatabase(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedDatabase && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyConnection(selectedDatabase)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Connection
            </Button>
          )
        }
        statsContent={
          selectedDatabase && (
            <StatsGrid columns={2}>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedDatabase.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedDatabase.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedDatabase && (
            <>
              {/* Database Configuration */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Database Configuration</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Engine</p>
                    <p className="font-medium capitalize">
                      {selectedDatabase.metadata.engine || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{selectedDatabase.metadata.dbVersion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">
                      {selectedDatabase.metadata.sizeGB
                        ? `${selectedDatabase.metadata.sizeGB} GB`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Replication</p>
                    <p className="font-medium capitalize">
                      {selectedDatabase.metadata.replication || 'single'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security & Backup */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Security & Backup</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Lock
                      className={`h-5 w-5 ${selectedDatabase.metadata.encryption ? 'text-green-500' : 'text-muted-foreground'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedDatabase.metadata.encryption ? 'Encrypted' : 'Not Encrypted'}
                      </p>
                      <p className="text-xs text-muted-foreground">Encryption</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Save
                      className={`h-5 w-5 ${selectedDatabase.metadata.backupEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedDatabase.metadata.backupEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-xs text-muted-foreground">Backup</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        }
      />

      {/* Add Database Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Add Database
            </DialogTitle>
            <DialogDescription>Add a new database to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Database Name *</Label>
              <Input
                id="name"
                placeholder="prod-mysql-01"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="engine">Engine *</Label>
                <Select
                  value={formData.engine}
                  onValueChange={(value) =>
                    setFormData({ ...formData, engine: value as typeof formData.engine })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="elasticsearch">Elasticsearch</SelectItem>
                    <SelectItem value="mssql">MS SQL Server</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dbVersion">Version</Label>
                <Input
                  id="dbVersion"
                  placeholder="8.0, 14.1, etc."
                  value={formData.dbVersion}
                  onChange={(e) => setFormData({ ...formData, dbVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dbHost">Host *</Label>
                <Input
                  id="dbHost"
                  placeholder="db.example.com"
                  value={formData.dbHost}
                  onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dbPort">Port</Label>
                <Input
                  id="dbPort"
                  type="number"
                  placeholder="3306, 5432..."
                  value={formData.dbPort}
                  onChange={(e) => setFormData({ ...formData, dbPort: e.target.value })}
                />
              </div>
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
                <Label htmlFor="sizeGB">Size (GB)</Label>
                <Input
                  id="sizeGB"
                  type="number"
                  placeholder="100"
                  value={formData.sizeGB}
                  onChange={(e) => setFormData({ ...formData, sizeGB: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replication">Replication</Label>
                <Select
                  value={formData.replication}
                  onValueChange={(value) =>
                    setFormData({ ...formData, replication: value as typeof formData.replication })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="replica-set">Replica Set</SelectItem>
                    <SelectItem value="cluster">Cluster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="encryption"
                  checked={formData.encryption}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, encryption: checked === true })
                  }
                />
                <Label htmlFor="encryption">Encryption Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backupEnabled"
                  checked={formData.backupEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, backupEnabled: checked === true })
                  }
                />
                <Label htmlFor="backupEnabled">Backup Enabled</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="production, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDatabase}>
              <Plus className="mr-2 h-4 w-4" />
              Add Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Database Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Database
            </DialogTitle>
            <DialogDescription>Update database information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Database Name *</Label>
              <Input
                id="edit-name"
                placeholder="prod-mysql-01"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-engine">Engine *</Label>
                <Select
                  value={formData.engine}
                  onValueChange={(value) =>
                    setFormData({ ...formData, engine: value as typeof formData.engine })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="elasticsearch">Elasticsearch</SelectItem>
                    <SelectItem value="mssql">MS SQL Server</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dbVersion">Version</Label>
                <Input
                  id="edit-dbVersion"
                  placeholder="8.0, 14.1, etc."
                  value={formData.dbVersion}
                  onChange={(e) => setFormData({ ...formData, dbVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-dbHost">Host *</Label>
                <Input
                  id="edit-dbHost"
                  placeholder="db.example.com"
                  value={formData.dbHost}
                  onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dbPort">Port</Label>
                <Input
                  id="edit-dbPort"
                  type="number"
                  placeholder="3306, 5432..."
                  value={formData.dbPort}
                  onChange={(e) => setFormData({ ...formData, dbPort: e.target.value })}
                />
              </div>
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
                <Label htmlFor="edit-sizeGB">Size (GB)</Label>
                <Input
                  id="edit-sizeGB"
                  type="number"
                  placeholder="100"
                  value={formData.sizeGB}
                  onChange={(e) => setFormData({ ...formData, sizeGB: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-replication">Replication</Label>
                <Select
                  value={formData.replication}
                  onValueChange={(value) =>
                    setFormData({ ...formData, replication: value as typeof formData.replication })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="replica-set">Replica Set</SelectItem>
                    <SelectItem value="cluster">Cluster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-encryption"
                  checked={formData.encryption}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, encryption: checked === true })
                  }
                />
                <Label htmlFor="edit-encryption">Encryption Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-backupEnabled"
                  checked={formData.backupEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, backupEnabled: checked === true })
                  }
                />
                <Label htmlFor="edit-backupEnabled">Backup Enabled</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                placeholder="production, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDatabase}>
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
            <AlertDialogTitle>Delete Database</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{databaseToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteDatabase}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

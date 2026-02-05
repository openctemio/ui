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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Smartphone,
  Apple,
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
  Star,
  ExternalLink,
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
type PlatformFilter = 'all' | 'ios' | 'android' | 'cross-platform'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const platformFilters: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'cross-platform', label: 'Cross-Platform' },
]

const platformLabels: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  'cross-platform': 'Cross-Platform',
}

// Empty form state
const emptyMobileForm = {
  name: '',
  bundleId: '',
  platform: 'android' as 'ios' | 'android' | 'cross-platform',
  appVersion: '',
  storeUrl: '',
  groupId: '',
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'ios':
      return <Apple className="h-4 w-4" />
    case 'android':
    case 'cross-platform':
    default:
      return <Smartphone className="h-4 w-4" />
  }
}

const formatDownloads = (downloads?: number) => {
  if (!downloads) return 'N/A'
  if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`
  if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`
  return downloads.toString()
}

export default function MobileAppsPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch mobile apps from API
  const {
    assets: mobileApps,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['mobile_app'],
  })

  const [selectedMobileApp, setSelectedMobileApp] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mobileAppToDelete, setMobileAppToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyMobileForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...mobileApps]
    if (statusFilter !== 'all') {
      data = data.filter((d) => d.status === statusFilter)
    }
    if (platformFilter !== 'all') {
      data = data.filter((d) => d.metadata.platform === platformFilter)
    }
    return data
  }, [mobileApps, statusFilter, platformFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: mobileApps.length,
      active: mobileApps.filter((d) => d.status === 'active').length,
      inactive: mobileApps.filter((d) => d.status === 'inactive').length,
      pending: mobileApps.filter((d) => d.status === 'pending').length,
    }),
    [mobileApps]
  )

  // Additional stats
  const stats = useMemo(
    () => ({
      ios: mobileApps.filter((a) => a.metadata.platform === 'ios').length,
      android: mobileApps.filter((a) => a.metadata.platform === 'android').length,
      withFindings: mobileApps.filter((a) => a.findingCount > 0).length,
    }),
    [mobileApps]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each mobile app
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    mobileApps.forEach((app) => {
      const match = getScopeMatchesForAsset(
        { id: app.id, type: 'mobile_app', name: app.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(app.id, match)
    })
    return map
  }, [mobileApps, scopeTargets, scopeExclusions])

  // Calculate scope coverage for all mobile apps
  const scopeCoverage = useMemo(() => {
    const assets = mobileApps.map((a) => ({
      id: a.id,
      name: a.name,
      type: 'mobile_app',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [mobileApps, scopeTargets, scopeExclusions])

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
          App
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {getPlatformIcon(row.original.metadata.platform || 'android')}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs font-mono truncate">
              {row.original.metadata.bundleId}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.appVersion',
      header: 'Version',
      cell: ({ row }) => {
        const version = row.original.metadata.appVersion
        const build = row.original.metadata.buildNumber
        return (
          <div>
            <span className="font-mono">{version || 'N/A'}</span>
            {build && <span className="text-muted-foreground text-sm"> ({build})</span>}
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
        const app = row.original
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
                  setSelectedMobileApp(app)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(app)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              {app.metadata.bundleId && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyBundleId(app)
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Bundle ID
                </DropdownMenuItem>
              )}
              {app.metadata.storeUrl && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(app.metadata.storeUrl, '_blank')
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Store
                </DropdownMenuItem>
              )}
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMobileAppToDelete(app)
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
  const handleCopyBundleId = (app: Asset) => {
    navigator.clipboard.writeText(app.metadata.bundleId || app.name)
    toast.success('Bundle ID copied to clipboard')
  }

  const handleOpenEdit = (app: Asset) => {
    setFormData({
      name: app.name,
      bundleId: app.metadata.bundleId || '',
      platform: app.metadata.platform || 'android',
      appVersion: app.metadata.appVersion || '',
      storeUrl: app.metadata.storeUrl || '',
      groupId: app.groupId || '',
    })
    setSelectedMobileApp(app)
    setEditDialogOpen(true)
  }

  const handleAddMobileApp = async () => {
    if (!formData.name || !formData.bundleId) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'mobile_app',
        criticality: 'medium',
        scope: 'external',
        exposure: 'public',
        metadata: {
          platform: formData.platform,
          bundleId: formData.bundleId,
          appVersion: formData.appVersion,
          storeUrl: formData.storeUrl,
        },
      })
      await mutate()
      setFormData(emptyMobileForm)
      setAddDialogOpen(false)
      toast.success('Mobile app added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add mobile app'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMobileApp = async () => {
    if (!selectedMobileApp || !formData.name || !formData.bundleId) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedMobileApp.id, {
        name: formData.name,
        metadata: {
          ...selectedMobileApp.metadata,
          platform: formData.platform,
          bundleId: formData.bundleId,
          appVersion: formData.appVersion,
          storeUrl: formData.storeUrl,
        },
      })
      await mutate()
      setFormData(emptyMobileForm)
      setEditDialogOpen(false)
      setSelectedMobileApp(null)
      toast.success('Mobile app updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update mobile app'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMobileApp = async () => {
    if (!mobileAppToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(mobileAppToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setMobileAppToDelete(null)
      toast.success('Mobile app deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete mobile app'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedMobileAppIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedMobileAppIds.length === 0) return
    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedMobileAppIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedMobileAppIds.length} mobile apps`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete mobile apps'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Bundle ID', 'Platform', 'Version', 'Status', 'Risk Score', 'Findings'].join(','),
      ...mobileApps.map((a) =>
        [
          a.name,
          a.metadata.bundleId || '',
          a.metadata.platform || '',
          a.metadata.appVersion || '',
          a.status,
          a.riskScore,
          a.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mobile-apps.csv'
    link.click()
    toast.success('Mobile apps exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Mobile Apps"
          description={`${mobileApps.length} mobile apps in your inventory`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyMobileForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add App
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
                <Smartphone className="h-4 w-4" />
                Total Apps
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-gray-500 transition-colors ${platformFilter === 'ios' ? 'border-gray-500' : ''}`}
            onClick={() => setPlatformFilter('ios')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Apple className="h-4 w-4 text-gray-500" />
                iOS Apps
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-gray-500">{stats.ios}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-green-500 transition-colors ${platformFilter === 'android' ? 'border-green-500' : ''}`}
            onClick={() => setPlatformFilter('android')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                Android Apps
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{stats.android}</CardTitle>
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
                  <Smartphone className="h-5 w-5" />
                  All Mobile Apps
                </CardTitle>
                <CardDescription>Manage your mobile application assets</CardDescription>
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
                value={platformFilter}
                onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformFilters.map((filter) => (
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
                  placeholder="Search mobile apps..."
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
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected apps...')}>
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
                          setSelectedMobileApp(row.original)
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
                        No mobile apps found.
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

      {/* Mobile App Details Sheet */}
      <AssetDetailSheet
        asset={selectedMobileApp}
        open={!!selectedMobileApp && !editDialogOpen}
        onOpenChange={() => setSelectedMobileApp(null)}
        icon={Smartphone}
        iconColor="text-violet-500"
        gradientFrom="from-violet-500/20"
        gradientVia="via-violet-500/10"
        assetTypeName="Mobile App"
        relationships={selectedMobileApp ? getAssetRelationships(selectedMobileApp.id) : []}
        subtitle={selectedMobileApp?.metadata.bundleId}
        onEdit={() => selectedMobileApp && handleOpenEdit(selectedMobileApp)}
        onDelete={() => {
          if (selectedMobileApp) {
            setMobileAppToDelete(selectedMobileApp)
            setDeleteDialogOpen(true)
            setSelectedMobileApp(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedMobileApp?.metadata.bundleId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectedMobileApp && handleCopyBundleId(selectedMobileApp)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Bundle ID
            </Button>
          )
        }
        statsContent={
          selectedMobileApp && (
            <StatsGrid columns={2}>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedMobileApp.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedMobileApp.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedMobileApp && (
            <>
              {/* Scope Status Section */}
              {scopeMatchesMap.get(selectedMobileApp.id) && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Scope Status</SectionTitle>
                  <div className="flex items-center gap-3">
                    <ScopeBadge match={scopeMatchesMap.get(selectedMobileApp.id)!} showDetails />
                  </div>
                  {scopeMatchesMap.get(selectedMobileApp.id)!.matchedTargets.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Matching Rules</p>
                      <div className="space-y-1">
                        {scopeMatchesMap.get(selectedMobileApp.id)!.matchedTargets.map((target) => (
                          <div key={target.targetId} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {target.pattern}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({target.matchType})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {scopeMatchesMap.get(selectedMobileApp.id)!.matchedExclusions.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Exclusions Applied</p>
                      <div className="space-y-1">
                        {scopeMatchesMap
                          .get(selectedMobileApp.id)!
                          .matchedExclusions.map((exclusion) => (
                            <div key={exclusion.exclusionId} className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-orange-500/50 text-orange-500"
                              >
                                {exclusion.pattern}
                              </Badge>
                              {exclusion.reason && (
                                <span className="text-xs text-muted-foreground">
                                  {exclusion.reason}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Platform Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Platform Information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Platform</p>
                    <div className="flex items-center gap-2 font-medium">
                      {getPlatformIcon(selectedMobileApp.metadata.platform || 'android')}
                      <span>
                        {platformLabels[selectedMobileApp.metadata.platform || 'android']}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-mono font-medium">
                      {selectedMobileApp.metadata.appVersion || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Build Number</p>
                    <p className="font-mono font-medium">
                      {selectedMobileApp.metadata.buildNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bundle ID</p>
                    <p className="font-mono font-medium text-xs break-all">
                      {selectedMobileApp.metadata.bundleId || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min SDK</p>
                    <p className="font-mono font-medium">
                      {selectedMobileApp.metadata.minSdkVersion || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target SDK</p>
                    <p className="font-mono font-medium">
                      {selectedMobileApp.metadata.targetSdkVersion || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Store Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">
                        {formatDownloads(selectedMobileApp.metadata.downloads)}
                      </p>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-lg font-bold">
                        {selectedMobileApp.metadata.rating?.toFixed(1) || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                  </div>
                </div>
                {selectedMobileApp.metadata.lastRelease && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Last Release</p>
                    <p className="font-medium">
                      {new Date(selectedMobileApp.metadata.lastRelease).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedMobileApp.metadata.storeUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => window.open(selectedMobileApp.metadata.storeUrl, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Store
                  </Button>
                )}
              </div>

              {/* Permissions */}
              {selectedMobileApp.metadata.permissions &&
                selectedMobileApp.metadata.permissions.length > 0 && (
                  <div className="rounded-xl border p-4 bg-card">
                    <SectionTitle>
                      Permissions ({selectedMobileApp.metadata.permissions.length})
                    </SectionTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMobileApp.metadata.permissions.map(
                        (permission: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs font-mono">
                            {permission}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* SDKs */}
              {selectedMobileApp.metadata.sdks && selectedMobileApp.metadata.sdks.length > 0 && (
                <div className="rounded-xl border p-4 bg-card">
                  <SectionTitle>
                    Third-party SDKs ({selectedMobileApp.metadata.sdks.length})
                  </SectionTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedMobileApp.metadata.sdks.map((sdk: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {sdk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        }
      />

      {/* Add Mobile App Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Add Mobile App
            </DialogTitle>
            <DialogDescription>
              Add a new mobile application to your asset inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">App Name *</Label>
              <Input
                id="name"
                placeholder="My Mobile App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundleId">Bundle ID *</Label>
              <Input
                id="bundleId"
                placeholder="com.company.appname"
                value={formData.bundleId}
                onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform: value as typeof formData.platform })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="cross-platform">Cross-Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appVersion">Version</Label>
                <Input
                  id="appVersion"
                  placeholder="1.0.0"
                  value={formData.appVersion}
                  onChange={(e) => setFormData({ ...formData, appVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                placeholder="https://play.google.com/store/apps/..."
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMobileApp}>
              <Plus className="mr-2 h-4 w-4" />
              Add App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mobile App Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Mobile App
            </DialogTitle>
            <DialogDescription>Update mobile application details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">App Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Mobile App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bundleId">Bundle ID *</Label>
              <Input
                id="edit-bundleId"
                placeholder="com.company.appname"
                value={formData.bundleId}
                onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-platform">Platform *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform: value as typeof formData.platform })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="cross-platform">Cross-Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-appVersion">Version</Label>
                <Input
                  id="edit-appVersion"
                  placeholder="1.0.0"
                  value={formData.appVersion}
                  onChange={(e) => setFormData({ ...formData, appVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-storeUrl">Store URL</Label>
              <Input
                id="edit-storeUrl"
                placeholder="https://play.google.com/store/apps/..."
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMobileApp}>
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
            <AlertDialogTitle>Delete Mobile App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{mobileAppToDelete?.name}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteMobileApp}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

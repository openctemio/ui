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
import { AssetDetailSheet, StatCardCentered, StatsGrid, SectionTitle } from '@/features/assets'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Plus,
  MonitorSmartphone,
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
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Zap,
  Lock,
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
type SSLFilter = 'all' | 'secure' | 'insecure'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Common technologies for select
const commonTechnologies = [
  'React',
  'Vue.js',
  'Angular',
  'Next.js',
  'Node.js',
  'PHP',
  'Laravel',
  'WordPress',
  'Django',
  'Flask',
  'Ruby on Rails',
  'ASP.NET',
  'Spring Boot',
  'Express.js',
  'Nginx',
  'Apache',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'AWS',
  'Cloudflare',
  'jQuery',
  'Bootstrap',
  'Tailwind CSS',
]

// Empty form state
const emptyWebsiteForm = {
  name: '',
  description: '',
  groupId: '',
  technology: '',
  ssl: true,
  httpStatus: '200',
  responseTime: '',
  server: '',
  tags: '',
}

export default function WebsitesPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch websites from API
  const {
    assets: websites,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['website'],
  })

  const [selectedWebsite, setSelectedWebsite] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sslFilter, setSSLFilter] = useState<SSLFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [websiteToDelete, setWebsiteToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyWebsiteForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...websites]
    if (statusFilter !== 'all') {
      data = data.filter((w) => w.status === statusFilter)
    }
    if (sslFilter !== 'all') {
      data = data.filter((w) => (sslFilter === 'secure' ? w.metadata.ssl : !w.metadata.ssl))
    }
    return data
  }, [websites, statusFilter, sslFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: websites.length,
      active: websites.filter((w) => w.status === 'active').length,
      inactive: websites.filter((w) => w.status === 'inactive').length,
      pending: websites.filter((w) => w.status === 'pending').length,
    }),
    [websites]
  )

  // SSL counts
  const sslCounts = useMemo(
    () => ({
      secure: websites.filter((w) => w.metadata.ssl).length,
      insecure: websites.filter((w) => !w.metadata.ssl).length,
    }),
    [websites]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each website
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    websites.forEach((website) => {
      const match = getScopeMatchesForAsset(
        { id: website.id, type: 'website', name: website.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(website.id, match)
    })
    return map
  }, [websites, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = websites.map((w) => ({
      id: w.id,
      name: w.name,
      type: 'website',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [websites, scopeTargets, scopeExclusions])

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
          Website
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.groupName}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'technology',
      header: 'Technology',
      cell: ({ row }) => {
        const tech = row.original.metadata.technology || []
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {tech.slice(0, 2).map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
            {tech.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tech.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'ssl',
      header: 'SSL',
      cell: ({ row }) =>
        row.original.metadata.ssl ? (
          <div className="flex items-center gap-1 text-green-500">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs">Secure</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-500">
            <ShieldX className="h-4 w-4" />
            <span className="text-xs">Insecure</span>
          </div>
        ),
    },
    {
      id: 'httpStatus',
      header: 'Status Code',
      cell: ({ row }) => {
        const status = row.original.metadata.httpStatus || 200
        const statusClass =
          status >= 200 && status < 300
            ? 'text-green-500 bg-green-500/10'
            : status >= 300 && status < 400
              ? 'text-blue-500 bg-blue-500/10'
              : status >= 400 && status < 500
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-red-500 bg-red-500/10'
        return (
          <Badge variant="outline" className={statusClass}>
            {status}
          </Badge>
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
        const website = row.original
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
                  setSelectedWebsite(website)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(website)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyURL(website)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(website.name, '_blank')
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Browser
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setWebsiteToDelete(website)
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
  const handleCopyURL = (website: Asset) => {
    navigator.clipboard.writeText(website.name)
    toast.success('URL copied to clipboard')
  }

  const handleOpenEdit = (website: Asset) => {
    setFormData({
      name: website.name,
      description: website.description || '',
      groupId: website.groupId || '',
      technology: website.metadata.technology?.join(', ') || '',
      ssl: website.metadata.ssl ?? true,
      httpStatus: String(website.metadata.httpStatus || 200),
      responseTime: String(website.metadata.responseTime || ''),
      server: website.metadata.server || '',
      tags: website.tags?.join(', ') || '',
    })
    setSelectedWebsite(website)
    setEditDialogOpen(true)
  }

  const handleAddWebsite = async () => {
    if (!formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'website',
        criticality: 'high',
        description: formData.description,
        scope: 'external',
        exposure: 'public',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyWebsiteForm)
      setAddDialogOpen(false)
      toast.success('Website added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add website'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditWebsite = async () => {
    if (!selectedWebsite || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedWebsite.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyWebsiteForm)
      setEditDialogOpen(false)
      setSelectedWebsite(null)
      toast.success('Website updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update website'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteWebsite = async () => {
    if (!websiteToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(websiteToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setWebsiteToDelete(null)
      toast.success('Website deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete website'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedWebsiteIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedWebsiteIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedWebsiteIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedWebsiteIds.length} websites`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete websites'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['URL', 'Technology', 'SSL', 'HTTP Status', 'Status', 'Risk Score', 'Findings'].join(','),
      ...websites.map((w) =>
        [
          w.name,
          (w.metadata.technology || []).join(';'),
          w.metadata.ssl ? 'Yes' : 'No',
          w.metadata.httpStatus || 200,
          w.status,
          w.riskScore,
          w.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'websites.csv'
    a.click()
    toast.success('Websites exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Website Assets"
          description={`${websites.length} websites in your attack surface`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyWebsiteForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Website
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
                <MonitorSmartphone className="h-4 w-4" />
                Total Websites
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-green-500 transition-colors ${sslFilter === 'secure' ? 'border-green-500' : ''}`}
            onClick={() => setSSLFilter(sslFilter === 'secure' ? 'all' : 'secure')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                SSL Secure
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{sslCounts.secure}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-red-500 transition-colors ${sslFilter === 'insecure' ? 'border-red-500' : ''}`}
            onClick={() => setSSLFilter(sslFilter === 'insecure' ? 'all' : 'insecure')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-red-500" />
                SSL Insecure
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-red-500">{sslCounts.insecure}</CardTitle>
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
                <CardTitle className="text-3xl text-orange-500">
                  {websites.filter((w) => w.findingCount > 0).length}
                </CardTitle>
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
                  <MonitorSmartphone className="h-5 w-5" />
                  All Websites
                </CardTitle>
                <CardDescription>Manage your web application assets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Quick Filter Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              className="mb-4"
            >
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

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search websites..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* SSL Filter Button */}
                <Button
                  variant={sslFilter !== 'all' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSSLFilter('all')}
                >
                  {sslFilter === 'all' ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : sslFilter === 'secure' ? (
                    <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <ShieldX className="mr-2 h-4 w-4 text-red-500" />
                  )}
                  {sslFilter === 'all'
                    ? 'All SSL'
                    : sslFilter === 'secure'
                      ? 'Secure Only'
                      : 'Insecure Only'}
                </Button>

                {Object.keys(rowSelection).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected websites...')}>
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
                          setSelectedWebsite(row.original)
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
                        No websites found.
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

      {/* Website Details Sheet */}
      <AssetDetailSheet
        asset={selectedWebsite}
        open={!!selectedWebsite && !editDialogOpen}
        onOpenChange={() => setSelectedWebsite(null)}
        icon={selectedWebsite?.metadata.ssl ? ShieldCheck : ShieldX}
        iconColor={selectedWebsite?.metadata.ssl ? 'text-green-500' : 'text-red-500'}
        gradientFrom={selectedWebsite?.metadata.ssl ? 'from-green-500/20' : 'from-red-500/20'}
        gradientVia={selectedWebsite?.metadata.ssl ? 'via-green-500/10' : 'via-red-500/10'}
        assetTypeName="Website"
        relationships={selectedWebsite ? getAssetRelationships(selectedWebsite.id) : []}
        onEdit={() => selectedWebsite && handleOpenEdit(selectedWebsite)}
        onDelete={() => {
          if (selectedWebsite) {
            setWebsiteToDelete(selectedWebsite)
            setDeleteDialogOpen(true)
            setSelectedWebsite(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedWebsite && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(selectedWebsite.name, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCopyURL(selectedWebsite)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </>
          )
        }
        statsContent={
          selectedWebsite && (
            <StatsGrid columns={3}>
              <StatCardCentered
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedWebsite.riskScore}
                label="Risk Score"
              />
              <StatCardCentered
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedWebsite.findingCount}
                label="Findings"
              />
              <StatCardCentered
                icon={Zap}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                value={selectedWebsite.metadata.responseTime || '-'}
                label="Response (ms)"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedWebsite && (
            <>
              {/* Scope Status Section */}
              {scopeMatchesMap.get(selectedWebsite.id) && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Scope Status</SectionTitle>
                  <div className="flex items-center gap-3">
                    <ScopeBadge match={scopeMatchesMap.get(selectedWebsite.id)!} showDetails />
                  </div>
                  {scopeMatchesMap.get(selectedWebsite.id)!.matchedTargets.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Matching Rules</p>
                      <div className="space-y-1">
                        {scopeMatchesMap.get(selectedWebsite.id)!.matchedTargets.map((target) => (
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
                  {scopeMatchesMap.get(selectedWebsite.id)!.matchedExclusions.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Exclusions Applied</p>
                      <div className="space-y-1">
                        {scopeMatchesMap
                          .get(selectedWebsite.id)!
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

              {/* Website Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Website Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">HTTP Status</p>
                    <Badge
                      variant="outline"
                      className={
                        (selectedWebsite.metadata.httpStatus || 200) < 400
                          ? 'text-green-500'
                          : 'text-red-500'
                      }
                    >
                      {selectedWebsite.metadata.httpStatus || 200}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SSL Certificate</p>
                    <p className="font-medium">
                      {selectedWebsite.metadata.ssl ? 'Valid' : 'Invalid/Missing'}
                    </p>
                  </div>
                  {selectedWebsite.metadata.server && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Server</p>
                      <p className="font-medium">{selectedWebsite.metadata.server}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Technology Stack */}
              {selectedWebsite.metadata.technology &&
                selectedWebsite.metadata.technology.length > 0 && (
                  <div className="rounded-xl border p-4 bg-card">
                    <SectionTitle>Technology Stack</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {selectedWebsite.metadata.technology.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )
        }
      />

      {/* Add Website Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Add Website
            </DialogTitle>
            <DialogDescription>Add a new website to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">URL *</Label>
              <Input
                id="name"
                placeholder="https://example.com"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <div className="space-y-2">
              <Label htmlFor="technology">Technology (comma separated)</Label>
              <Input
                id="technology"
                placeholder="React, Node.js, PostgreSQL"
                value={formData.technology}
                onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {commonTechnologies.slice(0, 6).map((tech) => (
                  <Button
                    key={tech}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const current = formData.technology
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                      if (!current.includes(tech)) {
                        setFormData({
                          ...formData,
                          technology: [...current, tech].join(', '),
                        })
                      }
                    }}
                  >
                    + {tech}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="httpStatus">HTTP Status Code</Label>
                <Input
                  id="httpStatus"
                  type="number"
                  placeholder="200"
                  value={formData.httpStatus}
                  onChange={(e) => setFormData({ ...formData, httpStatus: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responseTime">Response Time (ms)</Label>
                <Input
                  id="responseTime"
                  type="number"
                  placeholder="150"
                  value={formData.responseTime}
                  onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="server">Server</Label>
              <Input
                id="server"
                placeholder="nginx/1.21.0"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ssl"
                checked={formData.ssl}
                onCheckedChange={(checked) => setFormData({ ...formData, ssl: !!checked })}
              />
              <Label htmlFor="ssl" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                SSL/TLS Enabled
              </Label>
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
            <Button onClick={handleAddWebsite}>
              <Plus className="mr-2 h-4 w-4" />
              Add Website
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Website Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Website
            </DialogTitle>
            <DialogDescription>Update website information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">URL *</Label>
              <Input
                id="edit-name"
                placeholder="https://example.com"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <div className="space-y-2">
              <Label htmlFor="edit-technology">Technology (comma separated)</Label>
              <Input
                id="edit-technology"
                placeholder="React, Node.js, PostgreSQL"
                value={formData.technology}
                onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-httpStatus">HTTP Status Code</Label>
                <Input
                  id="edit-httpStatus"
                  type="number"
                  placeholder="200"
                  value={formData.httpStatus}
                  onChange={(e) => setFormData({ ...formData, httpStatus: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-responseTime">Response Time (ms)</Label>
                <Input
                  id="edit-responseTime"
                  type="number"
                  placeholder="150"
                  value={formData.responseTime}
                  onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-server">Server</Label>
              <Input
                id="edit-server"
                placeholder="nginx/1.21.0"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-ssl"
                checked={formData.ssl}
                onCheckedChange={(checked) => setFormData({ ...formData, ssl: !!checked })}
              />
              <Label htmlFor="edit-ssl" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                SSL/TLS Enabled
              </Label>
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
            <Button onClick={handleEditWebsite}>
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
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{websiteToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteWebsite}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

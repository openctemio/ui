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
import {
  Plus,
  Cloud,
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
  RefreshCw,
  Server,
  Database,
  HardDrive,
  Network,
  Container,
  Globe,
  MapPin,
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
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { AssetGroupSelect } from '@/features/asset-groups'
import type { Status } from '@/features/shared/types'
import {
  ScopeCoverageCard,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
} from '@/features/scope'

// Filter types
type StatusFilter = Status | 'all'
type ProviderFilter = 'all' | 'aws' | 'gcp' | 'azure'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Provider styling
const providerStyles: Record<string, { bg: string; text: string; icon: string }> = {
  aws: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  gcp: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  azure: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    icon: 'text-cyan-500',
  },
}

// Regions by provider
const regionsByProvider: Record<string, string[]> = {
  aws: [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'eu-west-1',
    'eu-central-1',
  ],
  gcp: ['us-central1', 'us-east1', 'us-west1', 'asia-southeast1', 'asia-east1', 'europe-west1'],
  azure: ['East US', 'West US', 'Southeast Asia', 'East Asia', 'West Europe', 'North Europe'],
}

// Resource types by provider
const resourceTypesByProvider: Record<string, string[]> = {
  aws: ['EC2', 'S3 Bucket', 'RDS', 'Lambda', 'VPC', 'EKS', 'ECS', 'CloudFront'],
  gcp: ['GCE', 'GCS Bucket', 'Cloud SQL', 'GKE Cluster', 'VPC', 'Cloud Run', 'BigQuery'],
  azure: ['VM', 'Blob Storage', 'SQL Server', 'AKS', 'VNet', 'Functions', 'Cosmos DB'],
}

// Empty form state
const emptyCloudForm = {
  name: '',
  description: '',
  groupId: '',
  cloudProvider: 'aws' as 'aws' | 'gcp' | 'azure',
  region: '',
  resourceType: '',
  tags: '',
}

export default function CloudPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch cloud assets from API (compute, storage, serverless types)
  const {
    assets: cloudAssets,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['compute', 'storage', 'serverless'],
  })

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyCloudForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...cloudAssets]
    if (statusFilter !== 'all') {
      data = data.filter((a) => a.status === statusFilter)
    }
    if (providerFilter !== 'all') {
      data = data.filter((a) => a.metadata.cloudProvider === providerFilter)
    }
    return data
  }, [cloudAssets, statusFilter, providerFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: cloudAssets.length,
      active: cloudAssets.filter((a) => a.status === 'active').length,
      inactive: cloudAssets.filter((a) => a.status === 'inactive').length,
      pending: cloudAssets.filter((a) => a.status === 'pending').length,
    }),
    [cloudAssets]
  )

  // Provider counts
  const providerCounts = useMemo(
    () => ({
      aws: cloudAssets.filter((a) => a.metadata.cloudProvider === 'aws').length,
      gcp: cloudAssets.filter((a) => a.metadata.cloudProvider === 'gcp').length,
      azure: cloudAssets.filter((a) => a.metadata.cloudProvider === 'azure').length,
    }),
    [cloudAssets]
  )

  // Scope computation
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  const scopeCoverage = useMemo(
    () =>
      calculateScopeCoverage(
        cloudAssets.map((a) => ({
          id: a.id,
          type: 'cloud',
          name: a.name,
          metadata: a.metadata as unknown as Record<string, unknown>,
        })),
        scopeTargets,
        scopeExclusions
      ),
    [cloudAssets, scopeTargets, scopeExclusions]
  )

  // Get resource type icon
  const getResourceIcon = (resourceType?: string) => {
    const type = resourceType?.toLowerCase() || ''
    if (type.includes('ec2') || type.includes('vm') || type.includes('gce')) {
      return <Server className="h-4 w-4" />
    }
    if (type.includes('sql') || type.includes('rds') || type.includes('database')) {
      return <Database className="h-4 w-4" />
    }
    if (
      type.includes('s3') ||
      type.includes('bucket') ||
      type.includes('storage') ||
      type.includes('blob')
    ) {
      return <HardDrive className="h-4 w-4" />
    }
    if (type.includes('vpc') || type.includes('vnet') || type.includes('network')) {
      return <Network className="h-4 w-4" />
    }
    if (
      type.includes('eks') ||
      type.includes('aks') ||
      type.includes('gke') ||
      type.includes('kubernetes') ||
      type.includes('container')
    ) {
      return <Container className="h-4 w-4" />
    }
    return <Cloud className="h-4 w-4" />
  }

  // Get provider badge
  const getProviderBadge = (provider?: string) => {
    const style = providerStyles[provider || ''] || providerStyles.aws
    return (
      <Badge className={`${style.bg} ${style.text} border-0 uppercase font-semibold`}>
        {provider}
      </Badge>
    )
  }

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
          Resource
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              providerStyles[row.original.metadata.cloudProvider || '']?.bg || 'bg-muted'
            }`}
          >
            {getResourceIcon(row.original.metadata.resourceType)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.description}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => getProviderBadge(row.original.metadata.cloudProvider),
    },
    {
      accessorKey: 'metadata.region',
      header: 'Region',
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {row.original.metadata.region}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.resourceType',
      header: 'Type',
      cell: ({ row }) => <Badge variant="outline">{row.original.metadata.resourceType}</Badge>,
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
        return <Badge variant={count > 3 ? 'destructive' : 'secondary'}>{count}</Badge>
      },
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk',
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original
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
                  setSelectedAsset(asset)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(asset)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenConsole(asset)
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                Open Console
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAssetToDelete(asset)
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
  const handleOpenConsole = (asset: Asset) => {
    const provider = asset.metadata.cloudProvider
    let url = ''
    switch (provider) {
      case 'aws':
        url = 'https://console.aws.amazon.com'
        break
      case 'gcp':
        url = 'https://console.cloud.google.com'
        break
      case 'azure':
        url = 'https://portal.azure.com'
        break
    }
    window.open(url, '_blank')
    toast.info(`Opening ${provider?.toUpperCase()} Console`)
  }

  const handleOpenEdit = (asset: Asset) => {
    setFormData({
      name: asset.name,
      description: asset.description || '',
      groupId: asset.groupId || '',
      cloudProvider: (asset.metadata.cloudProvider as 'aws' | 'gcp' | 'azure') || 'aws',
      region: asset.metadata.region || '',
      resourceType: asset.metadata.resourceType || '',
      tags: asset.tags?.join(', ') || '',
    })
    setSelectedAsset(asset)
    setEditDialogOpen(true)
  }

  const handleAddAsset = async () => {
    if (!formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'compute',
        criticality: 'medium',
        description: formData.description,
        scope: 'cloud',
        exposure: 'private',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyCloudForm)
      setAddDialogOpen(false)
      toast.success('Cloud asset added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add cloud asset'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAsset = async () => {
    if (!selectedAsset || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedAsset.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyCloudForm)
      setEditDialogOpen(false)
      setSelectedAsset(null)
      toast.success('Cloud asset updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update cloud asset'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(assetToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
      toast.success('Cloud asset deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete cloud asset'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedAssetIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedAssetIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedAssetIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedAssetIds.length} cloud assets`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete cloud assets'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Provider', 'Region', 'Type', 'Status', 'Risk Score', 'Findings'].join(','),
      ...cloudAssets.map((a) =>
        [
          a.name,
          a.metadata.cloudProvider || '',
          a.metadata.region || '',
          a.metadata.resourceType || '',
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
    link.download = 'cloud-assets.csv'
    link.click()
    toast.success('Cloud assets exported')
  }

  // Reset region and resourceType when provider changes
  const handleProviderChange = (provider: 'aws' | 'gcp' | 'azure') => {
    setFormData({
      ...formData,
      cloudProvider: provider,
      region: '',
      resourceType: '',
    })
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Cloud Assets"
          description={`${cloudAssets.length} cloud resources across AWS, GCP, and Azure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyCloudForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Cloud Asset
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setProviderFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Total Assets
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-orange-500 transition-colors ${providerFilter === 'aws' ? 'border-orange-500' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'aws' ? 'all' : 'aws')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-orange-500" />
                AWS
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-orange-500">{providerCounts.aws}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-blue-500 transition-colors ${providerFilter === 'gcp' ? 'border-blue-500' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'gcp' ? 'all' : 'gcp')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-500" />
                GCP
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{providerCounts.gcp}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-cyan-500 transition-colors ${providerFilter === 'azure' ? 'border-cyan-500' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'azure' ? 'all' : 'azure')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-cyan-500" />
                Azure
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-cyan-500">{providerCounts.azure}</CardTitle>
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
                  {cloudAssets.filter((a) => a.findingCount > 0).length}
                </CardTitle>
              )}
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
                  <Cloud className="h-5 w-5" />
                  All Cloud Assets
                </CardTitle>
                <CardDescription>Manage your cloud infrastructure resources</CardDescription>
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
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cloud assets..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Provider filter */}
                <Select
                  value={providerFilter}
                  onValueChange={(v) => setProviderFilter(v as ProviderFilter)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="gcp">GCP</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                  </SelectContent>
                </Select>

                {Object.keys(rowSelection).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected assets...')}>
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
                          setSelectedAsset(row.original)
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
                        No cloud assets found.
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

      {/* Cloud Asset Details Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset && !editDialogOpen}
        onOpenChange={() => setSelectedAsset(null)}
        icon={Cloud}
        iconColor="text-sky-500"
        gradientFrom="from-sky-500/20"
        gradientVia="via-sky-500/10"
        assetTypeName="Cloud Resource"
        relationships={selectedAsset ? getAssetRelationships(selectedAsset.id) : []}
        onEdit={() => selectedAsset && handleOpenEdit(selectedAsset)}
        onDelete={() => {
          if (selectedAsset) {
            setAssetToDelete(selectedAsset)
            setDeleteDialogOpen(true)
            setSelectedAsset(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedAsset && (
            <Button size="sm" variant="outline" onClick={() => handleOpenConsole(selectedAsset)}>
              <Globe className="mr-2 h-4 w-4" />
              Console
            </Button>
          )
        }
        statsContent={
          selectedAsset && (
            <StatsGrid columns={3}>
              <div className="rounded-xl border p-4 bg-card">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                      providerStyles[selectedAsset.metadata.cloudProvider || '']?.bg || 'bg-muted'
                    }`}
                  >
                    <Cloud
                      className={`h-5 w-5 ${
                        providerStyles[selectedAsset.metadata.cloudProvider || '']?.icon || ''
                      }`}
                    />
                  </div>
                  <p className="text-xs font-bold uppercase">
                    {selectedAsset.metadata.cloudProvider}
                  </p>
                  <p className="text-xs text-muted-foreground">Provider</p>
                </div>
              </div>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedAsset.riskScore}
                label="Risk"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedAsset.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedAsset && (
            <div className="rounded-xl border p-4 bg-card space-y-3">
              <SectionTitle>Resource Information</SectionTitle>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  {getProviderBadge(selectedAsset.metadata.cloudProvider)}
                </div>
                <div>
                  <p className="text-muted-foreground">Region</p>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedAsset.metadata.region}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Resource Type</p>
                  <Badge variant="outline">{selectedAsset.metadata.resourceType}</Badge>
                </div>
              </div>
              {selectedAsset.description && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">{selectedAsset.description}</p>
                </div>
              )}
            </div>
          )
        }
      />

      {/* Add Cloud Asset Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Add Cloud Asset
            </DialogTitle>
            <DialogDescription>Add a new cloud resource to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Resource Name *</Label>
              <Input
                id="name"
                placeholder="e.g., aws-prod-ec2-main"
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
              <Label htmlFor="provider">Cloud Provider *</Label>
              <Select
                value={formData.cloudProvider}
                onValueChange={(value) => handleProviderChange(value as 'aws' | 'gcp' | 'azure')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">AWS</SelectItem>
                  <SelectItem value="gcp">GCP</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionsByProvider[formData.cloudProvider]?.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resourceType">Resource Type *</Label>
                <Select
                  value={formData.resourceType}
                  onValueChange={(value) => setFormData({ ...formData, resourceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypesByProvider[formData.cloudProvider]?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
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
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="production, critical, database"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAsset}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cloud Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cloud Asset Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Cloud Asset
            </DialogTitle>
            <DialogDescription>Update cloud resource information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Resource Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., aws-prod-ec2-main"
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
              <Label htmlFor="edit-provider">Cloud Provider *</Label>
              <Select
                value={formData.cloudProvider}
                onValueChange={(value) => handleProviderChange(value as 'aws' | 'gcp' | 'azure')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">AWS</SelectItem>
                  <SelectItem value="gcp">GCP</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-region">Region *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionsByProvider[formData.cloudProvider]?.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-resourceType">Resource Type *</Label>
                <Select
                  value={formData.resourceType}
                  onValueChange={(value) => setFormData({ ...formData, resourceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypesByProvider[formData.cloudProvider]?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
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
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                placeholder="production, critical, database"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAsset}>
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
            <AlertDialogTitle>Delete Cloud Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{assetToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteAsset}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

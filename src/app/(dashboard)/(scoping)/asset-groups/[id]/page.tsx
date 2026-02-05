'use client'

import { use, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Main } from '@/components/layout'
import { RiskScoreBadge } from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FolderKanban,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Globe,
  Server,
  Database,
  Cloud,
  GitBranch,
  AlertTriangle,
  Download,
  Search as SearchIcon,
  X,
  Link,
  Eye,
  Building2,
  User,
  Mail,
  Tags,
  Package,
  FileSearch,
  RefreshCw,
} from 'lucide-react'
import {
  useAssetGroup,
  useGroupAssets,
  useGroupFindings,
  useUpdateAssetGroup,
  useDeleteAssetGroup,
  useRemoveAssetsFromGroup,
  useAddAssetsToGroup,
  EditGroupDialog,
  type EditGroupFormData,
  AddAssetsDialog,
  type AddAssetsSubmitData,
} from '@/features/asset-groups'

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
}

const environmentColors: Record<string, string> = {
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  staging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  testing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  info: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  domain: <Globe className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  api: <Server className="h-4 w-4" />,
  host: <Server className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  project: <GitBranch className="h-4 w-4" />,
  repository: <GitBranch className="h-4 w-4" />, // @deprecated
  database: <Database className="h-4 w-4" />,
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AssetGroupDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  // Data fetching with hooks
  const { data: group, isLoading: groupLoading, mutate: refreshGroup } = useAssetGroup(id)
  const { data: assets, isLoading: _assetsLoading, mutate: mutateAssets } = useGroupAssets(id)
  const { data: findings, isLoading: _findingsLoading } = useGroupFindings(id)

  // Mutations
  const { trigger: updateGroup, isMutating: isUpdating } = useUpdateAssetGroup(id)
  const { trigger: deleteGroup, isMutating: isDeleting } = useDeleteAssetGroup(id)
  const { trigger: removeAssets, isMutating: isRemovingAssets } = useRemoveAssetsFromGroup(id)
  const { trigger: addAssets, isMutating: isAddingAssets } = useAddAssetsToGroup(id)

  // URL Search Params for tab sync
  const searchParams = useSearchParams()

  // Use URL as source of truth for active tab
  const activeTab = searchParams.get('tab') || 'overview'

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'overview') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
      router.replace(newUrl, { scroll: false })
    },
    [searchParams, router]
  )
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])

  // Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [removeAssetsDialogOpen, setRemoveAssetsDialogOpen] = useState(false)
  const [addAssetsDialogOpen, setAddAssetsDialogOpen] = useState(false)

  // Pagination State
  const [assetsPage, setAssetsPage] = useState(1)
  const [assetsPageSize, setAssetsPageSize] = useState(10)
  const [findingsPage, setFindingsPage] = useState(1)
  const [findingsPageSize, setFindingsPageSize] = useState(10)

  // Derived data from hooks - wrapped in useMemo to prevent unnecessary re-renders
  const safeAssets = useMemo(() => assets || [], [assets])
  const safeFindings = useMemo(() => findings || [], [findings])

  // All useMemo hooks must be called before early return
  const filteredAssets = useMemo(() => {
    if (!assetSearch) return safeAssets
    return safeAssets.filter((a) => a.name.toLowerCase().includes(assetSearch.toLowerCase()))
  }, [safeAssets, assetSearch])

  // Paginated assets
  const paginatedAssets = useMemo(() => {
    const startIndex = (assetsPage - 1) * assetsPageSize
    return filteredAssets.slice(startIndex, startIndex + assetsPageSize)
  }, [filteredAssets, assetsPage, assetsPageSize])

  const totalAssetsPages = useMemo(() => {
    return Math.ceil(filteredAssets.length / assetsPageSize)
  }, [filteredAssets.length, assetsPageSize])

  // Paginated findings
  const paginatedFindings = useMemo(() => {
    const startIndex = (findingsPage - 1) * findingsPageSize
    return safeFindings.slice(startIndex, startIndex + findingsPageSize)
  }, [safeFindings, findingsPage, findingsPageSize])

  const totalFindingsPages = useMemo(() => {
    return Math.ceil(safeFindings.length / findingsPageSize)
  }, [safeFindings.length, findingsPageSize])

  // Helper function to get asset detail URL based on type
  const getAssetDetailUrl = useCallback((type: string, assetId: string) => {
    const typeRoutes: Record<string, string> = {
      repository: `/assets/repositories/${assetId}`,
      domain: `/assets/domains/${assetId}`,
      host: `/assets/hosts/${assetId}`,
      cloud: `/assets/cloud/${assetId}`,
      website: `/assets/websites/${assetId}`,
      service: `/assets/services/${assetId}`,
      api: `/assets/apis/${assetId}`,
      database: `/assets/databases/${assetId}`,
      container: `/assets/containers/${assetId}`,
      serverless: `/assets/serverless/${assetId}`,
      mobile: `/assets/mobile/${assetId}`,
      certificate: `/assets/certificates/${assetId}`,
      network: `/assets/networks/${assetId}`,
      storage: `/assets/storage/${assetId}`,
      compute: `/assets/compute/${assetId}`,
    }
    return typeRoutes[type.toLowerCase()] || `/assets/${assetId}`
  }, [])

  const assetsByType = useMemo(() => {
    const counts: Record<string, number> = {}
    safeAssets.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1
    })
    return counts
  }, [safeAssets])

  const findingsBySeverity = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    safeFindings.forEach((f) => {
      counts[f.severity] = (counts[f.severity] || 0) + 1
    })
    return counts
  }, [safeFindings])

  // Pagination handlers - must be defined before early returns
  const handleAssetsPageChange = useCallback((page: number) => {
    setAssetsPage(page)
    setSelectedAssets([]) // Clear selection on page change
  }, [])

  const handleAssetsPageSizeChange = useCallback((pageSize: number) => {
    setAssetsPageSize(pageSize)
    setAssetsPage(1) // Reset to first page
    setSelectedAssets([])
  }, [])

  const handleFindingsPageChange = useCallback((page: number) => {
    setFindingsPage(page)
  }, [])

  const handleFindingsPageSizeChange = useCallback((pageSize: number) => {
    setFindingsPageSize(pageSize)
    setFindingsPage(1) // Reset to first page
  }, [])

  // Reset assets page when search changes
  const handleAssetSearchChange = useCallback((value: string) => {
    setAssetSearch(value)
    setAssetsPage(1) // Reset to first page on new search
    setSelectedAssets([])
  }, [])

  // Loading state with skeleton UI
  if (groupLoading) {
    return (
      <>
        <Main>
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>

          {/* Stats cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-9 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-80 rounded-md mb-6" />

          {/* Content skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-full max-w-[200px] mb-1" />
                          <Skeleton className="h-2 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Main>
      </>
    )
  }

  // Not found - early return after all hooks
  if (!group) {
    return (
      <>
        <Main>
          <div className="flex flex-col items-center justify-center py-20">
            <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The asset group you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/asset-groups')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Button>
          </div>
        </Main>
      </>
    )
  }

  // Handlers
  const handleCopyId = () => {
    navigator.clipboard.writeText(group.id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (formData: EditGroupFormData) => {
    try {
      await updateGroup({
        name: formData.name,
        description: formData.description || undefined,
        environment: formData.environment,
        criticality: formData.criticality,
        businessUnit: formData.businessUnit || undefined,
        owner: formData.owner || undefined,
        ownerEmail: formData.ownerEmail || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      })
      refreshGroup()
      setEditDialogOpen(false)
    } catch {
      // Error already handled by hook with toast
    }
  }

  const handleDelete = async () => {
    try {
      await deleteGroup()
      setDeleteDialogOpen(false)
      router.push('/asset-groups')
    } catch {
      // Error already handled by hook with toast
    }
  }

  const handleRemoveAssets = async () => {
    try {
      await removeAssets(selectedAssets)
      setSelectedAssets([])
      setRemoveAssetsDialogOpen(false)
      // Refresh data to get updated counts
      refreshGroup()
    } catch {
      // Error already handled by hook
    }
  }

  const handleAddAssets = async (data: AddAssetsSubmitData) => {
    try {
      // Add existing assets
      if (data.existingAssetIds.length > 0) {
        await addAssets(data.existingAssetIds)
      }
      // TODO: Create new assets via API then add to group
      // For now, we only support adding existing assets
      // New assets would need a separate API call to create them first

      setAddAssetsDialogOpen(false)
      // Refresh data to get updated counts
      refreshGroup()
    } catch {
      // Error already handled by hook
    }
  }

  const handleExport = (format: string) => {
    toast.success(`Exporting group as ${format}...`)
  }

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    )
  }

  return (
    <>
      <Main>
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/asset-groups')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  group.criticality === 'critical'
                    ? 'bg-red-500/20'
                    : group.criticality === 'high'
                      ? 'bg-orange-500/20'
                      : group.criticality === 'medium'
                        ? 'bg-yellow-500/20'
                        : 'bg-blue-500/20'
                }`}
              >
                <FolderKanban
                  className={`h-6 w-6 ${
                    group.criticality === 'critical'
                      ? 'text-red-500'
                      : group.criticality === 'high'
                        ? 'text-orange-500'
                        : group.criticality === 'medium'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                  }`}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {group.description || 'No description'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={environmentColors[group.environment]}>
              {group.environment}
            </Badge>
            <Badge className={criticalityColors[group.criticality]}>{group.criticality}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyId}>
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </Button>
            <Can permission={Permission.AssetGroupsWrite}>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Can>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link className="mr-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('JSON')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('CSV')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <Can permission={Permission.AssetGroupsDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="text-3xl">{group.assetCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Findings</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{group.findingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Risk Score</CardDescription>
              <div className="pt-1">
                <RiskScoreBadge score={group.riskScore} size="lg" />
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Updated</CardDescription>
              <CardTitle className="text-lg">
                {new Date(group.updatedAt).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Assets ({group.assetCount})</TabsTrigger>
            <TabsTrigger value="findings">Findings ({group.findingCount})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Asset Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Distribution</CardTitle>
                  <CardDescription>Breakdown by asset type</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(assetsByType).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No assets in this group yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(assetsByType).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            {assetTypeIcons[type] || <Server className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">{type}</span>
                              <span className="text-sm text-muted-foreground">{count}</span>
                            </div>
                            <Progress value={(count / group.assetCount) * 100} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Finding Severity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Finding Severity</CardTitle>
                  <CardDescription>Breakdown by severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(findingsBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={severityColors[severity]}>
                            {severity}
                          </Badge>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Assessment</CardTitle>
                  <CardDescription>Overall group risk score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <RiskScoreBadge score={group.riskScore} size="lg" />
                    <div className="flex-1">
                      <Progress
                        value={group.riskScore}
                        className={`h-3 ${
                          group.riskScore >= 80
                            ? '[&>div]:bg-red-500'
                            : group.riskScore >= 60
                              ? '[&>div]:bg-orange-500'
                              : group.riskScore >= 40
                                ? '[&>div]:bg-yellow-500'
                                : '[&>div]:bg-green-500'
                        }`}
                      />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Group Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Group Information</CardTitle>
                  <CardDescription>Metadata and details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Group ID</span>
                      <span className="font-mono">{group.id}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span>{new Date(group.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <Badge variant="outline" className={environmentColors[group.environment]}>
                        {group.environment}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criticality</span>
                      <Badge className={criticalityColors[group.criticality]}>
                        {group.criticality}
                      </Badge>
                    </div>
                    {group.businessUnit && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Business Unit
                          </span>
                          <span>{group.businessUnit}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Owner Info */}
              {(group.owner || group.ownerEmail) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{group.owner || 'Not assigned'}</p>
                        {group.ownerEmail && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {group.ownerEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {group.tags && group.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tags className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assets</CardTitle>
                    <CardDescription>{filteredAssets.length} assets in this group</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAssets.length > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedAssets.length} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveAssetsDialogOpen(true)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove from Group
                        </Button>
                      </>
                    )}
                    <Button size="sm" onClick={() => setAddAssetsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Assets
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={assetSearch}
                    onChange={(e) => handleAssetSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Table or Empty State */}
                {filteredAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {assetSearch ? 'No assets found' : 'No assets in this group'}
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                      {assetSearch
                        ? `No assets matching "${assetSearch}". Try a different search term.`
                        : 'Add assets to this group to start tracking and managing them together.'}
                    </p>
                    {assetSearch ? (
                      <Button variant="outline" onClick={() => setAssetSearch('')}>
                        <X className="mr-2 h-4 w-4" />
                        Clear Search
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setAddAssetsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Assets
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  paginatedAssets.length > 0 &&
                                  paginatedAssets.every((a) => selectedAssets.includes(a.id))
                                }
                                onCheckedChange={() => {
                                  const currentPageIds = paginatedAssets.map((a) => a.id)
                                  const allSelected = currentPageIds.every((id) =>
                                    selectedAssets.includes(id)
                                  )
                                  if (allSelected) {
                                    setSelectedAssets((prev) =>
                                      prev.filter((id) => !currentPageIds.includes(id))
                                    )
                                  } else {
                                    setSelectedAssets((prev) => [
                                      ...new Set([...prev, ...currentPageIds]),
                                    ])
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Asset</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Findings</TableHead>
                            <TableHead>Last Seen</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAssets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedAssets.includes(asset.id)}
                                  onCheckedChange={() => toggleAssetSelection(asset.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                    {assetTypeIcons[asset.type]}
                                  </div>
                                  <span className="font-medium">{asset.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {asset.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    asset.status === 'active'
                                      ? 'text-green-500 border-green-500/30 bg-green-500/10'
                                      : asset.status === 'monitoring'
                                        ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                                        : 'text-gray-500 border-gray-500/30 bg-gray-500/10'
                                  }
                                >
                                  {asset.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <RiskScoreBadge score={asset.riskScore} size="sm" />
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    asset.findingCount > 0 ? 'text-orange-500 font-medium' : ''
                                  }
                                >
                                  {asset.findingCount}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(asset.lastSeen).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    router.push(getAssetDetailUrl(asset.type, asset.id))
                                  }
                                  title="View asset details"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination */}
                    {filteredAssets.length > assetsPageSize && (
                      <Pagination
                        currentPage={assetsPage}
                        totalPages={totalAssetsPages}
                        pageSize={assetsPageSize}
                        totalItems={filteredAssets.length}
                        onPageChange={handleAssetsPageChange}
                        onPageSizeChange={handleAssetsPageSizeChange}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                <CardDescription>Security findings associated with this group</CardDescription>
              </CardHeader>
              <CardContent>
                {safeFindings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    {group.findingCount > 0 ? (
                      <>
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10 mb-4">
                          <AlertTriangle className="h-10 w-10 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Loading Findings...</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                          {group.findingCount} findings are associated with this group but could not
                          be loaded. Please try refreshing the page.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.reload()}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh Page
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 mb-4">
                          <FileSearch className="h-10 w-10 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Findings</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                          Great news! No security findings have been discovered for assets in this
                          group.
                        </p>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Run Security Scan
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Finding</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Asset</TableHead>
                            <TableHead>Discovered</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedFindings.map((finding) => (
                            <TableRow key={finding.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  <span className="font-medium">{finding.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={severityColors[finding.severity]}
                                >
                                  {finding.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    finding.status === 'resolved'
                                      ? 'text-green-500 border-green-500/30 bg-green-500/10'
                                      : finding.status === 'in_progress'
                                        ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                                        : 'text-orange-500 border-orange-500/30 bg-orange-500/10'
                                  }
                                >
                                  {finding.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {finding.assetName}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(finding.discoveredAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => router.push(`/findings/${finding.id}`)}
                                  title="View finding details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination */}
                    {safeFindings.length > findingsPageSize && (
                      <Pagination
                        currentPage={findingsPage}
                        totalPages={totalFindingsPages}
                        pageSize={findingsPageSize}
                        totalItems={safeFindings.length}
                        onPageChange={handleFindingsPageChange}
                        onPageSizeChange={handleFindingsPageSizeChange}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* Edit Dialog */}
      <EditGroupDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        group={group}
        onSubmit={handleSaveEdit}
        isSubmitting={isUpdating}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{group.name}&quot;? This action cannot be
              undone. All {group.assetCount} assets will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Assets Dialog */}
      <AlertDialog open={removeAssetsDialogOpen} onOpenChange={setRemoveAssetsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assets from Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedAssets.length} assets from this group? They
              will become ungrouped assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingAssets}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssets} disabled={isRemovingAssets}>
              {isRemovingAssets ? 'Removing...' : 'Remove Assets'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Assets Dialog */}
      <AddAssetsDialog
        open={addAssetsDialogOpen}
        onOpenChange={setAddAssetsDialogOpen}
        groupName={group.name}
        groupAssets={safeAssets}
        onSubmit={handleAddAssets}
        onRemove={async (assetId) => {
          await removeAssets([assetId])
          mutateAssets()
          refreshGroup()
        }}
        isSubmitting={isAddingAssets}
        isRemoving={isRemovingAssets}
      />
    </>
  )
}

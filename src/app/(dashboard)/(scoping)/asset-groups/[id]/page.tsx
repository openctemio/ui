'use client'

import { use, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUrlParams } from '@/hooks/use-url-param'
import { Main } from '@/components/layout'
import type { ColumnDef } from '@tanstack/react-table'
import {
  PageHeader,
  RiskScoreBadge,
  StatsCard,
  SeverityBadge,
  EmptyState,
  DataTable,
  DataTableColumnHeader,
} from '@/features/shared'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Can, Permission } from '@/lib/permissions'
import { CRITICALITY_BADGE_SOFT } from '@/lib/criticality-colors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsCount } from '@/components/ui/tabs'
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
  Download,
  X,
  Link,
  Eye,
  Building2,
  User,
  Mail,
  Tags,
  Package,
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
  type GroupAsset,
  type GroupFinding,
} from '@/features/asset-groups'
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'

const criticalityColors: Record<string, string> = CRITICALITY_BADGE_SOFT

const environmentColors: Record<string, string> = {
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  staging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  testing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

/** Most severe first when sorted descending. */
const SEVERITY_RANK: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 }

const assetStatusClass: Record<string, string> = {
  active: 'border-success/30 bg-success/15 text-success',
  monitoring: 'border-info/30 bg-info/15 text-info',
}

const findingStatusClass: Record<string, string> = {
  resolved: 'border-success/30 bg-success/15 text-success',
  in_progress: 'border-info/30 bg-info/15 text-info',
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

const GROUP_ASSET_EXPORT_FIELDS: ExportFieldConfig<GroupAsset>[] = [
  { header: 'Name', accessor: (a) => a.name },
  { header: 'Type', accessor: (a) => a.type },
  { header: 'Status', accessor: (a) => a.status },
  { header: 'Risk Score', accessor: (a) => a.riskScore ?? '' },
  { header: 'Findings', accessor: (a) => a.findingCount ?? 0 },
  { header: 'Last Seen', accessor: (a) => a.lastSeen ?? '' },
]

export default function AssetGroupDetailPage({ params }: PageProps) {
  return <AssetGroupDetailContent params={params} />
}

function AssetGroupDetailContent({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  // Data fetching with hooks
  const { data: group, isLoading: groupLoading, mutate: refreshGroup } = useAssetGroup(id)
  const { data: assets, isLoading: assetsLoading, mutate: mutateAssets } = useGroupAssets(id)
  const { data: findings, isLoading: findingsLoading } = useGroupFindings(id)

  // Mutations
  const { trigger: updateGroup, isMutating: isUpdating } = useUpdateAssetGroup(id)
  const { trigger: deleteGroup, isMutating: isDeleting } = useDeleteAssetGroup(id)
  const { trigger: removeAssets, isMutating: isRemovingAssets } = useRemoveAssetsFromGroup(id)
  const { trigger: addAssets, isMutating: isAddingAssets } = useAddAssetsToGroup(id)

  // URL Search Params for tab sync
  const searchParams = useUrlParams()

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
  // The assets table owns its checkboxes; this mirrors the ticked ids for the
  // bulk remove, and bumping selectionEpoch clears the table's copy.
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)

  // Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [removeAssetsDialogOpen, setRemoveAssetsDialogOpen] = useState(false)
  const [addAssetsDialogOpen, setAddAssetsDialogOpen] = useState(false)

  // Derived data from hooks - wrapped in useMemo to prevent unnecessary re-renders
  const safeAssets = useMemo(() => assets || [], [assets])
  const safeFindings = useMemo(() => findings || [], [findings])

  // CSV export of the group's assets. Declared before any early return so the
  // hook order stays stable (rules-of-hooks).
  const { handleExport: exportAssetsCsv } = useCsvExport(
    safeAssets,
    GROUP_ASSET_EXPORT_FIELDS,
    group ? `asset-group-${group.name}` : 'asset-group'
  )

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

  // Table columns - defined before the early returns (rules-of-hooks).
  const assetColumns = useMemo<ColumnDef<GroupAsset>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
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
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Asset" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              {assetTypeIcons[row.original.type]}
            </span>
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              'capitalize',
              assetStatusClass[row.original.status] ?? 'bg-muted text-muted-foreground'
            )}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'riskScore',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Risk score" />,
        cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
      },
      {
        accessorKey: 'findingCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
        cell: ({ row }) => (
          <span
            className={cn(
              'tabular-nums',
              row.original.findingCount > 0 && 'font-medium text-warning'
            )}
          >
            {row.original.findingCount}
          </span>
        ),
      },
      {
        accessorKey: 'lastSeen',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last seen" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.lastSeen).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(getAssetDetailUrl(row.original.type, row.original.id))}
            aria-label={`Open ${row.original.name}`}
            title="View asset details"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router, getAssetDetailUrl]
  )

  const findingColumns = useMemo<ColumnDef<GroupFinding>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        sortingFn: (a, b) =>
          (SEVERITY_RANK[a.original.severity] ?? 0) - (SEVERITY_RANK[b.original.severity] ?? 0),
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              'capitalize',
              findingStatusClass[row.original.status] ??
                'border-warning/30 bg-warning/15 text-warning'
            )}
          >
            {row.original.status.replace('_', ' ')}
          </Badge>
        ),
      },
      {
        accessorKey: 'assetName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Asset" />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.assetName}</span>,
      },
      {
        accessorKey: 'discoveredAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Discovered" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.discoveredAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/findings/${row.original.id}`)}
            aria-label={`Open ${row.original.title}`}
            title="View finding details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  )

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
              <ArrowLeft className="me-2 h-4 w-4" />
              Back to Groups
            </Button>
          </div>
        </Main>
      </>
    )
  }

  // Handlers
  const handleCopyId = () => {
    copyToClipboard(group.id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = () => {
    copyToClipboard(window.location.href)
    toast.success('Link copied to clipboard')
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (formData: EditGroupFormData) => {
    try {
      // The asset-groups PUT is a partial update: an omitted key keeps the old
      // value. Send explicit empty string / empty array (not undefined) so
      // clearing a field actually persists instead of silently reverting.
      // owner_email is the exception — the backend 422s on an empty email, so
      // it can't be cleared from here (send undefined to leave it unchanged;
      // clearing it needs a backend change to accept "").
      await updateGroup({
        name: formData.name,
        description: formData.description,
        environment: formData.environment,
        criticality: formData.criticality,
        businessUnit: formData.businessUnit,
        owner: formData.owner,
        ownerEmail: formData.ownerEmail || undefined,
        tags: formData.tags,
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
      setSelectionEpoch((n) => n + 1)
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
      // Only supports adding existing assets. New asset creation from this view planned for Phase 2.

      setAddAssetsDialogOpen(false)
      // Refresh data to get updated counts
      refreshGroup()
    } catch {
      // Error already handled by hook
    }
  }

  const handleExport = (format: 'CSV' | 'JSON') => {
    if (format === 'CSV') {
      exportAssetsCsv()
      return
    }
    // JSON: export the group plus its assets.
    const payload = { group, assets: safeAssets }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asset-group-${group?.name ?? id}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported successfully')
  }

  return (
    <>
      <Main>
        {/* Header with Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-2"
          onClick={() => router.push('/asset-groups')}
        >
          <ArrowLeft className="me-2 h-4 w-4" />
          Back to asset groups
        </Button>
        <PageHeader
          title={group.name}
          className="mb-6"
          description={
            <div className="flex flex-wrap items-center gap-2">
              <span>{group.description || 'No description'}</span>
              <Badge variant="outline" className={environmentColors[group.environment]}>
                {group.environment}
              </Badge>
              <Badge variant="outline" className={criticalityColors[group.criticality]}>
                {group.criticality}
              </Badge>
            </div>
          }
        >
          <Button variant="outline" size="sm" onClick={handleCopyId}>
            <Copy className="me-2 h-4 w-4" />
            Copy ID
          </Button>
          <Can permission={Permission.AssetGroupsWrite}>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="me-2 h-4 w-4" />
              Edit
            </Button>
          </Can>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link className="me-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('JSON')}>
                <Download className="me-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('CSV')}>
                <Download className="me-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <Can permission={Permission.AssetGroupsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  Delete group
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Assets" value={group.assetCount} />
          <StatsCard title="Findings" value={group.findingCount} />
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
            <TabsTrigger value="assets">
              Assets <TabsCount value={group.assetCount} />
            </TabsTrigger>
            <TabsTrigger value="findings">
              Findings <TabsCount value={group.findingCount} />
            </TabsTrigger>
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
                    <EmptyState icon={Package} title="No assets in this group yet" card={false} />
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
                          <SeverityBadge severity={severity as GroupFinding['severity']} />
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
                      <Badge variant="outline" className={criticalityColors[group.criticality]}>
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
            <DataTable
              columns={assetColumns}
              data={safeAssets}
              getRowId={(a) => a.id}
              isLoading={assetsLoading}
              searchKey="name"
              searchPlaceholder="Search assets…"
              onSelectionChange={(rows) => setSelectedAssets(rows.map((a) => a.id))}
              resetSelectionKey={selectionEpoch}
              showSelectionCount={false}
              onRowClick={(a) => router.push(getAssetDetailUrl(a.type, a.id))}
              toolbarEnd={
                <>
                  {selectedAssets.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setRemoveAssetsDialogOpen(true)}
                    >
                      <X className="me-2 h-4 w-4" />
                      Remove {selectedAssets.length} from group
                    </Button>
                  )}
                  <Button size="sm" className="h-9" onClick={() => setAddAssetsDialogOpen(true)}>
                    <Plus className="me-2 h-4 w-4" />
                    Add assets
                  </Button>
                </>
              }
              emptyMessage="No assets in this group"
              emptyDescription="Add assets to this group to track and manage them together"
            />
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="mt-6">
            <DataTable
              columns={findingColumns}
              data={safeFindings}
              getRowId={(f) => f.id}
              isLoading={findingsLoading}
              searchPlaceholder="Search findings…"
              onRowClick={(f) => router.push(`/findings/${f.id}`)}
              emptyMessage={group.findingCount > 0 ? 'Findings could not be loaded' : 'No findings'}
              emptyDescription={
                group.findingCount > 0
                  ? `${group.findingCount} findings belong to this group but none were returned. Refresh the page to try again.`
                  : 'No security findings have been discovered for assets in this group'
              }
            />
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
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Asset Group"
        desc={
          <>
            Are you sure you want to delete &quot;{group.name}&quot;? This action cannot be undone.
            All {group.assetCount} assets will be unassigned.
          </>
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />

      {/* Remove Assets Dialog */}
      <ConfirmDialog
        open={removeAssetsDialogOpen}
        onOpenChange={setRemoveAssetsDialogOpen}
        title="Remove Assets from Group"
        desc={
          <>
            Are you sure you want to remove {selectedAssets.length} assets from this group? They
            will become ungrouped assets.
          </>
        }
        confirmText={isRemovingAssets ? 'Removing...' : 'Remove Assets'}
        isLoading={isRemovingAssets}
        handleConfirm={handleRemoveAssets}
      />

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

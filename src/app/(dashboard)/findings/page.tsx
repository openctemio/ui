'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, SeverityBadge, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Download,
  RefreshCw,
  MoreHorizontal,
  UserPlus,
  Flag,
  CheckCircle,
  ExternalLink,
  Trash2,
  Copy,
  Link2,
  Plus,
  X,
  Filter,
  AlertCircle,
  Loader2,
  Route,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FindingStatusBadge,
  FindingDetailDrawer,
  CreateFindingDialog,
  FINDING_STATUS_CONFIG,
  SEVERITY_CONFIG,
} from '@/features/findings'
import {
  useFindingsApi,
  useFindingStatsApi,
  invalidateFindingsCache,
} from '@/features/findings/api/use-findings-api'
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
import type {
  ApiFinding,
  FindingApiFilters,
  Severity as ApiSeverity,
} from '@/features/findings/api/finding-api.types'
import type { Finding, FindingStatus, FindingUser } from '@/features/findings'
import type { Severity } from '@/features/shared/types'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

// ============================================
// Transform API Finding to UI Finding
// ============================================

function transformApiToUiFinding(api: ApiFinding): Finding {
  // Build location string with branch/commit context
  let locationName = api.file_path || api.asset_id
  if (api.first_detected_branch) {
    locationName = `${api.first_detected_branch}:${locationName}`
  }
  if (api.start_line) {
    locationName = `${locationName}:${api.start_line}`
  }

  return {
    id: api.id,
    title: api.title || api.rule_name || api.message,
    description: api.description || api.snippet || api.message,
    severity: api.severity as Severity,
    status: api.status as FindingStatus,
    cvss: api.cvss_score,
    cvssVector: api.cvss_vector,
    cve: api.cve_id,
    cwe: api.cwe_ids?.[0],
    owasp: api.owasp_ids?.[0],
    tags: api.tags || [],
    assets: [
      {
        id: api.asset_id,
        type: 'repository',
        name: locationName,
        url: api.location,
      },
    ],
    evidence: api.snippet
      ? [
          {
            id: 'snippet-1',
            type: 'code' as const,
            title: 'Code Snippet',
            content: api.snippet,
            createdAt: api.created_at,
            createdBy: { id: 'system', name: 'System', email: '', role: 'admin' as const },
          },
        ]
      : [],
    remediation: {
      description: api.recommendation || api.resolution || '',
      steps: [],
      references: (api.metadata?.references as string[]) || [],
      progress: api.status === 'resolved' ? 100 : 0,
    },
    // Assignee - only show name/email if enriched data is available
    // If assigned_to_user is not present, name will be empty
    // AssigneeSelect will detect this and fetch user info when needed
    assignee: api.assigned_to
      ? {
          id: api.assigned_to,
          name: api.assigned_to_user?.name || '',
          email: api.assigned_to_user?.email || '',
          role: 'analyst' as const,
        }
      : undefined,
    team: undefined,
    source: api.source as Finding['source'],
    scanner: api.tool_name,
    scanId: api.scan_id,
    duplicateOf: undefined,
    relatedFindings: [],
    remediationTaskId: undefined,
    discoveredAt: api.first_detected_at || api.created_at,
    resolvedAt: api.resolved_at,
    verifiedAt: undefined,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    // Data Flow (Attack Path / Taint Tracking)
    // Use has_data_flow flag for list view (no full data loaded)
    // When api.data_flow is present (detail view), use full data
    hasDataFlow: api.has_data_flow || false,
    dataFlow: api.data_flow
      ? {
          sources: api.data_flow.sources?.map((loc) => ({
            path: loc.path,
            line: loc.line,
            column: loc.column,
            content: loc.content,
            label: loc.label,
          })),
          intermediates: api.data_flow.intermediates?.map((loc) => ({
            path: loc.path,
            line: loc.line,
            column: loc.column,
            content: loc.content,
            label: loc.label,
          })),
          sinks: api.data_flow.sinks?.map((loc) => ({
            path: loc.path,
            line: loc.line,
            column: loc.column,
            content: loc.content,
            label: loc.label,
          })),
        }
      : undefined,
  }
}

// ============================================
// Loading Skeleton
// ============================================

function FindingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function FindingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const assetIdFilter = searchParams.get('assetId')
  const sourceIdFilter = searchParams.get('source')

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [severityTab, setSeverityTab] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [findingToDelete, setFindingToDelete] = useState<Finding | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Build API filters
  const apiFilters = useMemo((): FindingApiFilters => {
    const filters: FindingApiFilters = {
      per_page: 100,
    }
    if (assetIdFilter) filters.asset_id = assetIdFilter
    if (sourceIdFilter) filters.source_id = sourceIdFilter
    if (severityTab !== 'all') {
      filters.severities = [severityTab as ApiSeverity]
    }
    return filters
  }, [assetIdFilter, sourceIdFilter, severityTab])

  // Fetch finding stats (stable, not affected by severity filter)
  const { data: findingStats, isLoading: statsLoading, mutate: mutateStats } = useFindingStatsApi()

  // Fetch findings from API (filtered by severity tab)
  const {
    data: findingsResponse,
    error,
    isLoading: findingsLoading,
    mutate: mutateFindings,
  } = useFindingsApi(apiFilters)

  // Initial loading state (only true when we don't have stats yet)
  const isInitialLoading = statsLoading && !findingStats

  // Table loading state (for showing loading indicator in table)
  const isTableLoading = findingsLoading

  // Transform API data to UI format
  const findings = useMemo(() => {
    if (!findingsResponse?.data) return []
    return findingsResponse.data.map(transformApiToUiFinding)
  }, [findingsResponse])

  // Use finding stats for stable counts (not affected by tab filter)
  const stats = useMemo(() => {
    const defaultBySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      none: 0,
    }

    if (!findingStats) {
      return {
        total: 0,
        bySeverity: defaultBySeverity,
        averageCvss: 'N/A',
        overdueCount: 0,
      }
    }

    const bySeverity: Record<Severity, number> = {
      critical: findingStats.by_severity?.critical || 0,
      high: findingStats.by_severity?.high || 0,
      medium: findingStats.by_severity?.medium || 0,
      low: findingStats.by_severity?.low || 0,
      info: findingStats.by_severity?.info || 0,
      none: findingStats.by_severity?.none || 0,
    }

    return {
      total: findingStats.total,
      bySeverity,
      averageCvss: 'N/A',
      overdueCount: findingStats.open_count,
    }
  }, [findingStats])

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length

  const clearFilters = () => {
    router.push('/findings')
  }

  const handleRefresh = async () => {
    await Promise.all([mutateFindings(), mutateStats()])
    await invalidateFindingsCache()
    toast.success('Findings refreshed')
  }

  const handleExport = (format: string) => {
    toast.success(`Exporting findings as ${format}...`, {
      description: 'File will be downloaded shortly',
    })
  }

  const handleBulkAssign = () => {
    toast.success(`Assigning ${selectedCount} findings...`)
    setRowSelection({})
  }

  const handleBulkStatusChange = (status: string) => {
    toast.success(`Updating ${selectedCount} findings to ${status}`)
    setRowSelection({})
  }

  const handleRowClick = useCallback((finding: Finding) => {
    setSelectedFinding(finding)
    setDrawerOpen(true)
  }, [])

  const handleStatusChange = (findingId: string, status: FindingStatus) => {
    const statusConfig = FINDING_STATUS_CONFIG[status]
    toast.success(`Status updated to "${statusConfig.label}"`, {
      description: `Finding ${findingId}`,
    })
    mutateFindings()
    mutateStats()
  }

  const handleSeverityChange = (findingId: string, severity: Severity) => {
    const severityConfig = SEVERITY_CONFIG[severity]
    toast.success(`Severity updated to "${severityConfig.label}"`, {
      description: `Finding ${findingId}`,
    })
    mutateFindings()
    mutateStats()
  }

  const handleAssigneeChange = (findingId: string, assignee: FindingUser | null) => {
    if (assignee) {
      toast.success(`Assigned to ${assignee.name}`, {
        description: `Finding ${findingId}`,
      })
    } else {
      toast.info('Finding unassigned', {
        description: `Finding ${findingId}`,
      })
    }
    mutateFindings()
  }

  const handleAddComment = (findingId: string, comment: string) => {
    toast.success('Comment added', {
      description: comment.slice(0, 50) + (comment.length > 50 ? '...' : ''),
    })
  }

  const handleDeleteClick = (finding: Finding) => {
    setFindingToDelete(finding)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!findingToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v1/findings/${findingToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete finding')
      }

      toast.success('Finding deleted', {
        description: findingToDelete.title,
      })
      setDeleteDialogOpen(false)
      setFindingToDelete(null)
      mutateFindings()
      mutateStats()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete finding'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRowAction = useCallback(
    (action: string, finding: Finding) => {
      switch (action) {
        case 'view':
          handleRowClick(finding)
          break
        case 'copy_id':
          navigator.clipboard.writeText(finding.id)
          toast.success('Finding ID copied to clipboard')
          break
        case 'copy_link':
          navigator.clipboard.writeText(`${window.location.origin}/findings/${finding.id}`)
          toast.success('Link copied to clipboard')
          break
        case 'delete':
          handleDeleteClick(finding)
          break
        default:
          toast.info(`Action: ${action}`, { description: finding.title })
      }
    },
    [handleRowClick]
  )

  // Define columns for DataTable
  const columns: ColumnDef<Finding>[] = useMemo(
    () => [
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
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          // Use hasDataFlow flag from API (populated via subquery in list view)
          // Fall back to checking dataFlow object for detail view compatibility
          const hasDataFlow =
            row.original.hasDataFlow ||
            (row.original.dataFlow &&
              ((row.original.dataFlow.sources?.length ?? 0) > 0 ||
                (row.original.dataFlow.intermediates?.length ?? 0) > 0 ||
                (row.original.dataFlow.sinks?.length ?? 0) > 0))

          return (
            <div
              className="cursor-pointer max-w-[200px] sm:max-w-md"
              onClick={() => handleRowClick(row.original)}
            >
              <div className="flex items-center gap-1.5">
                <p className="font-medium truncate">{row.getValue('title')}</p>
                {hasDataFlow && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 shrink-0">
                        <Route className="h-2.5 w-2.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Has attack path data
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {row.original.scanner && (
                <p className="text-muted-foreground text-xs truncate">{row.original.scanner}</p>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.getValue('severity')} />,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        id: 'source',
        accessorFn: (row) => row.source || '-',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs uppercase">
            {row.getValue('source')}
          </Badge>
        ),
      },
      {
        id: 'asset',
        accessorFn: (row) => row.assets[0]?.name || '-',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px] block">
            {row.getValue('asset')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <FindingStatusBadge status={row.getValue('status')} />,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.getValue('createdAt')).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const finding = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRowAction('view', finding)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('assign', finding)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('status', finding)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRowAction('copy_id', finding)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('copy_link', finding)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-amber-500"
                  onClick={() => handleRowAction('false_positive', finding)}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Mark as False Positive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => handleRowAction('delete', finding)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [handleRowAction, handleRowClick]
  )

  // Error state
  if (error) {
    return (
      <>
        <Main>
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load findings</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => mutateFindings()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Security Findings"
          description={
            isInitialLoading
              ? 'Loading findings...'
              : `${stats.total} total findings - ${stats.overdueCount} open`
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={statsLoading || findingsLoading}
            >
              {statsLoading || findingsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('CSV')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('JSON')}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('PDF')}>
                  Export as PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Finding</span>
            </Button>
          </div>
        </PageHeader>

        {/* Active Filter Indicators */}
        {(assetIdFilter || sourceIdFilter) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {assetIdFilter && (
              <Badge variant="secondary" className="gap-1.5">
                Asset: {assetIdFilter.slice(0, 8)}...
                <button
                  onClick={clearFilters}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sourceIdFilter && (
              <Badge variant="secondary" className="gap-1.5">
                Source: {sourceIdFilter.slice(0, 8)}...
                <button
                  onClick={clearFilters}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Bulk Actions Bar - Shows when items selected */}
        {selectedCount > 0 && (
          <Card className="mt-4 border-primary">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{selectedCount} finding(s) selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkAssign}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Flag className="mr-2 h-4 w-4" />
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('open')}>
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('in_progress')}>
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('resolved')}>
                      Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('false_positive')}>
                      False Positive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setRowSelection({})}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialLoading ? (
          <div className="mt-6">
            <FindingsLoadingSkeleton />
          </div>
        ) : (
          <>
            {/* Stats Cards - Always visible once loaded */}
            {/* Mobile: 2x2 grid showing Critical, High, Medium, Low */}
            {/* Desktop: 5 columns showing all severities */}
            <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Critical</CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-red-500">
                    {stats.bySeverity.critical}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>High</CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-orange-500">
                    {stats.bySeverity.high}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Medium</CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-yellow-500">
                    {stats.bySeverity.medium}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Low</CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-blue-500">
                    {stats.bySeverity.low}
                  </CardTitle>
                </CardHeader>
              </Card>
              {/* Info card - hidden on mobile to maintain 2x2 grid */}
              <Card className="hidden lg:block">
                <CardHeader className="pb-2">
                  <CardDescription>Info</CardDescription>
                  <CardTitle className="text-3xl text-gray-500">{stats.bySeverity.info}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Tabs with DataTable */}
            <Tabs value={severityTab} onValueChange={setSeverityTab} className="mt-6">
              {/* Scroll container with fade indicator on mobile */}
              <div className="relative sm:static">
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  <TabsList className="h-auto w-max">
                    <TabsTrigger value="all" className="text-xs sm:text-sm shrink-0">
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger value="critical" className="text-xs sm:text-sm shrink-0">
                      <span className="hidden sm:inline">Critical</span>
                      <span className="sm:hidden">Crit</span>
                      <span className="ml-1">({stats.bySeverity.critical})</span>
                    </TabsTrigger>
                    <TabsTrigger value="high" className="text-xs sm:text-sm shrink-0">
                      High ({stats.bySeverity.high})
                    </TabsTrigger>
                    <TabsTrigger value="medium" className="text-xs sm:text-sm shrink-0">
                      <span className="hidden sm:inline">Medium</span>
                      <span className="sm:hidden">Med</span>
                      <span className="ml-1">({stats.bySeverity.medium})</span>
                    </TabsTrigger>
                    <TabsTrigger value="low" className="text-xs sm:text-sm shrink-0">
                      Low ({stats.bySeverity.low})
                    </TabsTrigger>
                  </TabsList>
                </div>
                {/* Fade indicator for scrollable content on mobile */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
              </div>

              <TabsContent value={severityTab}>
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    {isTableLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <DataTable
                        columns={columns}
                        data={findings}
                        searchPlaceholder="Search findings..."
                        emptyMessage="No findings found"
                        emptyDescription={
                          findings.length === 0
                            ? 'No security findings match your search criteria'
                            : undefined
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>

      {/* Finding Quick View Drawer */}
      <FindingDetailDrawer
        finding={selectedFinding}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={handleStatusChange}
        onSeverityChange={handleSeverityChange}
        onAssigneeChange={handleAssigneeChange}
        onAddComment={handleAddComment}
      />

      {/* Create Finding Dialog */}
      <CreateFindingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          mutateFindings()
          mutateStats()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Finding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this finding. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {findingToDelete && (
            <div className="rounded-lg border bg-muted/50 p-3 my-2">
              <p className="font-medium truncate">{findingToDelete.title}</p>
              <p className="text-sm text-muted-foreground">
                {findingToDelete.severity.toUpperCase()} severity
                {findingToDelete.scanner && ` · ${findingToDelete.scanner}`}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

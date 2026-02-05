'use client'

import { useState, useMemo, useCallback } from 'react'
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
import {
  AssetDetailSheet,
  StatCard,
  StatsGrid,
  SectionTitle,
  flattenDomainTreeForTable,
  type DomainTableRow,
} from '@/features/assets'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus,
  Globe,
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
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  RefreshCw,
  List,
  Network,
  CornerDownRight,
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

// View mode type
type ViewMode = 'list' | 'tree'

// Filter types
type StatusFilter = Status | 'all'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Empty form state
const emptyDomainForm = {
  name: '',
  description: '',
  groupId: '',
  registrar: '',
  expiryDate: '',
  nameservers: '',
  tags: '',
}

export default function DomainsPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch domains from API
  const {
    assets: domains,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['domain'],
  })

  const [selectedDomain, setSelectedDomain] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set())

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyDomainForm)

  // Tree data - flatten domains into hierarchical rows
  const treeData = useMemo(() => {
    return flattenDomainTreeForTable(domains)
  }, [domains])

  // Toggle root domain expansion
  const toggleRootExpansion = useCallback((rootDomain: string) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev)
      if (next.has(rootDomain)) {
        next.delete(rootDomain)
      } else {
        next.add(rootDomain)
      }
      return next
    })
  }, [])

  // Expand/collapse all
  const expandAll = useCallback(() => {
    const allRoots = treeData.filter((d) => d._isRoot).map((d) => d._rootDomain)
    setExpandedRoots(new Set(allRoots))
  }, [treeData])

  const collapseAll = useCallback(() => {
    setExpandedRoots(new Set())
  }, [])

  // Filter data based on view mode
  const filteredData = useMemo(() => {
    if (viewMode === 'list') {
      // List view - flat list
      let data = [...domains]
      if (statusFilter !== 'all') {
        data = data.filter((d) => d.status === statusFilter)
      }
      return data as (Asset | DomainTableRow)[]
    } else {
      // Tree view - hierarchical list with expansion
      let data = [...treeData]
      if (statusFilter !== 'all') {
        data = data.filter((d) => d.status === statusFilter)
      }
      // Filter out collapsed children
      return data.filter((d) => {
        if (d._isRoot) return true
        return expandedRoots.has(d._rootDomain)
      }) as (Asset | DomainTableRow)[]
    }
  }, [domains, treeData, statusFilter, viewMode, expandedRoots])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: domains.length,
      active: domains.filter((d) => d.status === 'active').length,
      inactive: domains.filter((d) => d.status === 'inactive').length,
      pending: domains.filter((d) => d.status === 'pending').length,
    }),
    [domains]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each domain
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    domains.forEach((domain) => {
      const match = getScopeMatchesForAsset(
        { id: domain.id, type: 'domain', name: domain.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(domain.id, match)
    })
    return map
  }, [domains, scopeTargets, scopeExclusions])

  // Calculate scope coverage for all domains
  const scopeCoverage = useMemo(() => {
    const assets = domains.map((d) => ({
      id: d.id,
      name: d.name,
      type: 'domain',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [domains, scopeTargets, scopeExclusions])

  // Table columns - support both Asset and DomainTableRow
  const columns: ColumnDef<Asset | DomainTableRow>[] = [
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
          Domain
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const domain = row.original
        const treeRow = domain as DomainTableRow
        const isTreeView = viewMode === 'tree' && '_isRoot' in domain
        const isRoot = isTreeView && treeRow._isRoot
        const hasChildren = isTreeView && treeRow._hasChildren
        const level = isTreeView ? treeRow._level : 0
        const isExpanded = isRoot && expandedRoots.has(treeRow._rootDomain)

        return (
          <div className="flex items-center gap-2">
            {/* Tree controls - only in tree view */}
            {isTreeView && (
              <>
                {/* Indentation spacer */}
                {level > 0 && (
                  <div className="flex items-center" style={{ width: `${level * 20}px` }}>
                    <CornerDownRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </div>
                )}
                {/* Expand/collapse button for root domains */}
                {isRoot && hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRootExpansion(treeRow._rootDomain)
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {/* Spacer for alignment when no expand button */}
                {isRoot && !hasChildren && <div className="w-6" />}
              </>
            )}
            {/* Domain icon and info */}
            <Globe className={`h-4 w-4 ${isRoot ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <div>
              <div className="flex items-center gap-2">
                <p
                  className={`font-medium ${!isRoot && isTreeView ? 'text-muted-foreground' : ''}`}
                >
                  {domain.name}
                </p>
                {isRoot && hasChildren && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {treeRow._subdomainCount}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{domain.groupName}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.registrar',
      header: 'Registrar',
      cell: ({ row }) => <span className="text-sm">{row.original.metadata.registrar || '-'}</span>,
    },
    {
      accessorKey: 'metadata.expiryDate',
      header: 'Expiry',
      cell: ({ row }) => {
        const date = row.original.metadata.expiryDate
        if (!date) return <span className="text-muted-foreground">-</span>
        const expiry = new Date(date)
        const now = new Date()
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const isExpiringSoon = daysLeft <= 30
        return (
          <div className="flex items-center gap-1">
            <span className={isExpiringSoon ? 'text-orange-500' : ''}>
              {expiry.toLocaleDateString()}
            </span>
            {isExpiringSoon && <AlertTriangle className="h-3 w-3 text-orange-500" />}
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
        const domain = row.original
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
                  setSelectedDomain(domain)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(domain)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyDomain(domain)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`https://${domain.name}`, '_blank')
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
                    setDomainToDelete(domain)
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
  const handleCopyDomain = (domain: Asset) => {
    navigator.clipboard.writeText(domain.name)
    toast.success('Domain copied to clipboard')
  }

  const handleOpenEdit = (domain: Asset) => {
    setFormData({
      name: domain.name,
      description: domain.description || '',
      groupId: domain.groupId || '',
      registrar: domain.metadata.registrar || '',
      expiryDate: domain.metadata.expiryDate || '',
      nameservers: domain.metadata.nameservers?.join(', ') || '',
      tags: domain.tags?.join(', ') || '',
    })
    setSelectedDomain(domain)
    setEditDialogOpen(true)
  }

  const handleAddDomain = async () => {
    if (!formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'domain',
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
      setFormData(emptyDomainForm)
      setAddDialogOpen(false)
      toast.success('Domain added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add domain'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditDomain = async () => {
    if (!selectedDomain || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedDomain.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyDomainForm)
      setEditDialogOpen(false)
      setSelectedDomain(null)
      toast.success('Domain updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update domain'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(domainToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setDomainToDelete(null)
      toast.success('Domain deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete domain'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedDomainIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedDomainIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedDomainIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedDomainIds.length} domains`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete domains'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Registrar', 'Expiry', 'Status', 'Risk Score', 'Findings'].join(','),
      ...domains.map((d) =>
        [
          d.name,
          d.metadata.registrar || '',
          d.metadata.expiryDate || '',
          d.status,
          d.riskScore,
          d.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'domains.csv'
    a.click()
    toast.success('Domains exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Domain Assets"
          description={`${domains.length} domains in your attack surface`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyDomainForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
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
                <Globe className="h-4 w-4" />
                Total Domains
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
          <Card
            className={`cursor-pointer hover:border-gray-500 transition-colors ${statusFilter === 'inactive' ? 'border-gray-500' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Inactive
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-gray-500">{statusCounts.inactive}</CardTitle>
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
                  {domains.filter((d) => d.findingCount > 0).length}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  All Domains
                </CardTitle>
                <CardDescription>Manage your domain assets</CardDescription>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'tree' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('tree')}
                      >
                        <Network className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tree View (Hierarchy)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {viewMode === 'tree' && (
                  <>
                    <div className="h-4 w-px bg-border mx-1" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={expandAll}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Expand All</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={collapseAll}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Collapse All</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
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
                  placeholder="Search domains..."
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
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected domains...')}>
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
                          setSelectedDomain(row.original)
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
                        No domains found.
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

      {/* Domain Details Sheet */}
      <AssetDetailSheet
        asset={selectedDomain}
        open={!!selectedDomain && !editDialogOpen}
        onOpenChange={() => setSelectedDomain(null)}
        icon={Globe}
        iconColor="text-blue-500"
        gradientFrom="from-blue-500/20"
        gradientVia="via-blue-500/10"
        assetTypeName="Domain"
        relationships={selectedDomain ? getAssetRelationships(selectedDomain.id) : []}
        onEdit={() => selectedDomain && handleOpenEdit(selectedDomain)}
        onDelete={() => {
          if (selectedDomain) {
            setDomainToDelete(selectedDomain)
            setDeleteDialogOpen(true)
            setSelectedDomain(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedDomain && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://${selectedDomain.name}`, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCopyDomain(selectedDomain)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </>
          )
        }
        statsContent={
          selectedDomain && (
            <StatsGrid>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedDomain.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedDomain.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedDomain && (
            <>
              {/* Scope Status Section */}
              {scopeMatchesMap.get(selectedDomain.id) && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Scope Status</SectionTitle>
                  <div className="flex items-center gap-3">
                    <ScopeBadge match={scopeMatchesMap.get(selectedDomain.id)!} showDetails />
                  </div>
                  {scopeMatchesMap.get(selectedDomain.id)!.matchedTargets.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Matching Rules</p>
                      <div className="space-y-1">
                        {scopeMatchesMap.get(selectedDomain.id)!.matchedTargets.map((target) => (
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
                  {scopeMatchesMap.get(selectedDomain.id)!.matchedExclusions.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Exclusions Applied</p>
                      <div className="space-y-1">
                        {scopeMatchesMap
                          .get(selectedDomain.id)!
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

              {/* Domain Information Section */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Domain Information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Registrar</p>
                    <p className="font-medium">{selectedDomain.metadata.registrar || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {selectedDomain.metadata.expiryDate
                        ? new Date(selectedDomain.metadata.expiryDate).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
                {selectedDomain.metadata.nameservers &&
                  selectedDomain.metadata.nameservers.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Nameservers</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedDomain.metadata.nameservers.map((ns) => (
                          <Badge key={ns} variant="outline" className="text-xs">
                            {ns}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </>
          )
        }
      />

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add Domain
            </DialogTitle>
            <DialogDescription>Add a new domain to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Domain Name *</Label>
              <Input
                id="name"
                placeholder="example.com"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrar">Registrar</Label>
                <Input
                  id="registrar"
                  placeholder="GoDaddy, Cloudflare..."
                  value={formData.registrar}
                  onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameservers">Nameservers (comma separated)</Label>
              <Input
                id="nameservers"
                placeholder="ns1.example.com, ns2.example.com"
                value={formData.nameservers}
                onChange={(e) => setFormData({ ...formData, nameservers: e.target.value })}
              />
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
            <Button onClick={handleAddDomain}>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Domain Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Domain
            </DialogTitle>
            <DialogDescription>Update domain information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Domain Name *</Label>
              <Input
                id="edit-name"
                placeholder="example.com"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-registrar">Registrar</Label>
                <Input
                  id="edit-registrar"
                  placeholder="GoDaddy, Cloudflare..."
                  value={formData.registrar}
                  onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiryDate">Expiry Date</Label>
                <Input
                  id="edit-expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nameservers">Nameservers (comma separated)</Label>
              <Input
                id="edit-nameservers"
                placeholder="ns1.example.com, ns2.example.com"
                value={formData.nameservers}
                onChange={(e) => setFormData({ ...formData, nameservers: e.target.value })}
              />
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
            <Button onClick={handleEditDomain}>
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
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{domainToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteDomain}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

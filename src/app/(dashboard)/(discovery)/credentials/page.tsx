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
import {
  AssetDetailSheet,
  StatCard,
  StatsGrid,
  MetadataGrid,
  MetadataRow,
  SectionTitle,
  ClassificationBadges,
  SecretValueField,
} from '@/features/assets'
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
import { toast } from 'sonner'
import {
  Plus,
  KeyRound,
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
  Clock,
  Copy,
  User,
  Calendar,
  X,
  ArrowRight,
  Users,
  List,
  ChevronDown,
  Mail,
} from 'lucide-react'
import { type Asset } from '@/features/assets'
import { AssetGroupSelect } from '@/features/asset-groups'
import type { Status } from '@/features/shared/types'
import {
  useCredentialsApi,
  useCredentialStatsApi,
  useCredentialIdentitiesApi,
  useRelatedCredentialsApi,
  useIdentityExposuresApi,
  mapCredentialsToAssets,
  extractCredentialStats,
  invalidateCredentialsCache,
} from '@/features/credentials'
import { getErrorMessage } from '@/lib/api/error-handler'
import type {
  ApiIdentityExposure,
  ApiCredential,
} from '@/features/credentials/api/credential-api.types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can, Permission } from '@/lib/permissions'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'

// Filter types
type StatusFilter = Status | 'all'
type SourceFilter = 'all' | 'darkweb' | 'github' | 'phishing' | 'breach' | 'internal' | 'other'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Resolved' },
  { value: 'inactive', label: 'Inactive' },
]

const sourceFilters: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'darkweb', label: 'Dark Web' },
  { value: 'github', label: 'GitHub/GitLab' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'breach', label: 'Data Breach' },
  { value: 'internal', label: 'Internal' },
  { value: 'other', label: 'Other' },
]

// Empty form state
const emptyCredentialForm = {
  name: '',
  description: '',
  groupId: '',
  source: '',
  username: '',
  leakDate: '',
  tags: '',
}

// Source categorization helper
const categorizeSource = (source: string): SourceFilter => {
  const s = source.toLowerCase()
  if (s.includes('dark') || s.includes('darkweb')) return 'darkweb'
  if (s.includes('github') || s.includes('gitlab') || s.includes('gist') || s.includes('commit'))
    return 'github'
  if (s.includes('phishing')) return 'phishing'
  if (s.includes('breach') || s.includes('dump') || s.includes('compilation')) return 'breach'
  if (s.includes('internal') || s.includes('confluence') || s.includes('email')) return 'internal'
  return 'other'
}

export default function CredentialsPage() {
  // API hooks
  const [page, _setPage] = useState(1)
  const pageSize = 20

  // Build API filters based on UI filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [globalFilter, setGlobalFilter] = useState('')

  // Map status filter to API state filter
  const apiStateFilter = useMemo(() => {
    const statusToState: Record<StatusFilter, string[]> = {
      all: [],
      active: ['active'],
      pending: ['active'], // Pending maps to active in API
      completed: ['resolved'],
      inactive: ['accepted', 'false_positive'],
      failed: ['active'], // Failed maps to active in API
      archived: ['resolved'], // Archived maps to resolved in API
    }
    return statusToState[statusFilter]
  }, [statusFilter])

  // Fetch credentials from API
  const {
    data: apiResponse,
    isLoading,
    mutate,
  } = useCredentialsApi({
    page,
    page_size: pageSize,
    state: apiStateFilter.length > 0 ? apiStateFilter : undefined,
    search: globalFilter || undefined,
  })

  // Fetch stats from API
  const { data: apiStats, isLoading: statsLoading } = useCredentialStatsApi()

  // Fetch identities (grouped by username/email) for identity view
  const { data: identitiesResponse, isLoading: identitiesLoading } = useCredentialIdentitiesApi({
    page,
    page_size: pageSize,
    state: apiStateFilter.length > 0 ? apiStateFilter : undefined,
    search: globalFilter || undefined,
  })

  // Map API data to Asset type for UI compatibility
  const credentials = useMemo(() => {
    if (!apiResponse?.items) return []
    return mapCredentialsToAssets(apiResponse.items)
  }, [apiResponse])

  // Extract stats
  const stats = useMemo(() => extractCredentialStats(apiStats), [apiStats])

  const [selectedCredential, setSelectedCredential] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'identity'>('list')
  const [expandedIdentities, setExpandedIdentities] = useState<Set<string>>(new Set())

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [credentialToDelete, setCredentialToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyCredentialForm)

  // Filter data (client-side filtering for source since API doesn't support it directly)
  const filteredData = useMemo(() => {
    let data = [...credentials]
    if (sourceFilter !== 'all') {
      data = data.filter((c) => {
        const source = c.metadata.source || ''
        return categorizeSource(source) === sourceFilter
      })
    }
    return data
  }, [credentials, sourceFilter])

  // Status counts from API stats
  const statusCounts = useMemo(
    () => ({
      all: stats.total,
      active: stats.active,
      pending: 0, // API doesn't have pending state
      completed: stats.resolved,
      inactive: stats.accepted + stats.falsePositive,
    }),
    [stats]
  )

  // Risk stats from API stats
  const riskStats = useMemo(
    () => ({
      critical: stats.critical,
      high: stats.high,
      medium: stats.medium,
      low: stats.low,
    }),
    [stats]
  )

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
          Credential
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.description}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.source',
      header: 'Source',
      cell: ({ row }) => {
        const source = row.original.metadata.source || '-'
        const category = categorizeSource(source)
        const categoryColors: Record<SourceFilter, string> = {
          all: '',
          darkweb: 'bg-red-500/10 text-red-600 border-red-500/20',
          github: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          phishing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          breach: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          internal: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          other: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
        }
        return (
          <Badge variant="outline" className={categoryColors[category]}>
            {source}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.username',
      header: 'Username',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-mono">{row.original.metadata.username || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.leakDate',
      header: 'Leak Date',
      cell: ({ row }) => {
        const date = row.original.metadata.leakDate
        if (!date) return <span className="text-muted-foreground">-</span>
        const leakDate = new Date(date)
        const now = new Date()
        const daysAgo = Math.ceil((now.getTime() - leakDate.getTime()) / (1000 * 60 * 60 * 24))
        const isRecent = daysAgo <= 30
        return (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className={isRecent ? 'text-red-500 font-medium' : ''}>
              {leakDate.toLocaleDateString()}
            </span>
            {isRecent && (
              <Badge variant="destructive" className="ml-1 text-xs">
                Recent
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
        const credential = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedCredential(credential)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.CredentialsWrite}>
                <DropdownMenuItem onClick={() => handleOpenEdit(credential)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem onClick={() => handleCopyCredential(credential)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Can permission={Permission.CredentialsWrite}>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setCredentialToDelete(credential)
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
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Handlers
  const handleOpenEdit = (credential: Asset) => {
    setFormData({
      name: credential.name,
      description: credential.description || '',
      groupId: credential.groupId || '',
      source: credential.metadata.source || '',
      username: credential.metadata.username || '',
      leakDate: credential.metadata.leakDate || '',
      tags: credential.tags?.join(', ') || '',
    })
    setSelectedCredential(credential)
    setEditDialogOpen(true)
  }

  const handleAddCredential = () => {
    if (!formData.name || !formData.source) {
      toast.error('Please fill in required fields')
      return
    }

    // TODO: Call import API to add credential
    toast.info('Use the Import feature to add credentials via API or CSV')
    setFormData(emptyCredentialForm)
    setAddDialogOpen(false)
  }

  const handleUpdateCredential = () => {
    if (!selectedCredential || !formData.name || !formData.source) {
      toast.error('Please fill in required fields')
      return
    }

    // TODO: Implement update API endpoint
    toast.info('Update functionality coming soon')
    setFormData(emptyCredentialForm)
    setEditDialogOpen(false)
    setSelectedCredential(null)
  }

  const handleDeleteCredential = () => {
    if (!credentialToDelete) return

    // TODO: Implement delete API endpoint
    toast.info('Delete functionality coming soon')
    setDeleteDialogOpen(false)
    setCredentialToDelete(null)
  }

  const handleCopyCredential = (credential: Asset) => {
    navigator.clipboard.writeText(credential.name)
    toast.success('Credential name copied to clipboard')
  }

  const handleMarkResolved = async (credential: Asset) => {
    try {
      const response = await fetch(`/api/v1/credentials/${credential.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notes: '' }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve credential')
      }

      toast.success('Credential marked as resolved')
      setSelectedCredential(null) // Close sheet after success
      void mutate() // Refresh data after state change
      void invalidateCredentialsCache() // Invalidate all credential caches
    } catch (error) {
      console.error('Error resolving credential:', error)
      toast.error(getErrorMessage(error, 'Failed to resolve credential'))
    }
  }

  return (
    <>
      <Main>
        <div className="flex items-center justify-between">
          <PageHeader
            title="Credential Leaks"
            description={statsLoading ? 'Loading...' : `${stats.total} leaked credentials detected`}
          />
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Credential
          </Button>
        </div>

        {/* Compact Alert - Only show for critical issues */}
        {!alertDismissed && riskStats.critical > 0 && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  {riskStats.critical} critical {riskStats.critical === 1 ? 'leak' : 'leaks'}{' '}
                  require immediate attention
                </span>
                {riskStats.high > 0 && (
                  <span className="text-sm text-red-600/80 dark:text-red-300/80">
                    + {riskStats.high} high severity
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-8"
                onClick={() => setStatusFilter('active')}
              >
                Review Now
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600/60 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={() => setAlertDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className={statusCounts.active > 0 ? 'border-red-200 dark:border-red-900/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Leaks</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p
                      className={`text-2xl font-bold ${statusCounts.active > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                    >
                      {statusCounts.active}
                    </p>
                  )}
                </div>
                <AlertTriangle
                  className={`h-8 w-8 ${statusCounts.active > 0 ? 'text-red-500/30' : 'text-muted-foreground/20'}`}
                />
              </div>
            </CardContent>
          </Card>
          <Card className={riskStats.critical > 0 ? 'border-red-200 dark:border-red-900/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Risk</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p
                      className={`text-2xl font-bold ${riskStats.critical > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                    >
                      {riskStats.critical}
                    </p>
                  )}
                </div>
                <Shield
                  className={`h-8 w-8 ${riskStats.critical > 0 ? 'text-red-500/30' : 'text-muted-foreground/20'}`}
                />
              </div>
            </CardContent>
          </Card>
          <Card className={riskStats.high > 0 ? 'border-yellow-200 dark:border-yellow-900/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p
                      className={`text-2xl font-bold ${riskStats.high > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}
                    >
                      {riskStats.high}
                    </p>
                  )}
                </div>
                <Clock
                  className={`h-8 w-8 ${riskStats.high > 0 ? 'text-yellow-500/30' : 'text-muted-foreground/20'}`}
                />
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              statusCounts.completed > 0 ? 'border-green-200 dark:border-green-900/50' : ''
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p
                      className={`text-2xl font-bold ${statusCounts.completed > 0 ? 'text-green-600' : 'text-muted-foreground'}`}
                    >
                      {statusCounts.completed}
                    </p>
                  )}
                </div>
                <CheckCircle
                  className={`h-8 w-8 ${statusCounts.completed > 0 ? 'text-green-500/30' : 'text-muted-foreground/20'}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Credential Leaks
                </CardTitle>
                <CardDescription>
                  {viewMode === 'list'
                    ? `${filteredData.length} of ${credentials.length} credentials`
                    : `${identitiesResponse?.items?.length || 0} identities with exposures`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'identity')}>
                  <TabsList>
                    <TabsTrigger value="list" className="gap-1.5">
                      <List className="h-4 w-4" />
                      List
                    </TabsTrigger>
                    <TabsTrigger value="identity" className="gap-1.5">
                      <Users className="h-4 w-4" />
                      By Identity
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search credentials..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label} ({statusCounts[f.value as keyof typeof statusCounts] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sourceFilter}
                onValueChange={(v) => setSourceFilter(v as SourceFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFilters.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Content */}
            {viewMode === 'identity' ? (
              /* Identity View */
              <div className="space-y-3">
                {identitiesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  ))
                ) : identitiesResponse?.items?.length ? (
                  identitiesResponse.items.map((identity) => (
                    <IdentityCard
                      key={identity.identity}
                      identity={identity}
                      isExpanded={expandedIdentities.has(identity.identity)}
                      onToggle={() => {
                        setExpandedIdentities((prev) => {
                          const next = new Set(prev)
                          if (next.has(identity.identity)) {
                            next.delete(identity.identity)
                          } else {
                            next.add(identity.identity)
                          }
                          return next
                        })
                      }}
                      onSelectCredential={(cred) => {
                        const asset = mapCredentialsToAssets([cred])[0]
                        setSelectedCredential(asset)
                      }}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No identities found
                  </div>
                )}
              </div>
            ) : (
              /* List View - Table */
              <>
                <div className="rounded-md border">
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
                        // Loading skeleton rows
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-4" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-8 w-48" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-12" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-8 w-8" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer"
                            onClick={() => setSelectedCredential(row.original)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                onClick={(e) => {
                                  if (cell.column.id === 'select' || cell.column.id === 'actions') {
                                    e.stopPropagation()
                                  }
                                }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            No credential leaks found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination - only for list view */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                  </div>
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
              </>
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Detail Sheet */}
      <AssetDetailSheet
        asset={selectedCredential}
        open={!!selectedCredential && !editDialogOpen}
        onOpenChange={(open) => !open && setSelectedCredential(null)}
        icon={KeyRound}
        iconColor="text-red-500"
        gradientFrom="from-red-500/20"
        onEdit={() => selectedCredential && handleOpenEdit(selectedCredential)}
        onDelete={() => {
          if (selectedCredential) {
            setCredentialToDelete(selectedCredential)
            setDeleteDialogOpen(true)
          }
        }}
        assetTypeName="Credential"
        showFindingsTab={false}
        extraTabs={
          selectedCredential
            ? [
                {
                  value: 'related',
                  label: 'Related',
                  content: (
                    <RelatedExposuresSection
                      credentialId={selectedCredential.id}
                      onSelectCredential={(cred) => {
                        const asset = mapCredentialsToAssets([cred])[0]
                        setSelectedCredential(asset)
                      }}
                    />
                  ),
                },
              ]
            : undefined
        }
        quickActions={
          selectedCredential?.status === 'active' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleMarkResolved(selectedCredential)
                // Sheet will be closed by handleMarkResolved after success
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Resolved
            </Button>
          ) : null
        }
        statsContent={
          selectedCredential && (
            <StatsGrid columns={3}>
              <StatCard
                icon={AlertTriangle}
                iconBg={
                  selectedCredential.riskScore >= 80
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : selectedCredential.riskScore >= 50
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                }
                iconColor={
                  selectedCredential.riskScore >= 80
                    ? 'text-red-600'
                    : selectedCredential.riskScore >= 50
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }
                label="Risk Score"
                value={selectedCredential.riskScore}
              />
              <StatCard
                icon={Shield}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600"
                label="Severity"
                value={selectedCredential.criticality === 'critical' ? 'Critical' : 'High'}
              />
              <StatCard
                icon={Clock}
                iconBg="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-600"
                label="Days Since Leak"
                value={
                  selectedCredential.metadata.leakDate
                    ? Math.ceil(
                        (new Date().getTime() -
                          new Date(selectedCredential.metadata.leakDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : '-'
                }
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedCredential && (
            <>
              {/* Secret Value Section */}
              <SecretValueField
                value={selectedCredential.metadata.secretValue}
                label="Leaked Secret"
                showWarning={selectedCredential.status === 'active'}
              />

              <SectionTitle>Leak Details</SectionTitle>
              <MetadataGrid>
                <MetadataRow label="Source" value={selectedCredential.metadata.source} />
                <MetadataRow label="Username" value={selectedCredential.metadata.username} />
                <MetadataRow
                  label="Credential Type"
                  value={selectedCredential.metadata.credentialType || 'password'}
                />
                <MetadataRow
                  label="Leak Date"
                  value={
                    selectedCredential.metadata.leakDate
                      ? new Date(selectedCredential.metadata.leakDate).toLocaleDateString()
                      : '-'
                  }
                />
                <MetadataRow label="Group" value={selectedCredential.groupName || 'Ungrouped'} />
              </MetadataGrid>
            </>
          )
        }
      />

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Credential Leak</DialogTitle>
            <DialogDescription>Add a new credential leak to track</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Credential Name *</Label>
              <Input
                id="name"
                placeholder="e.g., admin@company.com"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the credential leak..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Input
                id="source"
                placeholder="e.g., Data breach - DarkWeb"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Username or identifier"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leakDate">Leak Date</Label>
              <Input
                id="leakDate"
                type="date"
                value={formData.leakDate}
                onChange={(e) => setFormData({ ...formData, leakDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(v) => setFormData({ ...formData, groupId: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="critical, credential-leak, etc."
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCredential}>Add Credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
            <DialogDescription>Update credential leak details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Credential Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-source">Source *</Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-leakDate">Leak Date</Label>
              <Input
                id="edit-leakDate"
                type="date"
                value={formData.leakDate}
                onChange={(e) => setFormData({ ...formData, leakDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group">Group</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(v) => setFormData({ ...formData, groupId: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCredential}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{credentialToDelete?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCredential}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================
// IDENTITY CARD COMPONENT
// ============================================

interface IdentityCardProps {
  identity: ApiIdentityExposure
  isExpanded: boolean
  onToggle: () => void
  onSelectCredential: (cred: ApiCredential) => void
}

// ============================================
// RELATED EXPOSURES SECTION COMPONENT
// ============================================

interface RelatedExposuresSectionProps {
  credentialId: string
  onSelectCredential: (cred: ApiCredential) => void
}

function RelatedExposuresSection({
  credentialId,
  onSelectCredential,
}: RelatedExposuresSectionProps) {
  const { data: relatedCredentials, isLoading } = useRelatedCredentialsApi(credentialId)

  if (isLoading) {
    return (
      <div className="mt-6">
        <SectionTitle>Related Exposures</SectionTitle>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (!relatedCredentials || relatedCredentials.length === 0) {
    return null // Don't show section if no related exposures
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    info: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  }

  return (
    <div className="mt-6">
      <SectionTitle>Related Exposures ({relatedCredentials.length})</SectionTitle>
      <p className="text-sm text-muted-foreground mb-3">
        Other credentials leaked for the same identity
      </p>
      <div className="space-y-2">
        {relatedCredentials.map((cred) => (
          <button
            key={cred.id}
            className="w-full text-left rounded-md border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
            onClick={() => onSelectCredential(cred)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">{cred.identifier}</span>
                <Badge variant="outline" className="text-xs">
                  {cred.credential_type}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {cred.source}
                </Badge>
                <Badge className={severityColors[cred.severity] || severityColors.info}>
                  {cred.severity}
                </Badge>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function IdentityCard({ identity, isExpanded, onToggle, onSelectCredential }: IdentityCardProps) {
  // Fetch exposures only when card is expanded
  const { data: exposuresResponse, isLoading: exposuresLoading } = useIdentityExposuresApi(
    isExpanded ? identity.identity : null,
    { page_size: 50 }
  )

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    info: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  }

  const activeCount = identity.states?.active || 0
  const resolvedCount = identity.states?.resolved || 0

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={`rounded-lg border ${activeCount > 0 ? 'border-red-200 dark:border-red-900/50' : ''}`}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {identity.identity_type === 'email' ? (
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{identity.identity}</span>
                    <Badge variant="secondary" className="text-xs">
                      {identity.exposure_count}{' '}
                      {identity.exposure_count === 1 ? 'exposure' : 'exposures'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>Sources: {identity.sources.join(', ')}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>Types: {identity.credential_types.join(', ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {activeCount} active
                    </Badge>
                  )}
                  {resolvedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {resolvedCount} resolved
                    </Badge>
                  )}
                </div>
                <Badge className={severityColors[identity.highest_severity] || severityColors.info}>
                  {identity.highest_severity}
                </Badge>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Exposures for this identity
            </div>
            <div className="space-y-2">
              {exposuresLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : exposuresResponse?.items && exposuresResponse.items.length > 0 ? (
                exposuresResponse.items.map((exposure) => (
                  <button
                    key={exposure.id}
                    className="w-full text-left rounded-md border bg-background p-3 hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectCredential(exposure)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-sm">{exposure.identifier}</span>
                        <Badge variant="outline" className="text-xs">
                          {exposure.credential_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {exposure.source}
                        </Badge>
                        <Badge className={severityColors[exposure.severity] || severityColors.info}>
                          {exposure.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      First seen: {new Date(exposure.first_seen_at).toLocaleDateString()}
                      {exposure.last_seen_at !== exposure.first_seen_at && (
                        <> | Last seen: {new Date(exposure.last_seen_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No exposures found for this identity
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

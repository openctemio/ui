'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { csrfFetch } from '@/lib/api/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StatusBadge,
  RiskScoreBadge,
  SeverityBadge,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  MetricStrip,
  type MetricStripItem,
} from '@/features/shared'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  Eye,
  Pencil,
  Trash2,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  User,
  Calendar,
  X,
  Users,
  List,
  ChevronDown,
  Mail,
} from 'lucide-react'
import { type Asset } from '@/features/assets'
import { AssetGroupSelect } from '@/features/asset-groups'
import type { Severity, Status } from '@/features/shared/types'
import {
  useCredentialsApi,
  useCredentialIdentitiesApi,
  useRelatedCredentialsApi,
  useIdentityExposuresApi,
  mapCredentialsToAssets,
  invalidateCredentialsCache,
} from '@/features/credentials'
import { getErrorMessage } from '@/lib/api/error-handler'
import type {
  ApiIdentityExposure,
  ApiCredential,
} from '@/features/credentials/api/credential-api.types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copyToClipboard } from '@/lib/clipboard'
import { exportToCsv } from '@/hooks/use-csv-export'
import { useUrlFilter } from '@/hooks/use-url-param'
import { useDebounce } from '@/hooks/use-debounce'
import { Permission } from '@/lib/permissions'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Filter types
type StatusFilter = Status | 'all'
type SourceFilter = 'all' | 'darkweb' | 'github' | 'phishing' | 'breach' | 'internal' | 'other'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Resolved' },
  { value: 'inactive', label: 'Inactive' },
]

const sourceFilters: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'darkweb', label: 'Dark web' },
  { value: 'github', label: 'GitHub/GitLab' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'breach', label: 'Data breach' },
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
  // Build API filters based on UI filters. Filters live in the URL so a filtered
  // view is shareable and survives reload (matching the findings/assets pages).
  // The hook returns a plain string; cast the tuple so downstream typing stays
  // identical to the old useState.
  const [statusFilter, setStatusFilter] = useUrlFilter('status', 'all') as [
    StatusFilter,
    (v: StatusFilter) => void,
  ]
  const [sourceFilter, setSourceFilter] = useUrlFilter('source', 'all') as [
    SourceFilter,
    (v: SourceFilter) => void,
  ]
  // Search is server-side (the list and identity endpoints both take it), so it
  // lives in the URL like the other filters and is debounced per keystroke.
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const debouncedSearch = useDebounce(searchQuery, 300)
  // List / By identity are two views of the same leaks: tabs, active one in the URL.
  const [viewParam, setViewParam] = useUrlFilter('tab', 'list')
  const viewMode: 'list' | 'identity' = viewParam === 'identity' ? 'identity' : 'list'

  // Map status filter to API state filter
  const apiStateFilter = useMemo(() => {
    const statusToState: Record<StatusFilter, string[]> = {
      all: [],
      active: ['active'],
      // Stale is an asset-only state; credentials do not use it but
      // the shared Status union carries it so credential filters
      // must still map. Treat it as "active" for API purposes since
      // that's the closest equivalent.
      stale: ['active'],
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
    // The table paginates client-side (DataTablePagination), so fetch a full
    // working set rather than a frozen 20-row page — the server `page` state
    // was never advanced, making rows 21+ permanently unreachable.
    page: 1,
    page_size: 500,
    state: apiStateFilter.length > 0 ? apiStateFilter : undefined,
    search: debouncedSearch || undefined,
  })

  // Fetch the full credential set (all states, unfiltered) to derive the KPI
  // stat cards and the status-filter counts. These MUST be derived from the
  // same credentials list that feeds the table — a separate /stats aggregate
  // endpoint can drift out of sync with the list, showing phantom counts (e.g.
  // "3 active leaks") while the table itself renders zero rows. Deriving the
  // counts here from the list endpoint (the source of truth) guarantees the
  // cards and the table can never contradict each other.
  const { data: allCredentialsResponse, isLoading: statsLoading } = useCredentialsApi({
    page: 1,
    page_size: 1000,
  })

  // Fetch identities (grouped by username/email) for identity view
  const { data: identitiesResponse, isLoading: identitiesLoading } = useCredentialIdentitiesApi({
    // Client-side paginated like the credentials table above — fetch the full
    // working set so identities beyond the first page stay reachable.
    page: 1,
    page_size: 500,
    state: apiStateFilter.length > 0 ? apiStateFilter : undefined,
    search: debouncedSearch || undefined,
  })

  // Map API data to Asset type for UI compatibility
  const credentials = useMemo(() => {
    if (!apiResponse?.items) return []
    return mapCredentialsToAssets(apiResponse.items)
  }, [apiResponse])

  // Derive stats from the full credentials list (source of truth) so the KPI
  // cards always agree with the table below.
  const stats = useMemo(() => {
    const items = allCredentialsResponse?.items ?? []
    const derived = {
      total: allCredentialsResponse?.total ?? items.length,
      active: 0,
      resolved: 0,
      accepted: 0,
      falsePositive: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    for (const c of items) {
      if (c.state === 'active') derived.active += 1
      else if (c.state === 'resolved') derived.resolved += 1
      else if (c.state === 'accepted') derived.accepted += 1
      else if (c.state === 'false_positive') derived.falsePositive += 1

      if (c.severity === 'critical') derived.critical += 1
      else if (c.severity === 'high') derived.high += 1
      else if (c.severity === 'medium') derived.medium += 1
      else if (c.severity === 'low') derived.low += 1
    }
    return derived
  }, [allCredentialsResponse])

  const [selectedCredential, setSelectedCredential] = useState<Asset | null>(null)
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

  // Headline numbers. The status metrics double as quick filters; the severity
  // ones have no matching list filter, so they are read-only.
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Total leaks',
      value: statusCounts.all,
      onClick: () => setStatusFilter('all'),
      active: statusFilter === 'all',
    },
    {
      key: 'active',
      label: 'Active',
      value: statusCounts.active,
      tone: 'danger',
      onClick: () => setStatusFilter(statusFilter === 'active' ? 'all' : 'active'),
      active: statusFilter === 'active',
    },
    { key: 'critical', label: 'Critical', value: stats.critical, tone: 'danger' },
    { key: 'high', label: 'High', value: stats.high },
    {
      key: 'resolved',
      label: 'Resolved',
      value: statusCounts.completed,
      onClick: () => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed'),
      active: statusFilter === 'completed',
    },
  ]

  // Table columns. No selection column: the page has no bulk actions, and a
  // checkbox that selects rows nothing can act on is a dead control.
  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credential" />,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => <Badge variant="outline">{row.original.metadata.source || '-'}</Badge>,
    },
    {
      accessorKey: 'metadata.username',
      header: 'Username',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">{row.original.metadata.username || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.leakDate',
      header: 'Leak date',
      enableSorting: false,
      cell: ({ row }) => {
        const date = row.original.metadata.leakDate
        if (!date) return <span className="text-muted-foreground">-</span>
        const leakDate = new Date(date)
        const daysAgo = Math.ceil((Date.now() - leakDate.getTime()) / (1000 * 60 * 60 * 24))
        const isRecent = daysAgo <= 30
        return (
          <div className="flex items-center gap-1 tabular-nums">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className={cn(isRecent && 'font-medium text-destructive')}>
              {leakDate.toLocaleDateString()}
            </span>
            {isRecent && (
              <Badge variant="destructive" className="ms-1 text-xs">
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
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'classification',
      header: 'Classification',
      enableSorting: false,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => {
        const credential = row.original
        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View details',
                icon: Eye,
                onClick: () => setSelectedCredential(credential),
              },
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => handleOpenEdit(credential),
                permission: Permission.CredentialsWrite,
              },
              {
                label: 'Copy name',
                icon: Copy,
                onClick: () => handleCopyCredential(credential),
              },
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => {
                  setCredentialToDelete(credential)
                  setDeleteDialogOpen(true)
                },
                destructive: true,
                separatorBefore: true,
                permission: Permission.CredentialsWrite,
              },
            ]}
          />
        )
      },
    },
  ]

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

    // Phase 2: Wire to credentials API when backend endpoints are implemented.
    toast.info('Use the Import feature to add credentials via API or CSV')
    setFormData(emptyCredentialForm)
    setAddDialogOpen(false)
  }

  // NOTE: edit + delete of discovered credentials are intentionally deferred —
  // the Edit "Save changes" and Delete confirm buttons are disabled ("Coming
  // soon") until dedicated credentials endpoints exist. The credential
  // lifecycle today is resolve / accept / mark-false-positive (see the
  // credentials API), not free-form edit or hard delete. The dead update/delete
  // handlers were removed to avoid a future dev wiring a button to a no-op.

  const handleCopyCredential = (credential: Asset) => {
    copyToClipboard(credential.name)
    toast.success('Credential name copied to clipboard')
  }

  const handleExport = () => {
    exportToCsv(
      filteredData,
      [
        { header: 'Credential', accessor: (c) => c.name },
        { header: 'Description', accessor: (c) => c.description ?? '' },
        { header: 'Source', accessor: (c) => c.metadata.source ?? '' },
        { header: 'Username', accessor: (c) => c.metadata.username ?? '' },
        { header: 'Leak Date', accessor: (c) => c.metadata.leakDate ?? '' },
        { header: 'Status', accessor: (c) => c.status },
        { header: 'Scope', accessor: (c) => c.scope ?? '' },
        { header: 'Exposure', accessor: (c) => c.exposure ?? '' },
        { header: 'Risk Score', accessor: (c) => c.riskScore },
      ],
      'credential-leaks'
    )
  }

  const handleMarkResolved = async (credential: Asset) => {
    try {
      const response = await csrfFetch(`/api/v1/credentials/${credential.id}/resolve`, {
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

  // Search + status apply to both views (both endpoints take them); the source
  // category is derived from the list rows, so it only filters the list.
  const searchInput = (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <SearchIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search credentials..."
        aria-label="Search credentials"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="ps-9 pe-9"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute end-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          onClick={() => setSearchQuery('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
  const statusSelect = (
    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
      <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by status">
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
  )
  const sourceSelect = (
    <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
      <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by source">
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
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Credential leaks"
          description="Leaked passwords, keys and tokens tied to your organisation, from breaches, code and the dark web."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!filteredData.length}
          >
            <Download className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">Add credential</span>
          </Button>
        </PageHeader>

        <Tabs value={viewMode} onValueChange={(v) => setViewParam(v)} className="mt-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="identity" className="gap-1.5">
              <Users className="h-4 w-4" />
              By identity
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <MetricStrip className="mt-5" loading={statsLoading} items={metrics} />

        <div className="mt-5">
          {viewMode === 'identity' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {searchInput}
                {statusSelect}
              </div>
              {identitiesLoading ? (
                <div className="divide-y rounded-md border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : identitiesResponse?.items?.length ? (
                <div className="divide-y rounded-md border">
                  {identitiesResponse.items.map((identity) => {
                    // The contract declares `identity` optional; it is the row
                    // key and the expansion-set member, so fall back rather
                    // than keying on undefined.
                    const identityKey = identity.identity ?? ''
                    return (
                      <IdentityRow
                        key={identityKey}
                        identity={identity}
                        isExpanded={expandedIdentities.has(identityKey)}
                        onToggle={() => {
                          setExpandedIdentities((prev) => {
                            const next = new Set(prev)
                            if (next.has(identityKey)) {
                              next.delete(identityKey)
                            } else {
                              next.add(identityKey)
                            }
                            return next
                          })
                        }}
                        onSelectCredential={(cred) => {
                          const asset = mapCredentialsToAssets([cred])[0]
                          setSelectedCredential(asset)
                        }}
                      />
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No identities found"
                  description={
                    searchQuery || statusFilter !== 'all'
                      ? 'Try removing a filter or clearing the search.'
                      : 'Identities appear here once leaked credentials are imported.'
                  }
                />
              )}
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-72" />
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-9 w-36" />
              </div>
              <div className="space-y-2 rounded-md border p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredData}
              showSearch={false}
              toolbarStart={
                <>
                  {searchInput}
                  {statusSelect}
                  {sourceSelect}
                </>
              }
              getRowId={(c) => c.id}
              onRowClick={(c) => setSelectedCredential(c)}
              emptyMessage="No credential leaks found"
              emptyDescription={
                searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Try removing a filter or clearing the search.'
                  : 'Leaked credentials appear here once imported or discovered.'
              }
            />
          )}
        </div>
      </Main>

      {/* Detail Sheet */}
      <AssetDetailSheet
        asset={selectedCredential}
        open={!!selectedCredential && !editDialogOpen}
        onOpenChange={(open) => !open && setSelectedCredential(null)}
        icon={KeyRound}
        iconColor="text-destructive"
        gradientFrom="from-destructive/20"
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
              <CheckCircle className="me-2 h-4 w-4" />
              Mark resolved
            </Button>
          ) : null
        }
        statsContent={
          selectedCredential && (
            <StatsGrid columns={3}>
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-muted"
                iconColor={
                  selectedCredential.riskScore >= 80 ? 'text-destructive' : 'text-muted-foreground'
                }
                label="Risk score"
                value={selectedCredential.riskScore}
              />
              <StatCard
                icon={Shield}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                label="Severity"
                value={selectedCredential.criticality === 'critical' ? 'Critical' : 'High'}
              />
              <StatCard
                icon={Clock}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                label="Days since leak"
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

              <SectionTitle>Leak details</SectionTitle>
              <MetadataGrid>
                <MetadataRow label="Source" value={selectedCredential.metadata.source} />
                <MetadataRow label="Username" value={selectedCredential.metadata.username} />
                <MetadataRow
                  label="Credential type"
                  value={selectedCredential.metadata.credentialType || 'password'}
                />
                <MetadataRow
                  label="Leak date"
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add credential leak</DialogTitle>
            <DialogDescription>Add a new credential leak to track</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Credential name *</Label>
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
              <Label htmlFor="leakDate">Leak date</Label>
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
            <Button onClick={handleAddCredential}>Add credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit credential</DialogTitle>
            <DialogDescription>Update credential leak details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Credential name *</Label>
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
              <Label htmlFor="edit-leakDate">Leak date</Label>
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
            <Button disabled title="Coming soon">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog — confirm stays disabled until a credentials delete endpoint exists. */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete credential?"
        desc={`Are you sure you want to delete "${credentialToDelete?.name ?? ''}"? This action cannot be undone. Deleting credentials is not available yet.`}
        confirmText="Delete"
        destructive
        disabled
        handleConfirm={() => undefined}
      />
    </>
  )
}

// ============================================
// IDENTITY ROW COMPONENT
// ============================================

interface IdentityRowProps {
  identity: ApiIdentityExposure
  isExpanded: boolean
  onToggle: () => void
  onSelectCredential: (cred: ApiCredential) => void
}

/** API severities are free strings; the shared badge falls back for unknown ones. */
function asSeverity(value: string | undefined): Severity {
  return (value ?? 'none') as Severity
}

/** One leaked credential as a clickable line (identity exposures, related exposures). */
function CredentialLine({
  cred,
  onSelect,
  children,
}: {
  cred: ApiCredential
  onSelect: (cred: ApiCredential) => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className="w-full px-3 py-2.5 text-start transition-colors hover:bg-muted/50"
      onClick={() => onSelect(cred)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{cred.identifier}</span>
          <Badge variant="outline" className="text-xs">
            {cred.credential_type}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {cred.source}
          </Badge>
          <SeverityBadge severity={asSeverity(cred.severity)} />
        </div>
      </div>
      {children}
    </button>
  )
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
        <SectionTitle>Related exposures</SectionTitle>
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

  return (
    <div className="mt-6">
      <SectionTitle>Related exposures ({relatedCredentials.length})</SectionTitle>
      <p className="mb-3 text-sm text-muted-foreground">
        Other credentials leaked for the same identity
      </p>
      <div className="divide-y rounded-md border">
        {relatedCredentials.map((cred) => (
          <CredentialLine key={cred.id} cred={cred} onSelect={onSelectCredential} />
        ))}
      </div>
    </div>
  )
}

function IdentityRow({ identity, isExpanded, onToggle, onSelectCredential }: IdentityRowProps) {
  // Fetch exposures only when the row is expanded
  const { data: exposuresResponse, isLoading: exposuresLoading } = useIdentityExposuresApi(
    isExpanded ? (identity.identity ?? null) : null,
    { page_size: 50 }
  )

  const activeCount = identity.states?.active || 0
  const resolvedCount = identity.states?.resolved || 0

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full px-4 py-3 text-start transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {identity.identity_type === 'email' ? (
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{identity.identity}</span>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {identity.exposure_count}{' '}
                    {identity.exposure_count === 1 ? 'exposure' : 'exposures'}
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-sm text-muted-foreground">
                  Sources: {(identity.sources ?? []).join(', ')} · Types:{' '}
                  {(identity.credential_types ?? []).join(', ')}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {activeCount > 0 && (
                <Badge variant="destructive" className="text-xs tabular-nums">
                  {activeCount} active
                </Badge>
              )}
              {resolvedCount > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {resolvedCount} resolved
                </Badge>
              )}
              <SeverityBadge severity={asSeverity(identity.highest_severity)} />
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Exposures for this identity
          </div>
          {exposuresLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : exposuresResponse?.items && exposuresResponse.items.length > 0 ? (
            <div className="divide-y rounded-md border bg-background">
              {exposuresResponse.items.map((exposure) => (
                <CredentialLine key={exposure.id} cred={exposure} onSelect={onSelectCredential}>
                  <div className="mt-1 text-xs text-muted-foreground">
                    First seen:{' '}
                    {exposure.first_seen_at
                      ? new Date(exposure.first_seen_at).toLocaleDateString()
                      : '—'}
                    {exposure.last_seen_at && exposure.last_seen_at !== exposure.first_seen_at && (
                      <> · Last seen: {new Date(exposure.last_seen_at).toLocaleDateString()}</>
                    )}
                  </div>
                </CredentialLine>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No exposures found for this identity
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

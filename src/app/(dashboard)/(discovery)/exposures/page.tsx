'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Main } from '@/components/layout'
import { DataTable, EmptyState, MetricStrip, PageHeader, SeverityBadge } from '@/features/shared'
import type { MetricStripItem } from '@/features/shared'
import { useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import { useDebounce } from '@/hooks/use-debounce'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import {
  Search,
  RefreshCw,
  Download,
  Shield,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  X,
  Clock,
  Activity,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Database,
  Key,
  Globe,
  User,
  Server,
  ChevronDown,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelative } from '@/lib/format-date'
import { useTenant } from '@/context/tenant-provider'
import { exportToCsv, type ExportFieldConfig } from '@/hooks/use-csv-export'
import { fetchAllPages } from '@/lib/api/fetch-all-pages'
import { exposureEndpoints } from '@/lib/api/endpoints'

import {
  useExposures,
  useExposureStats,
  useExposureHistory,
  resolveExposure,
  acceptExposure,
  markExposureFalsePositive,
} from '@/features/exposures/hooks'
import {
  EXPOSURE_STATE_BADGE,
  ExposureSeverityBreakdown,
  ExposureStateBreakdown,
  getExposureColumns,
  ExposureActionDialog,
  ExposureBulkActions,
  ExposureSecurityContext,
} from '@/features/exposures/components'
import type {
  ExposureEvent,
  ExposureListFilters,
  ExposureSeverity,
  ExposureState,
} from '@/lib/api/exposure-types'

type ActionType = 'resolve' | 'accept' | 'false_positive' | 'reactivate'

// Lifecycle view — the primary filter.
type StateTab = 'needs_attention' | 'resolved' | 'all'

const STATE_VIEWS: { value: StateTab; label: string }[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'resolved', label: 'Closed' },
  { value: 'all', label: 'All states' },
]

const SEVERITIES: ExposureSeverity[] = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_LABELS: Record<ExposureSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

const PAGE_SIZES = [10, 20, 50, 100]

// CSV columns for the Export action — every exposure matching the filters.
const EXPOSURE_EXPORT_FIELDS: ExportFieldConfig<ExposureEvent>[] = [
  { header: 'ID', accessor: (e) => e.id },
  { header: 'Title', accessor: (e) => e.title },
  { header: 'Event Type', accessor: (e) => e.event_type.replace(/_/g, ' ') },
  { header: 'Severity', accessor: (e) => e.severity },
  { header: 'State', accessor: (e) => e.state },
  { header: 'Source', accessor: (e) => e.source },
  { header: 'First Seen', accessor: (e) => e.first_seen_at },
  { header: 'Last Seen', accessor: (e) => e.last_seen_at },
  { header: 'Resolved At', accessor: (e) => e.resolved_at ?? '' },
]

// Map the lifecycle view to API state filters.
function getStatesForTab(tab: StateTab): ExposureState[] | undefined {
  switch (tab) {
    case 'needs_attention':
      return ['active']
    case 'resolved':
      return ['resolved', 'accepted', 'false_positive']
    default:
      return undefined // No filter = all states
  }
}

function ExposureTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="ms-auto h-9 w-24" />
      </div>
      <div className="space-y-2 rounded-md border p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function ExposuresPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null

  // The whole view lives in the URL — tab, lifecycle view, severity, search,
  // page and page size — so a filtered view is shareable and survives reload.
  const [tabParam, setTabParam] = useUrlFilter('tab', 'list')
  const tab = tabParam === 'analytics' ? 'analytics' : 'list'
  const [stateParam, setStateParam] = useUrlFilter('state', 'needs_attention')
  const activeView: StateTab = STATE_VIEWS.some((v) => v.value === stateParam)
    ? (stateParam as StateTab)
    : 'needs_attention'
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [severityParam, setSeverityParam] = useUrlFilterList('severity')
  const selectedSeverities = useMemo(
    () =>
      severityParam.filter((s): s is ExposureSeverity =>
        SEVERITIES.includes(s as ExposureSeverity)
      ),
    [severityParam]
  )
  const [pageParam, setPageParam] = useUrlFilter('page', '1')
  const [perPageParam, setPerPageParam] = useUrlFilter('per_page', '20')
  const pagination = useMemo(
    () => ({
      pageIndex: Math.max(0, (parseInt(pageParam, 10) || 1) - 1),
      pageSize: PAGE_SIZES.includes(parseInt(perPageParam, 10)) ? parseInt(perPageParam, 10) : 20,
    }),
    [pageParam, perPageParam]
  )
  const setPagination = useCallback(
    (next: { pageIndex: number; pageSize: number }) => {
      setPageParam(String(next.pageIndex + 1))
      setPerPageParam(String(next.pageSize))
    },
    [setPageParam, setPerPageParam]
  )
  const resetPage = useCallback(() => setPageParam('1'), [setPageParam])

  // Selection is owned by the DataTable; we mirror it for the bulk-action bar
  // and bump the epoch to clear the table's own checkboxes.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectionEpoch((e) => e + 1)
  }, [])

  // Action dialog state
  const [selectedExposure, setSelectedExposure] = useState<ExposureEvent | null>(null)
  const [actionType, setActionType] = useState<ActionType | null>(null)

  // Detail sheet state
  const [detailExposure, setDetailExposure] = useState<ExposureEvent | null>(null)

  const apiFilters: ExposureListFilters = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      search: debouncedSearch || undefined,
      severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      states: getStatesForTab(activeView),
    }),
    [pagination, debouncedSearch, selectedSeverities, activeView]
  )

  const {
    exposures,
    total,
    isLoading: exposuresLoading,
    error: exposuresError,
    mutate: refreshExposures,
  } = useExposures(tenantId, apiFilters)

  const { stats, isLoading: statsLoading, mutate: refreshStats } = useExposureStats(tenantId)

  const isLoading = exposuresLoading || statsLoading

  // Export EVERY exposure matching the current filters (all pages), not just
  // the page rendered in the table.
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const all = await fetchAllPages<ExposureEvent>(
        (p, per_page) => exposureEndpoints.list({ ...apiFilters, page: p, per_page }),
        {
          onTruncated: (loaded) =>
            toast.warning(
              `Export limited to the first ${loaded.toLocaleString()} exposures — refine filters to export the rest`
            ),
        }
      )
      exportToCsv(all, EXPOSURE_EXPORT_FIELDS, 'exposures')
    } catch {
      toast.error('Failed to export exposures')
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, apiFilters])

  const handleRefresh = useCallback(() => {
    refreshExposures()
    refreshStats()
  }, [refreshExposures, refreshStats])

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      resetPage()
    },
    [setSearchQuery, resetPage]
  )

  const toggleSeverity = useCallback(
    (severity: ExposureSeverity) => {
      setSeverityParam((prev) =>
        prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
      )
      resetPage()
    },
    [setSeverityParam, resetPage]
  )

  const setView = useCallback(
    (view: StateTab) => {
      setStateParam(view)
      resetPage()
      clearSelection()
    },
    [setStateParam, resetPage, clearSelection]
  )

  const handleAction = useCallback((exposure: ExposureEvent, action: ActionType) => {
    setSelectedExposure(exposure)
    setActionType(action)
  }, [])

  const handleActionSuccess = useCallback(() => {
    handleRefresh()
    clearSelection()
    // Close detail sheet after successful action
    setDetailExposure(null)
  }, [handleRefresh, clearSelection])

  // Bulk handlers apply the per-exposure state-change API to every selected id.
  // ExposureBulkActions surfaces the success/error toast and clears selection;
  // we only refresh on completion. Throwing propagates to its catch so a
  // partial/total failure shows the error toast instead of a false success.
  const handleBulkResolve = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => resolveExposure(id)))
      handleRefresh()
    },
    [handleRefresh]
  )

  const handleBulkAccept = useCallback(
    async (ids: string[], reason: string) => {
      await Promise.all(ids.map((id) => acceptExposure(id, { reason })))
      handleRefresh()
    },
    [handleRefresh]
  )

  const handleBulkFalsePositive = useCallback(
    async (ids: string[], reason: string) => {
      await Promise.all(ids.map((id) => markExposureFalsePositive(id, { reason })))
      handleRefresh()
    },
    [handleRefresh]
  )

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSeverityParam([])
    setStateParam('needs_attention')
    resetPage()
  }, [setSearchQuery, setSeverityParam, setStateParam, resetPage])

  const hasActiveFilters =
    !!searchQuery || selectedSeverities.length > 0 || activeView !== 'needs_attention'

  const columns = useMemo(
    () =>
      getExposureColumns({
        onResolve: (e) => handleAction(e, 'resolve'),
        onAccept: (e) => handleAction(e, 'accept'),
        onMarkFalsePositive: (e) => handleAction(e, 'false_positive'),
        onReactivate: (e) => handleAction(e, 'reactivate'),
        onViewDetails: setDetailExposure,
      }),
    [handleAction]
  )

  // Headline numbers double as the lifecycle quick filter.
  const activeCount = stats?.active_count ?? 0
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Total exposures',
      value: stats?.total ?? 0,
      onClick: () => setView('all'),
      active: activeView === 'all',
    },
    {
      key: 'active',
      label: 'Needs attention',
      value: activeCount,
      tone: 'danger',
      onClick: () => setView('needs_attention'),
      active: activeView === 'needs_attention',
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: stats?.resolved_count ?? 0,
      onClick: () => setView('resolved'),
      active: activeView === 'resolved',
    },
    {
      key: 'mttr',
      label: 'Mean time to resolve',
      value: stats?.mttr_hours ? `${stats.mttr_hours.toFixed(1)}h` : '—',
    },
  ]

  const rangeStart = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const rangeEnd = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize)

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search exposures…"
          aria-label="Search exposures"
          className="h-9 ps-9"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Severity
            {selectedSeverities.length > 0 && (
              <Badge variant="secondary" className="ms-2 px-1.5 tabular-nums">
                {selectedSeverities.length}
              </Badge>
            )}
            <ChevronDown className="ms-2 h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Severity</DropdownMenuLabel>
          {SEVERITIES.map((severity) => (
            <DropdownMenuCheckboxItem
              key={severity}
              checked={selectedSeverities.includes(severity)}
              onCheckedChange={() => toggleSeverity(severity)}
              onSelect={(e) => e.preventDefault()}
            >
              {SEVERITY_LABELS[severity]}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedSeverities.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSeverityParam([])}>Clear</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            {STATE_VIEWS.find((v) => v.value === activeView)?.label}
            <ChevronDown className="ms-2 h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>State</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={activeView} onValueChange={(v) => setView(v as StateTab)}>
            {STATE_VIEWS.map((v) => (
              <DropdownMenuRadioItem key={v.value} value={v.value}>
                {v.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
          <X className="me-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </>
  )

  const toolbarEnd = (
    <>
      <span className="hidden text-sm tabular-nums text-muted-foreground xl:inline">
        {total === 0 ? 'No results' : `${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={handleExport}
        disabled={isExporting || exposuresLoading || total === 0}
      >
        <Download className="h-4 w-4 md:me-2" />
        <span className="hidden md:inline">{isExporting ? 'Exporting…' : 'Export'}</span>
      </Button>
    </>
  )

  return (
    <Main>
      <PageHeader
        title="Exposures"
        description="Changes to your attack surface that need a decision — resolve, accept or dismiss them."
      />

      <Tabs value={tab} onValueChange={setTabParam} className="mt-4">
        <TabsList>
          <TabsTrigger value="list">All exposures</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-5 space-y-5">
          <MetricStrip loading={statsLoading} items={metrics} />

          {exposuresError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not load exposures</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                The exposure list failed to load.
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : exposuresLoading && exposures.length === 0 ? (
            <ExposureTableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={exposures}
              showSearch={false}
              toolbarStart={toolbarStart}
              toolbarEnd={toolbarEnd}
              getRowId={(e) => e.id}
              manualPagination
              rowCount={total}
              pagination={pagination}
              onPaginationChange={setPagination}
              pageSizeOptions={PAGE_SIZES}
              onRowClick={setDetailExposure}
              onSelectionChange={(rows) => setSelectedIds(rows.map((e) => e.id))}
              resetSelectionKey={selectionEpoch}
              showSelectionCount={false}
              emptyMessage={hasActiveFilters ? 'No exposures match these filters' : 'No exposures'}
              emptyDescription={
                hasActiveFilters
                  ? 'Try removing a filter or clearing them all.'
                  : 'Your attack surface has no open exposure events.'
              }
            />
          )}

          <ExposureBulkActions
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
            onBulkResolve={handleBulkResolve}
            onBulkAccept={handleBulkAccept}
            onBulkFalsePositive={handleBulkFalsePositive}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-5 space-y-5">
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <ExposureSeverityBreakdown bySeverity={stats.by_severity} />
                <ExposureStateBreakdown byState={stats.by_state} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>By event type</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventTypeDistribution byEventType={stats.by_event_type} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <ExposureActionDialog
        exposure={selectedExposure}
        actionType={actionType}
        open={actionType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
            setSelectedExposure(null)
          }
        }}
        onSuccess={handleActionSuccess}
      />

      {/* Detail Sheet */}
      <ExposureDetailSheet
        exposure={detailExposure}
        open={detailExposure !== null}
        onOpenChange={(open) => !open && setDetailExposure(null)}
        onAction={(action) => {
          if (detailExposure) {
            handleAction(detailExposure, action)
          }
        }}
      />
    </Main>
  )
}

interface EventTypeDistributionProps {
  byEventType: Record<string, number>
}

function EventTypeDistribution({ byEventType }: EventTypeDistributionProps) {
  const entries = Object.entries(byEventType || {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return <EmptyState card={false} icon={BarChart3} title="No exposure data yet" />
  }
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map(([type, count]) => {
        const percentage = ((count / total) * 100).toFixed(1)
        const label = type.replace(/_/g, ' ')
        return (
          <div key={type} className="flex items-center gap-3">
            <div className="w-40 truncate text-sm">
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="w-24 text-end text-sm text-muted-foreground tabular-nums">
              {count.toLocaleString()} ({percentage}%)
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** `source_url` → `Source url` when there is no explicit label. */
function humanizeKey(key: string): string {
  const text = key.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ============================================
// EXPOSURE DETAILS CONSTANTS
// ============================================

// Sensitive field patterns
const SENSITIVE_FIELDS = ['secret_value', 'password', 'api_key', 'token', 'private_key', 'secret']

// Field labels mapping
const FIELD_LABELS: Record<string, string> = {
  credential_type: 'Type',
  secret_value: 'Secret',
  source_type: 'Source type',
  source_url: 'Source URL',
  source_name: 'Source',
  database_host: 'Host',
  database_name: 'Database',
  database_port: 'Port',
  database_type: 'Type',
  username: 'Username',
  email: 'Email',
  domain: 'Domain',
  identifier: 'Identifier',
  ip_address: 'IP address',
  file_path: 'File',
  repository: 'Repository',
  commit_hash: 'Commit',
  branch: 'Branch',
  line_number: 'Line',
  breach_name: 'Breach',
  breach_date: 'Date',
  is_verified: 'Verified',
  is_revoked: 'Revoked',
  discovered_at: 'Discovered',
  classification: 'Classification',
}

// Group fields by category
const FIELD_GROUPS: Record<string, { title: string; icon: typeof Key; fields: string[] }> = {
  credential: {
    title: 'Credential',
    icon: Key,
    fields: [
      'credential_type',
      'identifier',
      'username',
      'email',
      'secret_value',
      'is_verified',
      'is_revoked',
    ],
  },
  database: {
    title: 'Database',
    icon: Database,
    fields: ['database_host', 'database_name', 'database_port', 'database_type'],
  },
  source: {
    title: 'Source',
    icon: Globe,
    fields: [
      'source_type',
      'source_name',
      'source_url',
      'breach_name',
      'breach_date',
      'discovered_at',
    ],
  },
  code: {
    title: 'Code location',
    icon: Server,
    fields: ['repository', 'file_path', 'branch', 'commit_hash', 'line_number'],
  },
  network: {
    title: 'Network',
    icon: Globe,
    fields: ['domain', 'ip_address'],
  },
}

// ============================================
// EXPOSURE DETAILS VIEW COMPONENT
// ============================================

interface ExposureDetailsViewProps {
  details: Record<string, unknown>
  secretsRevealed: boolean
  onToggleSecrets: () => void
}

function ExposureDetailsView({
  details,
  secretsRevealed,
  onToggleSecrets,
}: ExposureDetailsViewProps) {
  const handleCopy = (text: string) => {
    copyToClipboard(text)
    toast.success('Copied to clipboard')
  }

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    return String(value)
  }

  const isSensitiveField = (key: string): boolean => {
    return SENSITIVE_FIELDS.some((pattern) => key.toLowerCase().includes(pattern))
  }

  const maskValue = (value: string): string => {
    if (value.length <= 4) return '****'
    return (
      value.substring(0, 2) +
      '*'.repeat(Math.min(value.length - 4, 20)) +
      value.substring(value.length - 2)
    )
  }

  const isUrl = (value: string): boolean => {
    return value.startsWith('http://') || value.startsWith('https://')
  }

  // Organize details into groups
  const groupedDetails: Record<string, { key: string; value: unknown }[]> = {}
  const ungroupedDetails: { key: string; value: unknown }[] = []

  Object.entries(details).forEach(([key, value]) => {
    // Skip empty values
    if (value === null || value === undefined || value === '') return

    let found = false
    for (const [groupKey, group] of Object.entries(FIELD_GROUPS)) {
      if (group.fields.includes(key)) {
        if (!groupedDetails[groupKey]) {
          groupedDetails[groupKey] = []
        }
        groupedDetails[groupKey].push({ key, value })
        found = true
        break
      }
    }
    if (!found) {
      ungroupedDetails.push({ key, value })
    }
  })

  // Check if we have any sensitive fields
  const hasSensitiveFields = Object.keys(details).some(isSensitiveField)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Details</h4>
        {hasSensitiveFields && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleSecrets}>
            {secretsRevealed ? (
              <>
                <EyeOff className="me-1 h-3 w-3" />
                Hide secrets
              </>
            ) : (
              <>
                <Eye className="me-1 h-3 w-3" />
                Reveal secrets
              </>
            )}
          </Button>
        )}
      </div>

      {/* Grouped Details */}
      {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => {
        const groupItems = groupedDetails[groupKey]
        if (!groupItems || groupItems.length === 0) return null

        const GroupIcon = group.icon

        return (
          <div key={groupKey} className="rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
              <GroupIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{group.title}</span>
            </div>
            <div className="divide-y">
              {groupItems.map(({ key, value }) => {
                const label = FIELD_LABELS[key] || humanizeKey(key)
                const stringValue = formatValue(key, value)
                const isSensitive = isSensitiveField(key)
                const displayValue =
                  isSensitive && !secretsRevealed ? maskValue(stringValue) : stringValue
                const showAsUrl = !isSensitive && isUrl(stringValue)

                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      {showAsUrl ? (
                        <a
                          href={stringValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                        >
                          {displayValue}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span
                          className={cn(
                            'font-mono text-xs max-w-[200px] truncate',
                            isSensitive && 'text-destructive'
                          )}
                        >
                          {displayValue}
                        </span>
                      )}
                      {!isSensitive && stringValue !== '-' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(stringValue)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {isSensitive && secretsRevealed && stringValue !== '-' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(stringValue)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Ungrouped Details */}
      {ungroupedDetails.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <span className="text-sm font-medium">Additional details</span>
          </div>
          <div className="divide-y">
            {ungroupedDetails.map(({ key, value }) => {
              const label = FIELD_LABELS[key] || humanizeKey(key)
              const stringValue = formatValue(key, value)
              const isSensitive = isSensitiveField(key)
              const displayValue =
                isSensitive && !secretsRevealed ? maskValue(stringValue) : stringValue
              const showAsUrl = !isSensitive && isUrl(stringValue)

              return (
                <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {showAsUrl ? (
                      <a
                        href={stringValue}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                      >
                        {displayValue}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span
                        className={cn(
                          'font-mono text-xs max-w-[200px] truncate',
                          isSensitive && 'text-destructive'
                        )}
                      >
                        {displayValue}
                      </span>
                    )}
                    {stringValue !== '-' && (!isSensitive || secretsRevealed) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(stringValue)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ExposureDetailSheetProps {
  exposure: ExposureEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: ActionType) => void
}

function ExposureDetailSheet({ exposure, open, onOpenChange, onAction }: ExposureDetailSheetProps) {
  const { currentTenant } = useTenant()
  const [secretsRevealed, setSecretsRevealed] = useState(false)
  const { history, isLoading: historyLoading } = useExposureHistory(
    currentTenant?.id || null,
    exposure?.id || null
  )

  if (!exposure) return null

  const state = EXPOSURE_STATE_BADGE[exposure.state]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header with severity indicator */}
        <div className="border-b px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={exposure.severity} />
                {state && <Badge variant={state.variant}>{state.label}</Badge>}
              </div>
              <SheetHeader className="p-0 space-y-1">
                <SheetTitle className="text-start text-lg leading-tight">
                  {exposure.title}
                </SheetTitle>
                <SheetDescription className="text-start">
                  {exposure.event_type.replace(/_/g, ' ')} from {exposure.source}
                </SheetDescription>
              </SheetHeader>
            </div>
          </div>

          {/* Quick Actions - prominent at top */}
          {exposure.state === 'active' && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => onAction('resolve')}>
                <ShieldCheck className="me-1.5 h-4 w-4" />
                Resolve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('accept')}>
                <Shield className="me-1.5 h-4 w-4" />
                Accept risk
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('false_positive')}>
                <ShieldX className="me-1.5 h-4 w-4" />
                False positive
              </Button>
            </div>
          )}
          {exposure.state !== 'active' && (
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={() => onAction('reactivate')}>
                <Activity className="me-1.5 h-4 w-4" />
                Reactivate
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Description */}
          {exposure.description && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm">{exposure.description}</p>
            </div>
          )}

          {/* Security context — read-time CTEM enrichment (api #483): effective
              criticality, KEV, EPSS and attack-path reachability. Renders only
              when the API returns at least one signal. */}
          <ExposureSecurityContext exposure={exposure} />

          {/* Timeline Card */}
          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Timeline</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x">
              <div className="p-4">
                <span className="text-xs text-muted-foreground">First seen</span>
                <p className="text-sm font-medium mt-1">{formatRelative(exposure.first_seen_at)}</p>
              </div>
              <div className="p-4">
                <span className="text-xs text-muted-foreground">Last seen</span>
                <p className="text-sm font-medium mt-1">{formatRelative(exposure.last_seen_at)}</p>
              </div>
            </div>
            {exposure.resolved_at && (
              <div className="border-t p-4">
                <span className="text-xs text-muted-foreground">Resolved</span>
                <p className="mt-1 text-sm font-medium">{formatRelative(exposure.resolved_at)}</p>
              </div>
            )}
          </div>

          {/* Details */}
          {exposure.details && Object.keys(exposure.details).length > 0 && (
            <ExposureDetailsView
              details={exposure.details}
              secretsRevealed={secretsRevealed}
              onToggleSecrets={() => setSecretsRevealed(!secretsRevealed)}
            />
          )}

          {/* State History */}
          <StateHistorySection history={history} isLoading={historyLoading} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// STATE HISTORY SECTION COMPONENT
// ============================================

const INITIAL_HISTORY_COUNT = 3

interface StateHistorySectionProps {
  history: import('@/lib/api/exposure-types').ExposureStateHistory[]
  isLoading: boolean
}

function StateHistorySection({ history, isLoading }: StateHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMore = history.length > INITIAL_HISTORY_COUNT
  const displayedHistory = isExpanded ? history : history.slice(0, INITIAL_HISTORY_COUNT)

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">State history</span>
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className={cn('p-4', isExpanded && history.length > 5 && 'max-h-80 overflow-y-auto')}>
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading state history">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-3">
            {displayedHistory.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  index !== displayedHistory.length - 1 && 'pb-3 border-b'
                )}
              >
                <div className="mt-0.5 p-1 rounded-full bg-muted">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground capitalize">
                      {entry.previous_state.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium capitalize">
                      {entry.new_state.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {entry.reason && (
                    <div className="mt-1.5 ps-3 border-l-2 border-muted-foreground/30">
                      <p className="text-xs text-foreground/80 italic">
                        &ldquo;{entry.reason}&rdquo;
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {entry.changed_by_user ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {entry.changed_by_user.name || entry.changed_by_user.email}
                        </span>
                        <span>•</span>
                      </div>
                    ) : null}
                    <span>{formatRelative(entry.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Show more/less button */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <>Show less</> : <>Show all {history.length} changes</>}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No state changes recorded
          </p>
        )}
      </div>
    </div>
  )
}

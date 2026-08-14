'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUrlParams, useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import {
  useFindingSourcesApi,
  groupFindingSourcesByCategory,
} from '@/features/config/api/finding-source-api'
import { useDebounce } from '@/hooks/use-debounce'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, SeverityBadge, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  ClipboardList,
  AlertOctagon,
  Ticket,
  Wrench,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FindingStatusBadge,
  FindingDetailDrawer,
  CreateFindingDialog,
  FINDING_STATUS_CONFIG,
  SEVERITY_CONFIG,
} from '@/features/findings'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import { SlaStatusBadge } from '@/features/sla/components/sla-status-badge'
import { SLA_STATUS_LABELS, type SLAStatus } from '@/features/repositories/types/repository.types'
import { formatDueRelative } from '@/features/sla/lib/sla'
import { AssigneeSelect } from '@/features/findings/components/assignee-select'
import { FindingGroupsTab } from '@/features/findings/components/finding-groups-tab'
import { MarkFixedDialog } from '@/features/findings/components/mark-fixed-dialog'
import { CreateTicketDialog } from '@/features/findings/components/create-ticket-dialog'
import { LinkFindingsToRemediationDialog } from '@/features/remediation/components/link-findings-dialog'
import { PendingReviewTab } from '@/features/findings/components/pending-review-tab'
import {
  usePendingVerificationCount,
  type FindingGroup,
} from '@/features/findings/api/use-finding-groups'
import {
  useFindingsApi,
  useFindingStatsApi,
  invalidateFindingsCache,
} from '@/features/findings/api/use-findings-api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type {
  ApiFinding,
  FindingApiFilters,
  Severity as ApiSeverity,
} from '@/features/findings/api/finding-api.types'
import type { Finding, FindingStatus, FindingUser } from '@/features/findings'
import type { Severity } from '@/features/shared/types'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { patch, post, del, csrfFetch } from '@/lib/api/client'
import { usePermissions } from '@/context/permission-provider'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'

// ============================================
// Transform API Finding to UI Finding
// ============================================

function transformApiToUiFinding(api: ApiFinding): Finding {
  // Build location string — different sources have different location semantics:
  // Scanner findings: file_path[:line] with optional branch prefix
  // Pentest findings: asset name or affected targets (no file_path)
  let locationName = ''
  if (api.file_path) {
    locationName = api.file_path
    if (api.first_detected_branch) {
      locationName = `${api.first_detected_branch}:${locationName}`
    }
    if (api.start_line) {
      locationName = `${locationName}:${api.start_line}`
    }
  } else if (api.asset?.name) {
    locationName = api.asset.name
  } else if (api.metadata?.affected_assets) {
    const targets = api.metadata.affected_assets as string[]
    locationName = targets.length > 0 ? targets[0] : ''
    if (targets.length > 1) locationName += ` +${targets.length - 1}`
  }
  if (!locationName) locationName = api.asset_id || '-'

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
    // Location / repo / tool — needed so the detail drawer's "Affected Code"
    // panel and code highlighter render when opened from the list. The drawer
    // reads these typed fields directly; without them they were always blank
    // even though the API returns file_path/start_line/etc. (mirrors the
    // [id] detail-page transform).
    filePath: api.file_path,
    startLine: api.start_line,
    endLine: api.end_line,
    startColumn: api.start_column,
    endColumn: api.end_column,
    repositoryUrl: api.asset?.web_url,
    branch: api.last_seen_branch || api.first_detected_branch,
    commitSha: api.last_seen_commit || api.first_detected_commit,
    ruleId: api.rule_id,
    ruleName: api.rule_name,
    toolName: api.tool_name,
    toolVersion: api.tool_version,
    contextSnippet: api.context_snippet,
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
    // SLA tracking
    slaStatus: api.sla_status,
    slaDeadline: api.sla_deadline,
    // Threat Intel Enrichment (RFC-004)
    epssScore: api.epss_score,
    epssPercentile: api.epss_percentile,
    isInKev: api.is_in_kev,
    kevDueDate: api.kev_due_date,
    // Priority Classification (RFC-004)
    priorityClass: api.priority_class,
    priorityClassReason: api.priority_class_reason,
    priorityClassOverride: api.priority_class_override,
    isReachable: api.is_reachable,
    reachableFromCount: api.reachable_from_count,
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
  return <FindingsContent />
}

function FindingsContent() {
  const searchParams = useUrlParams()
  const router = useRouter()
  const assetIdFilter = searchParams.get('assetId')
  const sourceIdFilter = searchParams.get('source')
  const scanIdFilter = searchParams.get('scan_id')

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Selected finding IDs, lifted from the DataTable via onSelectionChange. The
  // table owns its checkbox state internally; previously nothing synced it out
  // so selectedCount was always 0 and the bulk-action bar never appeared.
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([])
  // Filters live in the URL so a view can be linked to. "The criticals from our
  // VA scanner" should be a link someone can paste, not a sequence of clicks to
  // reproduce.
  const [severityTab, setSeverityTab] = useUrlFilter('severity', 'all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [findingToDelete, setFindingToDelete] = useState<Finding | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useUrlFilter('status', 'all')
  // Multiple sources at once: "everything from code scanning" is one question,
  // and it spans sast and secret. Comma-separated, matching what the API takes.
  const [sourceFilter, setSourceFilter] = useUrlFilterList('sources')
  // CTEM signals are independent, stackable filters — each lives in its own URL
  // param so "P0 AND reachable AND KEV" is one link, not three mutually-exclusive
  // choices. The backend FindingFilter ANDs priority_classes + is_in_kev +
  // is_reachable + sla_status, so the UI param model must let them coexist.
  //  - `priority` : the P0–P3 class (single value)
  //  - `kev`      : boolean flag → is_in_kev
  //  - `reachable`: boolean flag → is_reachable
  //  - `sla_status`: multi-select list → sla_status
  const [priorityFilter, setPriorityFilter] = useUrlFilter('priority', 'all')
  const [kevFilter, setKevFilter] = useUrlFilter('kev', 'false')
  const [reachableFilter, setReachableFilter] = useUrlFilter('reachable', 'false')
  const [slaFilter, setSlaFilter] = useUrlFilterList('sla_status')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')

  // Backward-compat: legacy deep links modelled KEV / reachable as *values* of the
  // single `priority` param (e.g. /findings?priority=kev). Treat those as the new
  // boolean flags on read so old links keep working, and migrate the URL to the
  // new param shape once so every subsequent interaction is clean.
  const kevActive = kevFilter === 'true' || priorityFilter === 'kev'
  const reachableActive = reachableFilter === 'true' || priorityFilter === 'reachable'
  const priorityClass =
    priorityFilter === 'all' || priorityFilter === 'kev' || priorityFilter === 'reachable'
      ? null
      : priorityFilter

  useEffect(() => {
    if (priorityFilter === 'kev') {
      setKevFilter('true')
      setPriorityFilter('all')
    } else if (priorityFilter === 'reachable') {
      setReachableFilter('true')
      setPriorityFilter('all')
    }
  }, [priorityFilter, setKevFilter, setReachableFilter, setPriorityFilter])
  // Debounce so typing doesn't fire a backend list request per keystroke.
  const debouncedSearch = useDebounce(searchQuery, 300)
  // Server-side pagination state. The list is fetched one page at a time from
  // the API (was: fetch first 100 + client-paginate, which capped the table at
  // 100 rows even when the tenant had thousands of findings).
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [mainTab, setMainTab] = useState<'findings' | 'groups' | 'pending'>('findings')
  const [markFixedGroup, setMarkFixedGroup] = useState<FindingGroup | null>(null)
  const [ticketFinding, setTicketFinding] = useState<Finding | null>(null)
  // Findings selected to spin up (or join) a remediation task. Non-null = dialog open.
  const [remedContext, setRemedContext] = useState<{
    ids: string[]
    name?: string
    priority?: string
  } | null>(null)
  const { hasPermission } = usePermissions()
  // Both are Phase-3 gated modules embedded in this (findings) page: the "Create
  // Jira Ticket" action hits the integrations module, and "Add to remediation"
  // hits the remediation module. Hide + skip-fetch when disabled (fail-open on
  // OSS where no modules are reported).
  const remediationEnabled = useModuleEnabled('remediation')
  const integrationsEnabled = useModuleEnabled('integrations')
  const pendingCount = usePendingVerificationCount()

  // Statuses hidden from default dashboard view (pentest WIP, not ready for visibility)
  const HIDDEN_STATUSES = useMemo(() => ['draft', 'in_review'], [])

  // Build API filters
  // The source catalog is data, not a hardcoded list. The previous inline list
  // had drifted: it omitted cspm, which live findings actually use, so those
  // findings could not be filtered for at all.
  const { data: sourceCatalog } = useFindingSourcesApi()

  const sourceGroups = useMemo(() => {
    const grouped = groupFindingSourcesByCategory(sourceCatalog?.data ?? [])
    return Array.from(grouped.entries()).map(([code, group]) => ({
      code,
      label: group.label,
      options: group.options,
      codes: group.options.map((o) => o.value),
    }))
  }, [sourceCatalog?.data])

  const sourceLabelByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of sourceGroups) {
      for (const o of g.options) map.set(o.value, o.label)
    }
    return map
  }, [sourceGroups])

  const sourceLabel = useMemo(() => {
    if (sourceFilter.length === 0) return 'All'
    // Name the group when the selection is exactly one, so "Code Scanning" reads
    // better than "SAST +1".
    const match = sourceGroups.find(
      (g) =>
        g.codes.length === sourceFilter.length && g.codes.every((c) => sourceFilter.includes(c))
    )
    if (match) return match.label
    const [first, ...rest] = sourceFilter
    const firstLabel = sourceLabelByCode.get(first) ?? first.toUpperCase()
    return rest.length > 0 ? `${firstLabel} +${rest.length}` : firstLabel
  }, [sourceFilter, sourceGroups, sourceLabelByCode])

  const toggleSource = useCallback(
    (code: string) => {
      // Functional update, not a read of `sourceFilter` from render scope: two
      // toggles resolved against the same snapshot would lose the first.
      setSourceFilter((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      )
    },
    [setSourceFilter]
  )

  const toggleSla = useCallback(
    (code: string) => {
      setSlaFilter((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      )
    },
    [setSlaFilter]
  )

  // Summarise the stacked CTEM signals in the Priority button. "P0 + KEV" reads
  // as one composite filter, which is the whole point of making them stackable.
  const priorityLabel = useMemo(() => {
    const parts: string[] = []
    if (priorityClass) parts.push(priorityClass.toUpperCase())
    if (kevActive) parts.push('KEV')
    if (reachableActive) parts.push('Reachable')
    return parts.length > 0 ? parts.join(' + ') : 'All'
  }, [priorityClass, kevActive, reachableActive])

  const slaLabel = useMemo(() => {
    if (slaFilter.length === 0) return 'All'
    if (slaFilter.length === 1) return SLA_STATUS_LABELS[slaFilter[0] as SLAStatus] ?? slaFilter[0]
    return `${slaFilter.length} selected`
  }, [slaFilter])

  const apiFilters = useMemo((): FindingApiFilters => {
    const filters: FindingApiFilters = {
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
    }
    if (assetIdFilter) filters.asset_id = assetIdFilter
    if (sourceIdFilter) filters.source_id = sourceIdFilter
    if (scanIdFilter) filters.scan_id = scanIdFilter
    if (severityTab !== 'all') {
      filters.severities = [severityTab as ApiSeverity]
    }
    if (statusFilter !== 'all') {
      filters.statuses = [
        statusFilter as FindingApiFilters['statuses'] extends (infer U)[] ? U : never,
      ]
    } else {
      // Default: exclude draft/in_review (pentest WIP not ready for dashboard)
      filters.exclude_statuses = HIDDEN_STATUSES
    }
    if (sourceFilter.length > 0) {
      filters.sources = sourceFilter as NonNullable<FindingApiFilters['sources']>
    }
    if (debouncedSearch.trim()) {
      filters.search = debouncedSearch.trim()
    }
    // CTEM prioritization filters (RFC-017) — independent and stackable. Each
    // applies together (AND), mirroring how the backend FindingFilter combines
    // PriorityClasses + IsInKEV + IsReachable + SLAStatuses.
    if (priorityClass) filters.priority_classes = [priorityClass]
    if (kevActive) filters.is_in_kev = true
    if (reachableActive) filters.is_reachable = true
    if (slaFilter.length > 0) filters.sla_statuses = slaFilter
    return filters
  }, [
    assetIdFilter,
    sourceIdFilter,
    scanIdFilter,
    severityTab,
    statusFilter,
    sourceFilter,
    priorityClass,
    kevActive,
    reachableActive,
    slaFilter,
    debouncedSearch,
    HIDDEN_STATUSES,
    pagination,
  ])

  // Any filter change resets to the first page — otherwise a user on page 8 of
  // "All" who picks a filter with only 2 pages would sit on an empty page.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [
    assetIdFilter,
    sourceIdFilter,
    scanIdFilter,
    severityTab,
    statusFilter,
    sourceFilter,
    priorityClass,
    kevActive,
    reachableActive,
    slaFilter,
    debouncedSearch,
  ])

  // Fetch finding stats. Pass `assetId` so the severity cards reflect
  // the filtered table when the user navigates here from an asset
  // detail sheet ("View All Findings"). Without this, the cards
  // showed global tenant counts (e.g. "9 Critical") while the table
  // showed only the asset-scoped row count (e.g. "1 result"), which
  // looks like a bug.
  const {
    data: findingStats,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useFindingStatsApi({
    assetId: assetIdFilter ?? undefined,
  })

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

  const selectedCount = selectedFindingIds.length
  const selectedFindings = useMemo(
    () => findings.filter((f) => selectedFindingIds.includes(f.id)),
    [selectedFindingIds, findings]
  )

  const clearFilters = () => {
    router.push('/findings')
  }

  const handleRefresh = async () => {
    await Promise.all([mutateFindings(), mutateStats()])
    await invalidateFindingsCache()
    toast.success('Findings refreshed')
  }

  const handleExport = (format: string) => {
    if (!findings.length) {
      toast.error('No findings to export')
      return
    }

    if (format === 'CSV') {
      const headers = ['ID', 'Title', 'Severity', 'Status', 'Source', 'Scanner', 'Created At']
      const rows = findings.map((f) => [
        f.id,
        `"${(f.title || '').replace(/"/g, '""')}"`,
        f.severity,
        f.status,
        f.source || '',
        f.scanner || '',
        f.createdAt,
      ])
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `findings-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } else if (format === 'JSON') {
      const data = findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        source: f.source,
        scanner: f.scanner,
        cve: f.cve,
        createdAt: f.createdAt,
      }))
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `findings-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('JSON exported successfully')
    } else {
      // PDF export not yet implemented
      return
    }
  }

  const handleBulkAssign = async (userId: string) => {
    const findingIds = selectedFindingIds
    if (findingIds.length === 0 || !userId.trim()) return

    try {
      const response = await csrfFetch('/api/v1/findings/bulk/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ finding_ids: findingIds, user_id: userId.trim() }),
      })
      if (!response.ok) throw new Error('Failed to assign findings')
      toast.success(`Assigned ${findingIds.length} findings`)
      setSelectedFindingIds([])
      mutateFindings()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to assign findings'))
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    const findingIds = selectedFindingIds
    if (findingIds.length === 0) return

    try {
      const response = await csrfFetch('/api/v1/findings/bulk/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ finding_ids: findingIds, status }),
      })
      if (!response.ok) throw new Error('Failed to update findings')
      toast.success(`Updated ${findingIds.length} findings to ${status}`)
      setSelectedFindingIds([])
      mutateFindings()
      mutateStats()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update findings'))
    }
  }

  const handleRowClick = useCallback((finding: Finding) => {
    setSelectedFinding(finding)
    setDrawerOpen(true)
  }, [])

  const handleStatusChange = async (findingId: string, status: FindingStatus) => {
    try {
      await patch(`/api/v1/findings/${findingId}/status`, { status })
      const statusConfig = FINDING_STATUS_CONFIG[status]
      toast.success(`Status updated to "${statusConfig.label}"`)
      mutateFindings()
      mutateStats()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'))
    }
  }

  const handleSeverityChange = async (findingId: string, severity: Severity) => {
    try {
      await patch(`/api/v1/findings/${findingId}/severity`, { severity })
      const severityConfig = SEVERITY_CONFIG[severity]
      toast.success(`Severity updated to "${severityConfig.label}"`)
      mutateFindings()
      mutateStats()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update severity'))
    }
  }

  const handleAssigneeChange = async (findingId: string, assignee: FindingUser | null) => {
    try {
      if (assignee) {
        await post(`/api/v1/findings/${findingId}/assign`, { user_id: assignee.id })
        toast.success(`Assigned to ${assignee.name}`)
      } else {
        await del(`/api/v1/findings/${findingId}/assign`)
        toast.info('Finding unassigned')
      }
      mutateFindings()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update assignee'))
    }
  }

  const handleAddComment = async (findingId: string, comment: string) => {
    try {
      await post(`/api/v1/findings/${findingId}/comments`, { content: comment })
      toast.success('Comment added')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add comment'))
    }
  }

  const handleDeleteClick = (finding: Finding) => {
    setFindingToDelete(finding)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!findingToDelete) return

    setIsDeleting(true)
    try {
      const response = await csrfFetch(`/api/v1/findings/${findingToDelete.id}`, {
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

  // Open the "remediate findings" dialog, pre-filled from the selection: the name
  // is derived from the finding(s) and the priority from the highest severity, so
  // the mobilise step is one click from where a finding lives.
  const openRemediationFor = useCallback((selected: Finding[]) => {
    if (selected.length === 0) return
    const order = ['critical', 'high', 'medium', 'low']
    const top = [...selected]
      .map((f) => String(f.severity))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0]
    const priority = top === 'critical' ? 'urgent' : order.includes(top) ? top : 'medium'
    const name =
      selected.length === 1 ? `Fix: ${selected[0].title}` : `Remediate ${selected.length} findings`
    setRemedContext({ ids: selected.map((f) => f.id), name, priority })
  }, [])

  const handleRowAction = useCallback(
    (action: string, finding: Finding) => {
      switch (action) {
        case 'view':
          handleRowClick(finding)
          break
        case 'remediate':
          openRemediationFor([finding])
          break
        case 'copy_id':
          copyToClipboard(finding.id)
          toast.success('Finding ID copied to clipboard')
          break
        case 'copy_link':
          copyToClipboard(`${window.location.origin}/findings/${finding.id}`)
          toast.success('Link copied to clipboard')
          break
        case 'delete':
          handleDeleteClick(finding)
          break
        case 'create_ticket':
          setTicketFinding(finding)
          break
        case 'assign':
        case 'status':
        case 'false_positive':
          // These actions live in the detail drawer (assignee picker, status
          // select with approval flow). Open it focused on this finding rather
          // than firing a no-op.
          handleRowClick(finding)
          break
        default:
          toast.info(`Action: ${action}`, { description: finding.title })
      }
    },
    [handleRowClick, openRemediationFor]
  )

  // Define columns for DataTable
  // Priority is the RFC-004 P0–P3 class; it's only populated once the
  // classifier has run. When nothing in view has one, we drop the column
  // instead of rendering a full column of "—" (it returns once data exists).
  const hasAnyPriority = useMemo(() => findings.some((f) => f.priorityClass), [findings])

  const columns: ColumnDef<Finding>[] = useMemo(() => {
    const cols: ColumnDef<Finding>[] = [
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
              role="button"
              tabIndex={0}
              aria-label="View finding details"
              onClick={() => handleRowClick(row.original)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRowClick(row.original)
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <p className="font-medium truncate">{row.getValue('title')}</p>
                {/* KEV — actively exploited; the single most urgent triage signal */}
                {row.original.isInKev && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        <AlertOctagon className="h-2.5 w-2.5" />
                        KEV
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p className="font-semibold">CISA Known Exploited Vulnerability</p>
                      {row.original.kevDueDate && (
                        <p>Remediate by {new Date(row.original.kevDueDate).toLocaleDateString()}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}
                {typeof row.original.epssScore === 'number' && row.original.epssScore > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        EPSS {(row.original.epssScore * 100).toFixed(1)}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Exploit Prediction Scoring System — estimated probability of exploitation in
                      the next 30 days
                    </TooltipContent>
                  </Tooltip>
                )}
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
              {(row.original.cve || row.original.scanner) && (
                <p className="text-muted-foreground truncate text-xs">
                  {row.original.cve && <span className="font-mono">{row.original.cve}</span>}
                  {row.original.cve && row.original.scanner && ' · '}
                  {row.original.scanner}
                </p>
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
        accessorKey: 'priorityClass',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => {
          const pc = row.original.priorityClass
          if (!pc) return <span className="text-muted-foreground text-xs">-</span>
          return <PriorityClassBadge priorityClass={pc} />
        },
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
        cell: ({ row }) => {
          const asset = row.original.assets[0]
          const name = asset?.name
          if (!name || name === '-') {
            return <span className="text-muted-foreground text-sm">—</span>
          }
          // The transform falls back to the raw asset_id (a UUID) when the API
          // response carries no asset name or file path — showing that verbatim
          // reads as broken data. Detect it (name === the asset id) and render a
          // compact, clickable asset reference instead of the bare UUID.
          if (asset?.id && name === asset.id) {
            return (
              <Link
                href={`/assets/${asset.id}`}
                title={asset.id}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="font-mono">{asset.id.slice(0, 8)}…</span>
              </Link>
            )
          }
          return (
            <span
              className="text-muted-foreground block max-w-[200px] truncate font-mono text-sm"
              title={name}
            >
              {name}
            </span>
          )
        },
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
        accessorKey: 'slaStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due / SLA" />,
        cell: ({ row }) => {
          const status = row.original.slaStatus
          if (!status || status === 'not_applicable') {
            return <span className="text-muted-foreground text-sm">—</span>
          }
          return (
            <div className="flex flex-col gap-0.5">
              <SlaStatusBadge status={status} />
              {row.original.slaDeadline && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatDueRelative(row.original.slaDeadline)}
                </span>
              )}
            </div>
          )
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
                  <ExternalLink className="me-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('assign', finding)}>
                  <UserPlus className="me-2 h-4 w-4" />
                  Assign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('status', finding)}>
                  <CheckCircle className="me-2 h-4 w-4" />
                  Change Status
                </DropdownMenuItem>
                {integrationsEnabled && (
                  <DropdownMenuItem onClick={() => handleRowAction('create_ticket', finding)}>
                    <Ticket className="me-2 h-4 w-4" />
                    Create Jira Ticket
                  </DropdownMenuItem>
                )}
                {hasPermission('findings:remediation:write') && remediationEnabled && (
                  <DropdownMenuItem onClick={() => handleRowAction('remediate', finding)}>
                    <Wrench className="me-2 h-4 w-4" />
                    Add to remediation
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRowAction('copy_id', finding)}>
                  <Copy className="me-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowAction('copy_link', finding)}>
                  <Link2 className="me-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-amber-500"
                  onClick={() => handleRowAction('false_positive', finding)}
                >
                  <Flag className="me-2 h-4 w-4" />
                  Mark as False Positive
                </DropdownMenuItem>
                {hasPermission('findings:delete') && (
                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => handleRowAction('delete', finding)}
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ]
    return hasAnyPriority
      ? cols
      : cols.filter((c) => !('accessorKey' in c) || c.accessorKey !== 'priorityClass')
  }, [
    handleRowAction,
    handleRowClick,
    hasPermission,
    hasAnyPriority,
    remediationEnabled,
    integrationsEnabled,
  ])

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
              <RefreshCw className="me-2 h-4 w-4" />
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
            <Link href="/findings/approvals">
              <Button variant="outline" size="sm">
                <ClipboardList className="h-4 w-4 sm:me-2" />
                <span className="hidden sm:inline">Approvals</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={statsLoading || findingsLoading}
            >
              {statsLoading || findingsLoading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="me-2 h-4 w-4" />
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
                <DropdownMenuItem disabled>Export as PDF Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission('findings:write') && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 sm:me-2" />
                <span className="hidden sm:inline">Add Finding</span>
              </Button>
            )}
          </div>
        </PageHeader>

        {/* Active scan filter badge */}
        {scanIdFilter && (
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Filter className="h-3 w-3" />
              Scan: {scanIdFilter.slice(0, 8)}…
              <button
                type="button"
                onClick={() => router.push('/findings')}
                className="ms-1 rounded-sm hover:bg-background/50"
                aria-label="Clear scan filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <span className="text-muted-foreground text-xs">
              Showing findings from this scan only
            </span>
          </div>
        )}

        {/* Main Tab Selector */}
        <div className="mt-4">
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
            <TabsList>
              <TabsTrigger value="findings">All Findings</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending Review
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ms-1.5 h-5 min-w-[20px] px-1 text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {mainTab === 'groups' && (
          <div className="mt-4">
            <FindingGroupsTab onMarkFixed={(group) => setMarkFixedGroup(group)} />
          </div>
        )}

        {mainTab === 'pending' && (
          <div className="mt-4">
            <PendingReviewTab />
          </div>
        )}

        {mainTab !== 'findings' ? null : (
          <>
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
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
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
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Filter Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Search findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="me-2 h-4 w-4" />
                    Status:{' '}
                    {statusFilter === 'all'
                      ? 'All'
                      : FINDING_STATUS_CONFIG[statusFilter as FindingStatus]?.label || statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('new')}>New</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('confirmed')}>
                    Confirmed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('in_progress')}>
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('fix_applied')}>
                    Fix Applied
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('resolved')}>
                    Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('false_positive')}>
                    False Positive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('accepted')}>
                    Accepted
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('in_review')}>
                    In Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('remediation')}>
                    Remediation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('retest')}>
                    Retest
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('verified')}>
                    Verified
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('accepted_risk')}>
                    Accepted Risk
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="me-2 h-4 w-4" />
                    Source: {sourceLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-96 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSourceFilter([])}>
                    All sources
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {sourceGroups.length === 0 ? (
                    <DropdownMenuItem disabled>No sources available</DropdownMenuItem>
                  ) : (
                    sourceGroups.map((group) => (
                      <DropdownMenuGroup key={group.code}>
                        <DropdownMenuLabel
                          className="cursor-pointer text-xs font-medium hover:underline"
                          onClick={() => setSourceFilter(group.codes)}
                        >
                          {group.label}
                        </DropdownMenuLabel>
                        {group.options.map((opt) => (
                          <DropdownMenuCheckboxItem
                            key={opt.value}
                            checked={sourceFilter.includes(opt.value)}
                            onCheckedChange={() => toggleSource(opt.value)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {opt.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuGroup>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="me-2 h-4 w-4" />
                    Priority: {priorityLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {/* Priority class — a single P0–P3 selection. */}
                  <DropdownMenuLabel className="text-xs">Priority class</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setPriorityFilter('all')}>
                    All classes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriorityFilter('P0')}>
                    P0 — Critical / Act now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriorityFilter('P1')}>
                    P1 — High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriorityFilter('P2')}>
                    P2 — Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriorityFilter('P3')}>
                    P3 — Low
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* CTEM signals — checkboxes so they stack with the class AND each
                      other (P0 ∧ KEV ∧ reachable is one query). */}
                  <DropdownMenuLabel className="text-xs">Threat signals</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={kevActive}
                    onCheckedChange={(v) => setKevFilter(v ? 'true' : 'false')}
                    onSelect={(e) => e.preventDefault()}
                  >
                    In CISA KEV
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={reachableActive}
                    onCheckedChange={(v) => setReachableFilter(v ? 'true' : 'false')}
                    onSelect={(e) => e.preventDefault()}
                  >
                    Reachable
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="me-2 h-4 w-4" />
                    SLA: {slaLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSlaFilter([])}>All</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(
                    ['overdue', 'exceeded', 'warning', 'on_track', 'not_applicable'] as SLAStatus[]
                  ).map((s) => (
                    <DropdownMenuCheckboxItem
                      key={s}
                      checked={slaFilter.includes(s)}
                      onCheckedChange={() => toggleSla(s)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {SLA_STATUS_LABELS[s]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active stackable filters — one removable badge per signal so the
                AND-stacking is visible ("P0 + KEV + Overdue" is three chips), and
                each can be cleared independently. "Clear all" resets every param. */}
            {(priorityClass || kevActive || reachableActive || slaFilter.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">Active:</span>
                {priorityClass && (
                  <Badge variant="secondary" className="gap-1.5">
                    {priorityClass.toUpperCase()}
                    <button
                      type="button"
                      onClick={() => setPriorityFilter('all')}
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
                      aria-label="Clear priority class filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {kevActive && (
                  <Badge variant="secondary" className="gap-1.5">
                    KEV
                    <button
                      type="button"
                      onClick={() => setKevFilter('false')}
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
                      aria-label="Clear KEV filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {reachableActive && (
                  <Badge variant="secondary" className="gap-1.5">
                    Reachable
                    <button
                      type="button"
                      onClick={() => setReachableFilter('false')}
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
                      aria-label="Clear reachable filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {slaFilter.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1.5">
                    {SLA_STATUS_LABELS[s as SLAStatus] ?? s}
                    <button
                      type="button"
                      onClick={() => toggleSla(s)}
                      className="ms-0.5 rounded-full hover:bg-muted-foreground/20"
                      aria-label={`Clear ${s} SLA filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Bulk Actions Bar - Shows when items selected */}
            {selectedCount > 0 && (
              <Card className="mt-4 border-primary">
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{selectedCount} finding(s) selected</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <AssigneeSelect
                      placeholder="Assign to…"
                      onChange={(user) => {
                        if (user) void handleBulkAssign(user.id)
                      }}
                    />
                    {hasPermission('findings:remediation:write') && remediationEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRemediationFor(selectedFindings)}
                      >
                        <Wrench className="me-2 h-4 w-4" />
                        Create remediation task
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Flag className="me-2 h-4 w-4" />
                          Change Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange('confirmed')}>
                          Confirmed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange('in_progress')}>
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange('resolved')}>
                          Resolved
                        </DropdownMenuItem>
                        {/* false_positive requires the per-finding approval flow, so it is
                            intentionally not offered as a bulk action. */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => setSelectedFindingIds([])}>
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
                {/* Severity stat-cards removed — the counts already live in the
                    severity filter tabs below, so showing them twice was noise. */}

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
                          <span className="ms-1">({stats.bySeverity.critical})</span>
                        </TabsTrigger>
                        <TabsTrigger value="high" className="text-xs sm:text-sm shrink-0">
                          High ({stats.bySeverity.high})
                        </TabsTrigger>
                        <TabsTrigger value="medium" className="text-xs sm:text-sm shrink-0">
                          <span className="hidden sm:inline">Medium</span>
                          <span className="sm:hidden">Med</span>
                          <span className="ms-1">({stats.bySeverity.medium})</span>
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
                            showSearch={false}
                            getRowId={(f) => f.id}
                            manualPagination
                            rowCount={findingsResponse?.total ?? 0}
                            pagination={pagination}
                            onPaginationChange={setPagination}
                            onSelectionChange={(rows) =>
                              setSelectedFindingIds(rows.map((f) => f.id))
                            }
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
          </>
        )}
      </Main>

      {/* Mark Fixed Dialog */}
      {markFixedGroup && (
        <MarkFixedDialog
          open={!!markFixedGroup}
          onOpenChange={(open) => {
            if (!open) setMarkFixedGroup(null)
          }}
          groupKey={markFixedGroup.group_key}
          groupType={markFixedGroup.group_type}
          groupLabel={markFixedGroup.label}
          findingCount={markFixedGroup.stats.in_progress}
          onSuccess={() => {
            setMarkFixedGroup(null)
            mutateFindings()
            mutateStats()
          }}
        />
      )}

      {/* Create Jira Ticket Dialog */}
      {ticketFinding && (
        <CreateTicketDialog
          findingId={ticketFinding.id}
          findingTitle={ticketFinding.title}
          open={!!ticketFinding}
          onOpenChange={(open) => {
            if (!open) setTicketFinding(null)
          }}
        />
      )}

      {/* Mounted only while open: the dialog fetches remediation campaigns on
          mount, so keeping it always-mounted would fire that (gated-module)
          request on every Findings page load. */}
      {remedContext && (
        <LinkFindingsToRemediationDialog
          open={!!remedContext}
          onOpenChange={(open) => {
            if (!open) setRemedContext(null)
          }}
          findingIds={remedContext?.ids ?? []}
          suggestedName={remedContext?.name}
          suggestedPriority={remedContext?.priority}
          onDone={() => setSelectedFindingIds([])}
        />
      )}

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
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Finding?"
        desc="This will permanently delete this finding. This action cannot be undone."
        confirmText={
          isDeleting ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete'
          )
        }
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      >
        {findingToDelete && (
          <div className="rounded-lg border bg-muted/50 p-3 my-2">
            <p className="font-medium truncate">{findingToDelete.title}</p>
            <p className="text-sm text-muted-foreground">
              {findingToDelete.severity.toUpperCase()} severity
              {findingToDelete.scanner && ` · ${findingToDelete.scanner}`}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}

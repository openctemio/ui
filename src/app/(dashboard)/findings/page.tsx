'use client'

import { formatEpssScore } from '@/lib/epss'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUrlParams, useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import {
  useFindingSourcesApi,
  groupFindingSourcesByCategory,
} from '@/features/config/api/finding-source-api'
import { useDebounce } from '@/hooks/use-debounce'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  SeverityBadge,
  DataTable,
  DataTableColumnHeader,
  MetricStrip,
  type MetricStripItem,
  FacetPanel,
  FacetSection,
  FacetOption,
  FacetToggle,
  FacetGroupLabel,
  BulkActionBar,
} from '@/features/shared'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ClipboardList,
  AlertOctagon,
  Ticket,
  Wrench,
  ListFilter,
  PanelLeftClose,
  Search,
  ArrowLeft,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FindingStatusBadge,
  FindingDetailDrawer,
  CreateFindingDialog,
  FINDING_STATUS_CONFIG,
} from '@/features/findings'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import { SlaStatusBadge } from '@/features/sla/components/sla-status-badge'
import { SLA_STATUS_LABELS, type SLAStatus } from '@/features/repositories/types/repository.types'
import { formatDueRelative } from '@/features/sla/lib/sla'
import { AssigneeSelect } from '@/features/findings/components/assignee-select'
import {
  FindingGroupsTab,
  GROUP_BY_DIMENSIONS,
} from '@/features/findings/components/finding-groups-tab'
import type { GroupByDimension } from '@/features/findings/api/use-finding-groups'
import { MarkFixedDialog } from '@/features/findings/components/mark-fixed-dialog'
import { CreateTicketDialog } from '@/features/findings/components/create-ticket-dialog'
import { LinkFindingsToRemediationDialog } from '@/features/remediation/components/link-findings-dialog'
import { PendingReviewTab } from '@/features/findings/components/pending-review-tab'
import { type FindingGroup } from '@/features/findings/api/use-finding-groups'
import {
  useFindingsApi,
  useFindingStatsApi,
  invalidateFindingsCache,
} from '@/features/findings/api/use-findings-api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { ApiFinding, FindingApiFilters } from '@/features/findings/api/finding-api.types'
import type { Finding, FindingStatus } from '@/features/findings'
import type { Severity } from '@/features/shared/types'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { post, csrfFetch } from '@/lib/api/client'
import { usePermissions } from '@/context/permission-provider'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'
import { findingAssetType } from '@/features/findings/lib/finding-asset-type'

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
        type: findingAssetType(api),
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

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low', 'info'] as const
type FacetSeverity = (typeof SEVERITY_VALUES)[number]
const PAGE_SIZES = [10, 20, 30, 50, 100]
/** Short option labels — the trigger's layers icon already says "group by". */
const GROUP_BY_LABELS: Record<GroupByDimension, string> = {
  cve_id: 'CVE',
  asset_id: 'Asset',
  owner_id: 'Owner',
  severity: 'Severity',
  source: 'Source',
  component_id: 'Component',
  finding_type: 'Type',
}
const FILTERS_OPEN_KEY = 'openctem:findings-filters-open'
const SEVERITY_LABELS: Record<FacetSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}
const OPEN_STATUSES = ['new', 'confirmed', 'in_progress', 'fix_applied', 'remediation', 'retest']
const STATUS_GROUPS = [
  { label: 'Open', values: OPEN_STATUSES },
  {
    label: 'Closed',
    values: ['resolved', 'verified', 'false_positive', 'accepted', 'accepted_risk'],
  },
  { label: 'Pentest workflow', values: ['draft', 'in_review'] },
]
const OVERDUE_SLA = ['overdue', 'exceeded']
const SLA_OPTIONS: SLAStatus[] = ['overdue', 'exceeded', 'warning', 'on_track', 'not_applicable']
const PRIORITY_OPTIONS = [
  { value: 'P0', hint: 'Act now' },
  { value: 'P1', hint: 'High' },
  { value: 'P2', hint: 'Medium' },
  { value: 'P3', hint: 'Low' },
]

/** First-load placeholder shaped like the toolbar + table it stands in for. */
function FindingsTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-72" />
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

/**
 * Table columns the API can sort by (FindingAllowedSortFields), keyed by column
 * id. Title, location and SLA have no server sort field, so those headers are
 * plain text rather than a control that reorders only the rows on screen.
 * `invert`: the API ranks critical / P0 first on *ascending* order, while the
 * table's "descending" means most important first.
 */
const SORTABLE_COLUMNS: Record<string, { api: string; invert?: boolean }> = {
  severity: { api: 'severity', invert: true },
  priorityClass: { api: 'priority_class', invert: true },
  source: { api: 'source' },
  status: { api: 'status' },
  createdAt: { api: 'created_at' },
}

/** `?sort=severity.desc` → table sorting state. */
function parseSortParam(value: string): SortingState {
  const [id, dir] = value.split('.')
  return id && SORTABLE_COLUMNS[id] ? [{ id, desc: dir !== 'asc' }] : []
}

/** Table sorting → API `sort` (newest first as the tie-breaker). */
function toApiSort(sorting: SortingState): string | undefined {
  const first = sorting[0]
  const col = first ? SORTABLE_COLUMNS[first.id] : undefined
  if (!first || !col) return undefined
  const ascending = col.invert ? first.desc : !first.desc
  const primary = `${ascending ? '' : '-'}${col.api}`
  return col.api === 'created_at' ? primary : `${primary},-created_at`
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
  // Bumped to clear the table's own checkbox state along with ours.
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => {
    setSelectedFindingIds([])
    setSelectionEpoch((e) => e + 1)
  }, [])
  // Filters live in the URL so a view can be linked to. "The criticals from our
  // VA scanner" should be a link someone can paste, not a sequence of clicks to
  // reproduce.
  // Severity / status / priority are multi-select lists (comma-separated). A
  // legacy single value (?severity=critical, ?priority=P0 from dashboard links)
  // parses as a one-item list, so old links keep working; 'all' is ignored.
  const [severityParam, setSeverityParam] = useUrlFilterList('severity')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [findingToDelete, setFindingToDelete] = useState<Finding | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusParam, setStatusParam] = useUrlFilterList('status')
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
  const [priorityParam, setPriorityParam] = useUrlFilterList('priority')
  const [kevFilter, setKevFilter] = useUrlFilter('kev', 'false')
  const [reachableFilter, setReachableFilter] = useUrlFilter('reachable', 'false')
  const [slaFilter, setSlaFilter] = useUrlFilterList('sla_status')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  // "Assigned to me" / My Work: findings the current user is the assignee of,
  // owns the asset of, or is a member of an assigned group. Independent, stackable
  // with the CTEM signals; the backend resolves the user from the token.
  const [mineFilter, setMineFilter] = useUrlFilter('mine', 'false')
  const mineActive = mineFilter === 'true'

  // Backward-compat: legacy deep links modelled KEV / reachable as *values* of the
  // single `priority` param (e.g. /findings?priority=kev). Treat those as the new
  // boolean flags on read so old links keep working, and migrate the URL to the
  // new param shape once so every subsequent interaction is clean.
  const kevActive = kevFilter === 'true' || priorityParam.includes('kev')
  const reachableActive = reachableFilter === 'true' || priorityParam.includes('reachable')
  const severities = useMemo(
    () =>
      severityParam.filter((v): v is FacetSeverity =>
        (SEVERITY_VALUES as readonly string[]).includes(v)
      ),
    [severityParam]
  )
  const statuses = useMemo(() => statusParam.filter((v) => v !== 'all'), [statusParam])
  const priorityClasses = useMemo(
    () => priorityParam.filter((v) => /^p[0-3]$/i.test(v)).map((v) => v.toUpperCase()),
    [priorityParam]
  )

  useEffect(() => {
    if (priorityParam.includes('kev')) setKevFilter('true')
    if (priorityParam.includes('reachable')) setReachableFilter('true')
    if (priorityParam.includes('kev') || priorityParam.includes('reachable')) {
      setPriorityParam((prev) => prev.filter((v) => v !== 'kev' && v !== 'reachable'))
    }
  }, [priorityParam, setKevFilter, setReachableFilter, setPriorityParam])
  // Debounce so typing doesn't fire a backend list request per keystroke.
  const debouncedSearch = useDebounce(searchQuery, 300)
  // Server-side pagination state. The list is fetched one page at a time from
  // the API (was: fetch first 100 + client-paginate, which capped the table at
  // 100 rows even when the tenant had thousands of findings).
  // The whole view is in the URL — tab, page, page size and sort as well as
  // filters — so any screen of this list can be shared or bookmarked.
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
      setPageParam(next.pageIndex === 0 ? '1' : String(next.pageIndex + 1))
      setPerPageParam(String(next.pageSize))
    },
    [setPageParam, setPerPageParam]
  )
  // No tabs: grouping is a view of the same findings ("Group by"), and the
  // verification queue is reached from its metric. Legacy ?tab= links map over.
  const [tabParam, setTabParam] = useUrlFilter('tab', '')
  const [groupParam, setGroupParam] = useUrlFilter('group', '')
  const [viewParam, setViewParam] = useUrlFilter('view', '')
  useEffect(() => {
    if (tabParam === 'groups') setGroupParam('cve_id')
    if (tabParam === 'pending') setViewParam('verify')
    if (tabParam) setTabParam('')
  }, [tabParam, setTabParam, setGroupParam, setViewParam])
  const groupBy = GROUP_BY_DIMENSIONS.some((d) => d.value === groupParam)
    ? (groupParam as GroupByDimension)
    : null
  const verifyView = viewParam === 'verify'
  const [, setAssetParam] = useUrlFilter('assetId', '')
  const [sortParam, setSortParam] = useUrlFilter('sort', '')
  const sorting = useMemo<SortingState>(() => parseSortParam(sortParam), [sortParam])
  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0]
      setSortParam(
        first && SORTABLE_COLUMNS[first.id] ? `${first.id}.${first.desc ? 'desc' : 'asc'}` : ''
      )
    },
    [setSortParam]
  )
  // Filter panel: closed by default so the table gets the width; the viewer's
  // choice is remembered (a per-browser convenience, safe to lose).
  const [filtersOpen, setFiltersOpenState] = useState(false)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(FILTERS_OPEN_KEY) === '1') setFiltersOpenState(true)
    } catch {
      // storage unavailable — stay closed
    }
  }, [])
  const setFiltersOpen = useCallback((next: boolean | ((open: boolean) => boolean)) => {
    setFiltersOpenState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      try {
        window.localStorage.setItem(FILTERS_OPEN_KEY, value ? '1' : '0')
      } catch {
        // best-effort
      }
      return value
    })
  }, [])
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
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

  const apiFilters = useMemo((): FindingApiFilters => {
    const filters: FindingApiFilters = {
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
    }
    if (assetIdFilter) filters.asset_id = assetIdFilter
    if (sourceIdFilter) filters.source_id = sourceIdFilter
    if (scanIdFilter) filters.scan_id = scanIdFilter
    if (severities.length > 0) filters.severities = severities
    if (statuses.length > 0) {
      filters.statuses = statuses as NonNullable<FindingApiFilters['statuses']>
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
    if (priorityClasses.length > 0) filters.priority_classes = priorityClasses
    const apiSort = toApiSort(sorting)
    if (apiSort) filters.sort = apiSort
    if (kevActive) filters.is_in_kev = true
    if (reachableActive) filters.is_reachable = true
    if (mineActive) filters.assigned_to_me = true
    if (slaFilter.length > 0) filters.sla_statuses = slaFilter
    return filters
  }, [
    assetIdFilter,
    sourceIdFilter,
    scanIdFilter,
    severities,
    statuses,
    sourceFilter,
    priorityClasses,
    kevActive,
    reachableActive,
    mineActive,
    slaFilter,
    debouncedSearch,
    HIDDEN_STATUSES,
    pagination,
    sorting,
  ])

  // Any filter change resets to the first page — otherwise a user on page 8 of
  // "All" who picks a filter with only 2 pages would sit on an empty page.
  // Keyed on the filter *values*, so the first render (reading a shared link
  // with ?page=3) is not reset — only a later filter change is.
  const filterKey = [
    assetIdFilter,
    sourceIdFilter,
    scanIdFilter,
    severities.join(),
    statuses.join(),
    sourceFilter.join(),
    priorityClasses.join(),
    kevActive,
    reachableActive,
    mineActive,
    slaFilter.join(),
    debouncedSearch,
    sortParam,
  ].join('|')
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    setPageParam('1')
  }, [filterKey, setPageParam])

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
  } = useFindingsApi(apiFilters, { keepPreviousData: true })

  // Headline numbers all come from /findings/stats — no per-number list
  // requests (those pushed a single page load past the per-user read limit).
  // '—' until the api exposes the field (older api).
  const overdueCount: number | string = findingStats ? (findingStats.sla_breached ?? '—') : 0
  const kevCount: number | string = findingStats ? (findingStats.kev_open ?? '—') : 0
  const pendingCount = findingStats?.by_status?.fix_applied ?? 0

  // Initial loading state (only true when we don't have stats yet)
  const isInitialLoading = statsLoading && !findingStats

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
      clearSelection()
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
      clearSelection()
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

  // The drawer writes status, severity and assignee itself (with its own toast
  // and Undo); the page only refreshes the list. Writing again here sent every
  // change twice and showed two toasts.
  const refreshAfterDrawerChange = useCallback(() => {
    mutateFindings()
    mutateStats()
  }, [mutateFindings, mutateStats])

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
        enableSorting: false,
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
                        EPSS {formatEpssScore(row.original.epssScore)}
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
        enableSorting: false,
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
        enableSorting: false,
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

  // ---- Filter model shared by the facet panel, the chips and the metrics ----
  const setSeverities = (next: string[]) => setSeverityParam(next)
  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v) => b.includes(v))

  // A plain function, not useCallback: this block sits below the early `error`
  // return, so a hook here would be conditional.
  const clearAllFilters = () => {
    setSeverityParam([])
    setStatusParam([])
    setPriorityParam([])
    setKevFilter('false')
    setReachableFilter('false')
    setSlaFilter([])
    setSourceFilter([])
    setMineFilter('false')
    setSearchQuery('')
  }

  const statusLabel = (v: string) =>
    FINDING_STATUS_CONFIG[v as FindingStatus]?.label ??
    v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

  const activeCount =
    Number(mineActive) +
    severities.length +
    statuses.length +
    priorityClasses.length +
    Number(kevActive) +
    Number(reachableActive) +
    slaFilter.length +
    sourceFilter.length

  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'All findings',
      value: stats.total,
      onClick: () => {
        clearAllFilters()
        setGroupParam('')
        setViewParam('')
      },
      active: activeCount === 0 && !groupBy && !verifyView,
    },
    {
      key: 'open',
      label: 'Open',
      value: findingStats?.open_count ?? 0,
      onClick: () => setStatusParam(sameSet(statuses, OPEN_STATUSES) ? [] : OPEN_STATUSES),
      active: sameSet(statuses, OPEN_STATUSES),
    },
    {
      key: 'critical',
      label: 'Critical',
      value: stats.bySeverity.critical,
      tone: 'danger',
      onClick: () => setSeverities(sameSet(severities, ['critical']) ? [] : ['critical']),
      active: sameSet(severities, ['critical']),
    },
    {
      key: 'high',
      label: 'High',
      value: stats.bySeverity.high,
      onClick: () => setSeverities(sameSet(severities, ['high']) ? [] : ['high']),
      active: sameSet(severities, ['high']),
    },
    {
      key: 'overdue',
      label: 'Overdue SLA',
      value: overdueCount,
      tone: 'danger',
      onClick: () => {
        // Open AND past due — the same scope as the count.
        const on = sameSet(slaFilter, OVERDUE_SLA) && sameSet(statuses, OPEN_STATUSES)
        setSlaFilter(on ? [] : OVERDUE_SLA)
        setStatusParam(on ? [] : OPEN_STATUSES)
      },
      active: sameSet(slaFilter, OVERDUE_SLA) && sameSet(statuses, OPEN_STATUSES),
    },
    {
      key: 'kev',
      label: 'In CISA KEV',
      value: kevCount,
      tone: 'danger',
      onClick: () => {
        // Open AND in KEV — the same scope as the count.
        const on = kevActive && sameSet(statuses, OPEN_STATUSES)
        setKevFilter(on ? 'false' : 'true')
        setStatusParam(on ? [] : OPEN_STATUSES)
      },
      active: kevActive && sameSet(statuses, OPEN_STATUSES),
    },
    {
      // The verification queue: fixes claimed by owners, waiting for a
      // verifier to confirm or reject (grouped by CVE).
      key: 'verify',
      label: 'Awaiting verification',
      value: pendingCount,
      onClick: () => setViewParam(verifyView ? '' : 'verify'),
      active: verifyView,
    },
  ]

  const facetPanel = (
    <FacetPanel activeCount={activeCount} onClearAll={clearAllFilters}>
      <FacetToggle
        label="Assigned to me"
        description="Yours, on assets you own, or your team's"
        checked={mineActive}
        onCheckedChange={(v) => setMineFilter(v ? 'true' : 'false')}
      />
      <FacetSection title="Severity" selectedCount={severities.length}>
        {SEVERITY_VALUES.map((v) => (
          <FacetOption
            key={v}
            label={SEVERITY_LABELS[v]}
            checked={severities.includes(v)}
            onCheckedChange={() => setSeverities(toggleIn(severities, v))}
            adornment={
              <span className={cn('size-2 shrink-0 rounded-full', SEVERITY_DOT_COLORS[v])} />
            }
          />
        ))}
      </FacetSection>
      <FacetSection
        title="Priority"
        selectedCount={priorityClasses.length + (kevActive ? 1 : 0) + (reachableActive ? 1 : 0)}
      >
        {PRIORITY_OPTIONS.map((o) => (
          <FacetOption
            key={o.value}
            label={
              <>
                {o.value} <span className="text-muted-foreground">· {o.hint}</span>
              </>
            }
            checked={priorityClasses.includes(o.value)}
            onCheckedChange={() => setPriorityParam(toggleIn(priorityClasses, o.value))}
          />
        ))}
        <FacetGroupLabel>Threat signals</FacetGroupLabel>
        <FacetOption
          label="In CISA KEV"
          checked={kevActive}
          onCheckedChange={(v) => setKevFilter(v ? 'true' : 'false')}
        />
        <FacetOption
          label="Reachable"
          checked={reachableActive}
          onCheckedChange={(v) => setReachableFilter(v ? 'true' : 'false')}
        />
      </FacetSection>
      <FacetSection title="Status" selectedCount={statuses.length}>
        {STATUS_GROUPS.map((g) => (
          <div key={g.label}>
            <FacetGroupLabel
              onSelectAll={() => setStatusParam(Array.from(new Set([...statuses, ...g.values])))}
            >
              {g.label}
            </FacetGroupLabel>
            {g.values.map((v) => (
              <FacetOption
                key={v}
                label={statusLabel(v)}
                checked={statuses.includes(v)}
                onCheckedChange={() => setStatusParam(toggleIn(statuses, v))}
              />
            ))}
          </div>
        ))}
      </FacetSection>
      <FacetSection title="SLA" selectedCount={slaFilter.length} defaultOpen={false}>
        {SLA_OPTIONS.map((v) => (
          <FacetOption
            key={v}
            label={SLA_STATUS_LABELS[v]}
            checked={slaFilter.includes(v)}
            onCheckedChange={() => toggleSla(v)}
          />
        ))}
      </FacetSection>
      <FacetSection title="Source" selectedCount={sourceFilter.length} defaultOpen={false}>
        {sourceGroups.length === 0 ? (
          <p className="py-1 text-xs text-muted-foreground">No sources yet.</p>
        ) : (
          sourceGroups.map((g) => (
            <div key={g.code}>
              <FacetGroupLabel
                onSelectAll={() =>
                  setSourceFilter(Array.from(new Set([...sourceFilter, ...g.codes])))
                }
              >
                {g.label}
              </FacetGroupLabel>
              {g.options.map((o) => (
                <FacetOption
                  key={o.value}
                  label={o.label}
                  checked={sourceFilter.includes(o.value)}
                  onCheckedChange={() => toggleSource(o.value)}
                />
              ))}
            </div>
          ))
        )}
      </FacetSection>
    </FacetPanel>
  )

  const facetPanelScrollable = <div className="flex min-h-0 flex-1 flex-col">{facetPanel}</div>

  const total = findingsResponse?.total ?? 0

  // Icon-only filter toggle; the active-filter count sits on its corner.
  const filterCountDot =
    activeCount > 0 ? (
      <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium tabular-nums text-primary-foreground">
        {activeCount}
      </span>
    ) : null
  const filterLabel = activeCount > 0 ? `Filters (${activeCount} active)` : 'Filters'
  const filterButtons = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative hidden h-9 w-9 lg:inline-flex"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-pressed={filtersOpen}
            aria-controls="finding-filters"
            aria-label={filterLabel}
          >
            {filtersOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <ListFilter className="h-4 w-4" />
            )}
            {filterCountDot}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{filtersOpen ? 'Hide filters' : 'Show filters'}</TooltipContent>
      </Tooltip>
      <Button
        variant="outline"
        size="icon"
        className="relative h-9 w-9 lg:hidden"
        onClick={() => setFilterSheetOpen(true)}
        aria-label={filterLabel}
      >
        <ListFilter className="h-4 w-4" />
        {filterCountDot}
      </Button>
    </>
  )

  const searchBox = (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search title, CVE, rule or location…"
        aria-label="Search findings"
        className="h-9 ps-9"
      />
    </div>
  )

  const groupBySelect = (
    <Select
      value={groupBy ?? 'none'}
      onValueChange={(v) => {
        setViewParam('')
        setGroupParam(v === 'none' ? '' : v)
      }}
    >
      <SelectTrigger className="h-9 w-auto gap-2 sm:min-w-36" aria-label="Group findings">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="none">Group</SelectItem>
        {GROUP_BY_DIMENSIONS.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {GROUP_BY_LABELS[d.value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const refreshButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={handleRefresh}
          disabled={statsLoading || findingsLoading}
          aria-label="Refresh"
        >
          <RefreshCw
            className={cn('h-4 w-4', (statsLoading || findingsLoading) && 'animate-spin')}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
  )

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Download className="h-4 w-4 md:me-2" />
          <span className="hidden md:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('CSV')}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('JSON')}>Export as JSON</DropdownMenuItem>
        <DropdownMenuItem disabled>Export as PDF report</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const toolbarStart = (
    <>
      {filterButtons}
      {searchBox}
    </>
  )

  const toolbarEnd = (
    <>
      {groupBySelect}
      {refreshButton}
      {exportMenu}
    </>
  )

  // Grouped view: the groups API takes severity / status / source / "mine";
  // say so when a filter it cannot apply is on, rather than silently ignore it.
  const listOnlyFilterOn =
    !!searchQuery.trim() ||
    priorityClasses.length > 0 ||
    kevActive ||
    reachableActive ||
    slaFilter.length > 0
  const standaloneToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {filterButtons}
      {listOnlyFilterOn && (
        <span className="text-xs text-muted-foreground">
          Search, priority, KEV and SLA filters apply to the ungrouped list.
        </span>
      )}
      <div className="ms-auto flex items-center gap-2">
        {groupBySelect}
        {refreshButton}
      </div>
    </div>
  )

  // "View" on a group opens the list filtered to it — where the dimension maps
  // to a list filter. Other dimensions get no View button (not a dead one).
  const viewableGroup =
    groupBy === 'cve_id' || groupBy === 'severity' || groupBy === 'source' || groupBy === 'asset_id'
  const viewGroup = (key: string) => {
    setGroupParam('')
    if (groupBy === 'cve_id') setSearchQuery(key)
    else if (groupBy === 'severity') setSeverityParam([key])
    else if (groupBy === 'source') setSourceFilter([key])
    else if (groupBy === 'asset_id') setAssetParam(key)
  }

  // Filters that arrive from elsewhere (an asset, a source, a scan) are context,
  // not facets — always shown. Facet chips only when the panel is not visible.
  const contextChips = [
    assetIdFilter && { key: 'asset', label: `Asset ${assetIdFilter.slice(0, 8)}…` },
    sourceIdFilter && { key: 'source', label: `Source ${sourceIdFilter.slice(0, 8)}…` },
    scanIdFilter && { key: 'scan', label: `Scan ${scanIdFilter.slice(0, 8)}…` },
  ].filter(Boolean) as { key: string; label: string }[]

  return (
    <>
      <Main>
        <PageHeader title="Findings">
          <Button variant="outline" size="sm" asChild>
            <Link href="/findings/approvals">
              <ClipboardList className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">Approvals</span>
            </Link>
          </Button>
          {hasPermission('findings:write') && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">Add finding</span>
            </Button>
          )}
        </PageHeader>

        <>
          <MetricStrip className="mt-5" loading={isInitialLoading} items={metrics} />

          <div className="mt-5 flex items-start">
            {/* Always mounted so opening and closing can animate: the slot's
                width (and the gap after it) eases between 0 and the card's
                width while the card fades, and the table beside it resizes in
                step. The card keeps its own width, so its contents never
                reflow mid-animation. */}
            <div
              inert={!filtersOpen}
              className={cn(
                'sticky top-4 hidden shrink-0 overflow-hidden transition-[width,margin-inline-end,opacity] duration-300 ease-in-out motion-reduce:transition-none lg:block',
                filtersOpen ? 'me-5 w-64 opacity-100' : 'me-0 w-0 opacity-0'
              )}
            >
              <aside
                id="finding-filters"
                aria-label="Finding filters"
                // A self-contained floating card, as tall as the viewport and
                // pinned while the page scrolls: its length no longer depends
                // on the table's, and long filter lists scroll inside it.
                className="flex h-[calc(100svh-7.5rem)] w-64 flex-col rounded-xl border bg-card p-4 shadow-sm"
              >
                {facetPanelScrollable}
              </aside>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              {contextChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {contextChips.map((c) => (
                    <Badge key={c.key} variant="secondary" className="gap-1.5">
                      <Filter className="h-3 w-3" />
                      {c.label}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-sm hover:bg-background/60"
                        aria-label={`Clear ${c.key} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {verifyView ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewParam('')}>
                      <ArrowLeft className="me-2 h-4 w-4" />
                      All findings
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Fixes awaiting verification, grouped by CVE
                    </span>
                  </div>
                  <PendingReviewTab />
                </div>
              ) : groupBy ? (
                <div className="space-y-3">
                  {standaloneToolbar}
                  <FindingGroupsTab
                    dimension={groupBy}
                    filters={{
                      severities: severities.join(',') || undefined,
                      statuses: statuses.join(',') || undefined,
                      sources: sourceFilter.join(',') || undefined,
                      assignedToMe: mineActive,
                    }}
                    onMarkFixed={(group) => setMarkFixedGroup(group)}
                    onViewFindings={viewableGroup ? viewGroup : undefined}
                  />
                </div>
              ) : !findingsResponse && findingsLoading ? (
                <FindingsTableSkeleton />
              ) : (
                <DataTable
                  columns={columns}
                  data={findings}
                  showSearch={false}
                  toolbarStart={toolbarStart}
                  toolbarEnd={toolbarEnd}
                  getRowId={(f) => f.id}
                  manualPagination
                  rowCount={total}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                  pageSizeOptions={PAGE_SIZES}
                  sorting={sorting}
                  onSortingChange={handleSortingChange}
                  onSelectionChange={(rows) => setSelectedFindingIds(rows.map((f) => f.id))}
                  resetSelectionKey={selectionEpoch}
                  mobileRow={(f) => (
                    <button
                      type="button"
                      onClick={() => handleRowClick(f)}
                      className="flex w-full items-start gap-3 px-3 py-3 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <SeverityBadge severity={f.severity} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{f.title}</p>
                        {(f.cve || f.scanner) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {f.cve && <span className="font-mono">{f.cve}</span>}
                            {f.cve && f.scanner && ' · '}
                            {f.scanner}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {f.priorityClass && (
                            <PriorityClassBadge priorityClass={f.priorityClass} />
                          )}
                          <FindingStatusBadge status={f.status} />
                          {f.isInKev && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              KEV
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  )}
                  showSelectionCount={false}
                  emptyMessage="No findings match these filters"
                  emptyDescription={
                    activeCount > 0 ? 'Try removing a filter or clearing them all.' : undefined
                  }
                />
              )}
            </div>
          </div>

          <BulkActionBar count={selectedCount} onClear={clearSelection}>
            <AssigneeSelect
              placeholder="Assign to…"

              onChange={(user) => {
                if (user) void handleBulkAssign(user.id)
              }}
            />

            {hasPermission('findings:remediation:write') && remediationEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openRemediationFor(selectedFindings)}
              >
                <Wrench className="me-2 h-4 w-4" />
                Remediation task
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Flag className="me-2 h-4 w-4" />
                  Status
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="center">
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
          </BulkActionBar>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetContent side="left" className="w-full gap-0 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Finding filters</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col px-4 pt-14">{facetPanel}</div>
              <div className="border-t p-4">
                <Button className="w-full" onClick={() => setFilterSheetOpen(false)}>
                  Show {total.toLocaleString()} {total === 1 ? 'finding' : 'findings'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
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
          onDone={clearSelection}
        />
      )}

      {/* Finding Quick View Drawer */}
      <FindingDetailDrawer
        finding={selectedFinding}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={refreshAfterDrawerChange}
        onSeverityChange={refreshAfterDrawerChange}
        onAssigneeChange={refreshAfterDrawerChange}
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

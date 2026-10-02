'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
  BulkActionBar,
  FacetPanel,
  FacetSection,
  FacetOption,
  type MetricStripItem,
  SeverityBadge,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  SectionTabs,
  type RowAction,
  DangerZone,
  DangerZoneItem,
  FilterPanelToggle,
  FilterSheet,
} from '@/features/shared'
import { REMEDIATION_SECTION_TABS } from '@/config/section-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import {
  Plus,
  Download,
  List,
  Columns3,
  ListTodo,
  RefreshCw,
  Pencil,
  Trash2,
  UserPlus,
  Check,
  CheckCircle,
  ArrowRight,
  X,
  Calendar,
  Copy,
  Play,
  CalendarIcon,
  Save,
  Ban,
  ExternalLink,
  Clock,
  Hash,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SEVERITY_BADGE_SOFT } from '@/lib/severity-colors'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { sanitizeExternalUrl } from '@/lib/utils'
import { Can, Permission } from '@/lib/permissions'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/features/remediation'
import {
  useRemediationCampaigns,
  useCreateRemediationCampaign,
  type RemediationCampaign,
} from '@/features/remediation/api/use-remediation-campaigns'
import { fetchAllPages } from '@/lib/api/fetch-all-pages'
import { CreateJiraEpicDialog } from '@/features/remediation/components/create-jira-epic-dialog'
import { FindingPickerPanel } from '@/features/remediation/components/finding-picker-dialog'
import { getErrorMessage } from '@/lib/api/error-handler'
import { patch, del } from '@/lib/api/client'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import { AssigneeSelect } from '@/features/findings/components/assignee-select'
import { useMembers } from '@/features/organization/api/use-members'
import { useTenant } from '@/context/tenant-provider'
import { useHashTab } from '@/hooks/use-hash-tab'
import { useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import type { TaskStatus, TaskPriority, RemediationTask } from '@/features/remediation/types'
import type { Severity } from '@/features/shared/types'
import { exportToCsv, type ExportFieldConfig } from '@/hooks/use-csv-export'

const REMEDIATION_EXPORT_FIELDS: ExportFieldConfig<RemediationTask>[] = [
  { header: 'Title', accessor: (t) => t.title },
  { header: 'Status', accessor: (t) => t.status },
  { header: 'Priority', accessor: (t) => t.priority },
  { header: 'Severity', accessor: (t) => t.severity },
  { header: 'Finding', accessor: (t) => t.findingTitle },
  { header: 'Asset', accessor: (t) => t.assetName ?? '' },
  { header: 'Assignee', accessor: (t) => t.assigneeName },
  { header: 'Due Date', accessor: (t) => t.dueDate },
  { header: 'Completed At', accessor: (t) => t.completedAt ?? '' },
]

// ─── Constants & Helpers ─────────────────────────────────────────────

interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  severity: Severity
  assigneeName: string
  assignedTo: string
  dueDate: Date | undefined
  findingIds: string[]
  estimatedHours: string
}

const emptyFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  severity: 'medium',
  assigneeName: '',
  assignedTo: '',
  dueDate: undefined,
  findingIds: [],
  estimatedHours: '',
}

// A campaign is scoped by its finding_filter. "Link to Finding" pins the task to
// one finding via the finding_ids key (backend: FindingFilter.FindingIDs), so it
// actually counts + resolves. Returns undefined when nothing is linked so the
// caller can decide: create seeds an empty scope, edit leaves the existing
// filter untouched (never silently wipes a cve/asset-scoped campaign).
function findingFilterFromForm(findingIds: string[]): Record<string, unknown> | undefined {
  const ids = findingIds.filter((id) => id && id !== 'none')
  return ids.length > 0 ? { finding_ids: ids } : undefined
}

// Task priority reuses the severity soft-tint scale (urgent reads as critical)
// rather than a private palette, so it looks like every other severity chip.
const priorityColors: Record<TaskPriority, string> = {
  urgent: SEVERITY_BADGE_SOFT.critical,
  high: SEVERITY_BADGE_SOFT.high,
  medium: SEVERITY_BADGE_SOFT.medium,
  low: SEVERITY_BADGE_SOFT.low,
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const statusVariants: Record<TaskStatus, BadgeVariant> = {
  open: 'outline',
  in_progress: 'secondary',
  review: 'secondary',
  completed: 'default',
  blocked: 'destructive',
}

interface Filters {
  priorities: TaskPriority[]
  statuses: TaskStatus[]
  assignees: string[]
}

/** Safely format a date string. Returns null if invalid. */
function safeFormatDate(
  dateStr: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Relative time ago from now. */
function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return safeFormatDate(dateStr, { month: 'short', day: 'numeric' })
}

/** Days until/overdue. */
function daysUntil(dateStr: string | null | undefined): { days: number; overdue: boolean } | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return { days: Math.abs(days), overdue: days < 0 }
}

/** Map API priority values to TaskPriority. */
function normalizePriority(value: string): TaskPriority {
  if (value === 'critical') return 'urgent'
  if (['urgent', 'high', 'medium', 'low'].includes(value)) return value as TaskPriority
  return 'medium'
}

/** Map API status values to TaskStatus. */
function normalizeStatus(value: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    active: 'in_progress',
    draft: 'open',
    paused: 'blocked',
    validating: 'review',
    completed: 'completed',
    canceled: 'completed',
  }
  return map[value] ?? (value as TaskStatus)
}

/** Get initials from name. */
function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Check if task is overdue */
function checkOverdue(task: RemediationTask): boolean {
  if (!task.dueDate || task.status === 'completed') return false
  const d = new Date(task.dueDate)
  return !isNaN(d.getTime()) && d < new Date()
}

/** Map a remediation campaign (API) to the UI task row. */
function campaignToTask(c: RemediationCampaign): RemediationTask {
  // Recover the single linked finding (if any) from the campaign's finding_filter
  // so the Edit form pre-selects it instead of defaulting to "None".
  const linkedFindingIds = (c.finding_filter?.finding_ids as string[] | undefined) ?? []
  return {
    id: c.id,
    title: c.name,
    description: c.description || '',
    status: normalizeStatus(c.status),
    priority: normalizePriority(c.priority),
    findingId: linkedFindingIds[0] ?? '',
    findingIds: linkedFindingIds,
    findingTitle: `${c.finding_count} finding${c.finding_count !== 1 ? 's' : ''} linked`,
    // Campaign priority is urgent|high|medium|low; Severity has no "urgent"
    // (an unmapped value renders as an "Unknown" badge), so map urgent→critical.
    severity: (c.priority === 'urgent' ? 'critical' : c.priority) as Severity,
    assigneeId: c.assigned_to || '',
    assigneeName: '', // resolved from the member list in the page (assigned_to is a UUID)
    validatorId: c.assigned_team || '',
    validatorName: '', // resolved from the member list in the page
    startDate: c.start_date || '',
    dueDate: c.due_date || '',
    completedAt: c.completed_at || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    finding_count: c.finding_count,
    resolved_count: c.resolved_count,
    progress: c.progress,
    is_overdue: c.is_overdue,
    tags: c.tags || [],
    ticketKey: c.ticket?.issue_key,
    ticketUrl: c.ticket?.issue_url,
  } as RemediationTask
}

/** Apply the page's quick-filter + advanced filters to a task list. Shared by
 *  the table view and the "export all" action so both agree. */
function applyTaskFilters(tasks: RemediationTask[], quickFilter: string, filters: Filters) {
  let data = [...tasks]
  if (quickFilter === 'open') data = data.filter((t) => t.status === 'open')
  else if (quickFilter === 'in_progress') data = data.filter((t) => t.status === 'in_progress')
  else if (quickFilter === 'review') data = data.filter((t) => t.status === 'review')
  else if (quickFilter === 'blocked') data = data.filter((t) => t.status === 'blocked')
  else if (quickFilter === 'overdue') data = data.filter((t) => checkOverdue(t))

  if (filters.priorities.length > 0)
    data = data.filter((t) => filters.priorities.includes(t.priority))
  if (filters.statuses.length > 0) data = data.filter((t) => filters.statuses.includes(t.status))
  if (filters.assignees.length > 0)
    data = data.filter((t) => filters.assignees.includes(t.assigneeName))
  return data
}

/** Context-aware status actions — only the transitions the campaign state
 * machine allows (draft→active→validating→completed; completed is terminal).
 * Offering illegal moves (Block on Open, Complete from In Progress, Reopen on
 * Completed) just produced backend rejection toasts. */
function getAvailableActions(status: TaskStatus) {
  switch (status) {
    case 'open': // draft → active
      return [{ action: 'start', label: 'Start Task', icon: Play, variant: 'default' as const }]
    case 'in_progress': // active → validating | paused
      // 'validating' is the CTEM verify step (fix applied, confirm it worked) —
      // NOT a hand-off to a reviewer. There is no reviewer role; the owner stays
      // the assignee. Label it as a state change, not "send to someone".
      return [
        {
          action: 'review',
          label: 'Submit for Validation',
          icon: CheckCircle,
          variant: 'default' as const,
        },
        { action: 'block', label: 'Block', icon: Ban, variant: 'outline' as const },
      ]
    case 'review': // validating → completed (no validating→active path in the domain)
      return [
        { action: 'complete', label: 'Complete', icon: CheckCircle, variant: 'default' as const },
      ]
    case 'blocked': // paused → active
      return [{ action: 'start', label: 'Unblock', icon: Play, variant: 'default' as const }]
    case 'completed': // terminal
      return []
    default:
      return []
  }
}

// ─── Main Component ──────────────────────────────────────────────────

export default function RemediationPage() {
  const router = useRouter()

  // API data
  const { data: findingsData } = useFindingsApi({
    per_page: 100,
    statuses: ['new', 'confirmed', 'in_progress'],
  })
  const findings = findingsData?.data ?? []

  const {
    data: campaignData,
    isLoading,
    error: fetchError,
    mutate: refreshCampaigns,
  } = useRemediationCampaigns()
  const { trigger: createCampaign } = useCreateRemediationCampaign()

  // Resolve assignee UUIDs → display names via the tenant member list.
  const { currentTenant } = useTenant()
  const { members } = useMembers(currentTenant?.id)
  const memberNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const mem of members) {
      if (mem.user_id) m.set(mem.user_id, mem.name || mem.email || mem.user_id)
    }
    return m
  }, [members])

  const tasks: RemediationTask[] = useMemo(() => {
    if (!campaignData?.data?.length) return []
    return campaignData.data.map((c) => {
      const t = campaignToTask(c)
      if (t.assigneeId) t.assigneeName = memberNameById.get(t.assigneeId) || t.assigneeId
      if (t.validatorId) t.validatorName = memberNameById.get(t.validatorId) || t.validatorId
      return t
    })
  }, [campaignData, memberNameById])

  // Which campaigns each finding is linked to. A finding CAN belong to more than
  // one campaign (a finding_id may appear in several campaigns' filters — there's
  // no uniqueness), so we surface the overlap in the picker rather than silently
  // splitting ownership. Maps finding_id → the campaigns that reference it.
  const findingCampaigns = useMemo(() => {
    const m = new Map<string, Array<{ id: string; name: string }>>()
    for (const c of campaignData?.data ?? []) {
      const ids = (c.finding_filter?.finding_ids as string[] | undefined) ?? []
      for (const fid of ids) {
        const arr = m.get(fid) ?? []
        arr.push({ id: c.id, name: c.name })
        m.set(fid, arr)
      }
    }
    return m
  }, [campaignData])

  // ─── Computed ────────────────────────────────────────────────────

  const stats = useMemo(
    () => ({
      total: tasks.length,
      byStatus: {
        open: tasks.filter((t) => t.status === 'open').length,
        in_progress: tasks.filter((t) => t.status === 'in_progress').length,
        review: tasks.filter((t) => t.status === 'review').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      overdue: tasks.filter((t) => checkOverdue(t)).length,
    }),
    [tasks]
  )

  // ─── State ───────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Filters live in the URL so a filtered view is shareable and survives reload
  // (matching the findings/assets pages). The hook returns plain strings; cast
  // the tuples so downstream typing stays identical.
  const [quickFilter, setQuickFilter] = useUrlFilter('quick', 'all')
  // Table/Kanban view persisted in the URL hash (survives reload).
  const [viewTab, setViewTab] = useHashTab('table')
  const [priorityFilter, setPriorityFilter] = useUrlFilterList('priority') as [
    TaskPriority[],
    (next: TaskPriority[] | ((prev: TaskPriority[]) => TaskPriority[])) => void,
  ]
  const [statusFilter, setStatusFilter] = useUrlFilterList('status') as [
    TaskStatus[],
    (next: TaskStatus[] | ((prev: TaskStatus[]) => TaskStatus[])) => void,
  ]
  const [assigneeFilter, setAssigneeFilter] = useUrlFilterList('assignee') as [
    string[],
    (next: string[] | ((prev: string[]) => string[])) => void,
  ]
  // Reassemble the Filters object the rest of the page consumes, so filtering
  // logic, activeFilterCount, and the popover checkboxes stay unchanged.
  const filters = useMemo<Filters>(
    () => ({ priorities: priorityFilter, statuses: statusFilter, assignees: assigneeFilter }),
    [priorityFilter, statusFilter, assigneeFilter]
  )
  // Filter panel is closed by default, like the Findings page.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Below lg there is no room for the side panel; the filters open in a sheet.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  // Bumped to clear the table's own checkbox state along with ours.
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const [viewTask, setViewTask] = useState<RemediationTask | null>(null)
  const [editTask, setEditTask] = useState<RemediationTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<RemediationTask | null>(null)
  const [jiraTask, setJiraTask] = useState<RemediationTask | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData)
  const [dueDateOpen, setDueDateOpen] = useState(false)

  // Keep the open drawer in sync with the latest task data (after inline edits).
  useEffect(() => {
    setViewTask((prev) => (prev ? (tasks.find((t) => t.id === prev.id) ?? prev) : prev))
  }, [tasks])

  // Inline field edit from the drawer (Jira-style): PATCH one field, refresh.
  const handleInlinePatch = useCallback(
    async (task: RemediationTask, body: Record<string, unknown>) => {
      try {
        // A finding_filter patch from the drawer only carries finding_ids. Merge it
        // into the campaign's existing filter so any dynamic scope (cve_ids, asset_id,
        // remediation_key, …) isn't silently wiped — which would corrupt a keyed
        // (Solution-Family) campaign into a plain finding-ids one.
        let payload = body
        if (body.finding_filter && typeof body.finding_filter === 'object') {
          const original = campaignData?.data?.find((c) => c.id === task.id)?.finding_filter ?? {}
          payload = {
            ...body,
            finding_filter: { ...original, ...(body.finding_filter as Record<string, unknown>) },
          }
        }
        await patch(`/api/v1/remediation/campaigns/${task.id}`, payload)
        await refreshCampaigns()
        toast.success('Task updated')
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update task'))
      }
    },
    [refreshCampaigns, campaignData]
  )

  const assignees = useMemo(
    () => [...new Set(tasks.map((t) => t.assigneeName).filter(Boolean))],
    [tasks]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.priorities.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.assignees.length > 0) count++
    return count
  }, [filters])

  const filteredData = useMemo(
    () => applyTaskFilters(tasks, quickFilter, filters),
    [tasks, quickFilter, filters]
  )

  // ─── Handlers ────────────────────────────────────────────────────

  // Export covers EVERY campaign (all pages) mapped to tasks and re-filtered by
  // the current filters — not just the loaded page (per_page=50 in the hook).
  const [isExporting, setIsExporting] = useState(false)
  const fetchAllFilteredTasks = useCallback(async (): Promise<RemediationTask[]> => {
    const campaigns = await fetchAllPages<RemediationCampaign>(
      (page, per_page) => `/api/v1/remediation/campaigns?page=${page}&per_page=${per_page}`,
      {
        onTruncated: (loaded) =>
          toast.warning(
            `Export limited to the first ${loaded.toLocaleString()} campaigns — refine filters to export the rest`
          ),
      }
    )
    // Resolve assignee/validator UUIDs → names (same as the on-screen list) so the
    // export isn't blank and an active assignee filter (which matches on name) works.
    const rows = campaigns.map((c) => {
      const t = campaignToTask(c)
      if (t.assigneeId) t.assigneeName = memberNameById.get(t.assigneeId) || t.assigneeId
      if (t.validatorId) t.validatorName = memberNameById.get(t.validatorId) || t.validatorId
      return t
    })
    return applyTaskFilters(rows, quickFilter, filters)
  }, [quickFilter, filters, memberNameById])

  const handleExportCsv = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      exportToCsv(await fetchAllFilteredTasks(), REMEDIATION_EXPORT_FIELDS, 'remediation-tasks')
    } catch {
      toast.error('Failed to export remediation tasks')
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, fetchAllFilteredTasks])

  const handleExportJson = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const all = await fetchAllFilteredTasks()
      if (!all.length) {
        toast.error('No data to export')
        return
      }
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `remediation-tasks-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${all.length} row${all.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Failed to export remediation tasks')
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, fetchAllFilteredTasks])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshCampaigns()
    setIsRefreshing(false)
    toast.success('Tasks refreshed')
  }, [refreshCampaigns])

  const handleTaskAction = useCallback(
    async (action: string, task: RemediationTask) => {
      if (action === 'view') {
        setViewTask(task)
        return
      }
      if (action === 'edit') {
        const dueDate = task.dueDate ? new Date(task.dueDate) : undefined
        setFormData({
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          severity: task.severity,
          assigneeName: task.assigneeName,
          assignedTo: task.assigneeId || '',
          dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : undefined,
          findingIds: task.findingIds ?? [],
          estimatedHours: task.estimatedHours?.toString() || '',
        })
        setEditTask(task)
        return
      }
      if (action === 'delete') {
        setDeleteTask(task)
        return
      }
      if (action === 'open_campaign') {
        router.push(`/remediation/${task.id}`)
        return
      }

      // Status transition actions → call API
      const statusMap: Record<string, string> = {
        start: 'active',
        review: 'validating',
        complete: 'completed',
        block: 'paused',
      }
      const apiStatus = statusMap[action]
      if (apiStatus) {
        try {
          await patch(`/api/v1/remediation/campaigns/${task.id}/status`, { status: apiStatus })
          await refreshCampaigns()
          // Update viewTask if it's the same one
          if (viewTask?.id === task.id) {
            const updated = campaignData?.data?.find((c) => c.id === task.id)
            if (updated) {
              setViewTask({
                ...task,
                status: normalizeStatus(updated.status),
              })
            }
          }
          toast.success('Task updated')
        } catch (err) {
          toast.error(getErrorMessage(err, `Failed to ${action} task`))
        }
      }
    },
    [router, refreshCampaigns, viewTask, campaignData]
  )

  const handleBulkAction = useCallback(
    async (action: string, value?: string) => {
      // Map "Moved" to status update API calls
      if (action === 'Moved' && value) {
        const statusMap: Record<string, string> = {
          'In Progress': 'active',
          Review: 'validating',
          Completed: 'completed',
        }
        const apiStatus = statusMap[value]
        if (apiStatus) {
          // Some selected tasks may be in a state where this transition is illegal
          // (e.g. an already-active task → "In Progress"). Don't let one rejection
          // abort the batch or skip the refresh — settle all, then report the split.
          try {
            const results = await Promise.allSettled(
              selectedIds.map((id) =>
                patch(`/api/v1/remediation/campaigns/${id}/status`, { status: apiStatus })
              )
            )
            const ok = results.filter((r) => r.status === 'fulfilled').length
            const failed = results.length - ok
            if (ok > 0 && failed === 0) {
              toast.success(`Moved ${ok} task${ok === 1 ? '' : 's'} to ${value}`)
            } else if (ok > 0) {
              toast.warning(`Moved ${ok}; ${failed} couldn't move to ${value} from their state`)
            } else {
              toast.error(`None could move to ${value} from their current state`)
            }
          } finally {
            await refreshCampaigns()
          }
        }
        setSelectedIds([])
        setSelectionEpoch((n) => n + 1)
        return
      }

      setSelectedIds([])
      setSelectionEpoch((n) => n + 1)
    },
    [selectedIds, refreshCampaigns]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTask) return
    try {
      await del(`/api/v1/remediation/campaigns/${deleteTask.id}`)
      await refreshCampaigns()
      toast.success('Task deleted', { description: deleteTask.title })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete task'))
    }
    setDeleteTask(null)
  }, [deleteTask, refreshCampaigns])

  const handleCreateTask = useCallback(async () => {
    if (!formData.title) {
      toast.error('Please fill in the title')
      return
    }
    try {
      await createCampaign({
        name: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'draft',
        due_date: formData.dueDate?.toISOString() || null,
        assigned_to: formData.assignedTo || undefined,
        tags: [],
        // Scope the task to the linked finding so it actually counts + resolves;
        // empty scope when nothing is linked.
        finding_filter: findingFilterFromForm(formData.findingIds) ?? {},
      })
      await refreshCampaigns()
      setFormData(emptyFormData)
      setIsCreateOpen(false)
      toast.success('Task created successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'))
    }
  }, [formData, createCampaign, refreshCampaigns])

  const handleEditTask = useCallback(async () => {
    if (!editTask || !formData.title) {
      toast.error('Please fill in the title')
      return
    }
    try {
      await patch(`/api/v1/remediation/campaigns/${editTask.id}`, {
        name: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.dueDate?.toISOString() || null,
        assigned_to: formData.assignedTo || '',
        finding_filter: findingFilterFromForm(formData.findingIds),
      })
      await refreshCampaigns()
      setFormData(emptyFormData)
      setEditTask(null)
      toast.success('Task updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'))
    }
  }, [editTask, formData, refreshCampaigns])

  const handleCopyId = useCallback((id: string) => {
    copyToClipboard(id)
    toast.success('Task ID copied')
  }, [])

  const handleCopyLink = useCallback((id: string) => {
    copyToClipboard(`${window.location.origin}/remediation/${id}`)
    toast.success('Link copied')
  }, [])

  const clearFilters = useCallback(() => {
    setPriorityFilter([])
    setStatusFilter([])
    setAssigneeFilter([])
    setQuickFilter('all')
  }, [setPriorityFilter, setStatusFilter, setAssigneeFilter, setQuickFilter])

  const togglePriorityFilter = useCallback(
    (priority: TaskPriority) => {
      setPriorityFilter((prev) =>
        prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
      )
    },
    [setPriorityFilter]
  )

  const toggleStatusFilter = useCallback(
    (status: TaskStatus) => {
      setStatusFilter((prev) =>
        prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
      )
    },
    [setStatusFilter]
  )

  // ─── Table Columns ─────────────────────────────────────────────────

  const columns: ColumnDef<RemediationTask>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
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
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="min-w-0 max-w-[360px]">
              <p className="font-medium truncate text-sm">{task.title}</p>
              <p className="text-xs text-muted-foreground truncate">{task.findingTitle}</p>
            </div>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => (
          <Badge variant="outline" className={`${priorityColors[row.original.priority]} text-xs`}>
            {TASK_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={statusVariants[row.original.status]} className="text-xs">
            {TASK_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'assigneeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
        cell: ({ row }) => {
          const name = row.original.assigneeName
          if (!name) {
            return <span className="text-xs text-muted-foreground">Unassigned</span>
          }
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <span className="whitespace-nowrap text-sm">{name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due date" />,
        cell: ({ row }) => {
          const task = row.original
          const formatted = safeFormatDate(task.dueDate, { month: 'short', day: 'numeric' })
          const overdue = checkOverdue(task)
          const due = daysUntil(task.dueDate)
          if (!formatted) {
            return <span className="text-xs text-muted-foreground">--</span>
          }
          return (
            <div className="flex flex-col">
              <span className={`text-sm ${overdue ? 'text-destructive font-medium' : ''}`}>
                {formatted}
              </span>
              {due && task.status !== 'completed' && (
                <span
                  className={`text-[11px] ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {due.overdue ? `${due.days}d overdue` : `${due.days}d left`}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const task = row.original
          const statusActions = getAvailableActions(task.status)
          const rowActions: RowAction[] = [
            {
              label: 'View details',
              icon: ChevronRight,
              onClick: () => handleTaskAction('view', task),
            },
            {
              label: 'Open campaign',
              icon: ExternalLink,
              onClick: () => handleTaskAction('open_campaign', task),
            },
          ]
          if (task.ticketUrl) {
            rowActions.push({
              label: `View Jira epic (${task.ticketKey})`,
              icon: ExternalLink,
              onClick: () => {
                const safeUrl = sanitizeExternalUrl(task.ticketUrl ?? '')
                if (safeUrl && safeUrl !== '#') {
                  window.open(safeUrl, '_blank', 'noopener,noreferrer')
                }
              },
            })
          } else {
            rowActions.push({
              label: 'Create Jira epic',
              icon: ExternalLink,
              onClick: () => setJiraTask(task),
              permission: Permission.RemediationWrite,
            })
          }
          statusActions.forEach(({ action, label, icon }, idx) => {
            rowActions.push({
              label,
              icon,
              onClick: () => handleTaskAction(action, task),
              separatorBefore: idx === 0,
            })
          })
          rowActions.push({
            label: 'Copy ID',
            icon: Copy,
            onClick: () => handleCopyId(task.id),
            separatorBefore: true,
          })
          rowActions.push({
            label: 'Delete',
            icon: Trash2,
            onClick: () => handleTaskAction('delete', task),
            separatorBefore: true,
            destructive: true,
            permission: Permission.RemediationWrite,
          })
          return <DataTableRowActions actions={rowActions} />
        },
      },
    ],
    [handleTaskAction, handleCopyId]
  )

  // ─── Render ────────────────────────────────────────────────────────

  const toggleQuick = (key: string) => setQuickFilter(quickFilter === key ? 'all' : key)
  const metrics: MetricStripItem[] = [
    { key: 'all', label: 'All tasks', value: stats.total },
    { key: 'open', label: 'Open', value: stats.byStatus.open },
    { key: 'in_progress', label: 'In progress', value: stats.byStatus.in_progress },
    { key: 'review', label: 'In review', value: stats.byStatus.review },
    { key: 'blocked', label: 'Blocked', value: stats.byStatus.blocked, tone: 'danger' as const },
    { key: 'overdue', label: 'Overdue', value: stats.overdue, tone: 'danger' as const },
  ].map((m) => ({
    ...m,
    onClick: () => toggleQuick(m.key),
    active: m.key === 'all' ? quickFilter === 'all' : quickFilter === m.key,
  }))

  const clearSelection = () => {
    setSelectedIds([])
    setSelectionEpoch((n) => n + 1)
  }

  const filterButton = (
    <FilterPanelToggle
      open={filtersOpen}
      onToggle={() => setFiltersOpen(!filtersOpen)}
      onOpenSheet={() => setFilterSheetOpen(true)}
      activeCount={activeFilterCount}
      controlsId="task-filters"
    />
  )

  const viewToggle = (
    <div className="flex items-center rounded-md border p-0.5" role="group" aria-label="View">
      {(
        [
          { key: 'table', label: 'Table view', icon: List },
          { key: 'kanban', label: 'Kanban view', icon: Columns3 },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <Button
              variant={viewTab === key ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewTab(key)}
              aria-label={label}
              aria-pressed={viewTab === key}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )

  const secondaryActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="me-2 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv} disabled={isExporting || tasks.length === 0}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJson} disabled={isExporting || tasks.length === 0}>
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const filterPanel = (
    <FacetPanel activeCount={activeFilterCount} onClearAll={clearFilters} className="h-full">
      <FacetSection title="Priority" selectedCount={filters.priorities.length}>
        {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
          <FacetOption
            key={p}
            label={TASK_PRIORITY_LABELS[p]}
            checked={filters.priorities.includes(p)}
            onCheckedChange={() => togglePriorityFilter(p)}
          />
        ))}
      </FacetSection>
      <FacetSection title="Status" selectedCount={filters.statuses.length}>
        {(['open', 'in_progress', 'review', 'completed', 'blocked'] as TaskStatus[]).map((st) => (
          <FacetOption
            key={st}
            label={TASK_STATUS_LABELS[st]}
            checked={filters.statuses.includes(st)}
            onCheckedChange={() => toggleStatusFilter(st)}
          />
        ))}
      </FacetSection>
      {assignees.length > 0 && (
        <FacetSection title="Assignee" selectedCount={filters.assignees.length}>
          {assignees.map((name) => (
            <FacetOption
              key={name}
              label={name}
              checked={filters.assignees.includes(name)}
              onCheckedChange={() =>
                setAssigneeFilter((prev) =>
                  prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
                )
              }
            />
          ))}
        </FacetSection>
      )}
    </FacetPanel>
  )

  return (
    <TooltipProvider>
      <Main>
        <PageHeader
          title="Remediation tasks"
          description="Track the work of fixing findings — who owns it, where it stands, and when it is due."
        >
          <Button
            size="sm"
            onClick={() => {
              setFormData(emptyFormData)
              setIsCreateOpen(true)
            }}
          >
            <Plus className="me-2 h-4 w-4" />
            New task
          </Button>
        </PageHeader>

        <SectionTabs tabs={REMEDIATION_SECTION_TABS} className="mt-4 mb-0" />

        <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

        {fetchError && !isLoading ? (
          <Alert variant="destructive" className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load tasks</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{getErrorMessage(fetchError, 'Please try again.')}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="me-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="mt-5 space-y-2">
            <Skeleton className="h-9 w-full" />
            <div className="space-y-px overflow-hidden rounded-xl border">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-none" />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-5">
            {filtersOpen && (
              <aside
                id="task-filters"
                aria-label="Task filters"
                className="sticky top-4 hidden max-h-[calc(100svh-7.5rem)] w-60 shrink-0 flex-col rounded-xl border bg-card p-4 shadow-sm lg:flex"
              >
                {filterPanel}
              </aside>
            )}

            <div className="min-w-0 flex-1">
              {viewTab === 'kanban' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {filterButton}
                    <span className="text-sm text-muted-foreground">
                      {filteredData.length} of {tasks.length} tasks
                    </span>
                    <div className="ms-auto flex items-center gap-2">
                      {viewToggle}
                      {secondaryActions}
                    </div>
                  </div>
                  {/* Five fixed-width lanes that scroll sideways inside their own frame,
                      so they stay readable when the filter panel is open. */}
                  <div className="grid auto-cols-[minmax(200px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2">
                    {(
                      ['open', 'in_progress', 'review', 'blocked', 'completed'] as TaskStatus[]
                    ).map((status) => {
                      const column = filteredData.filter((t) => t.status === status)
                      return (
                        <div key={status} className="min-w-0 space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-medium">
                              {TASK_STATUS_LABELS[status]}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {column.length}
                            </span>
                          </div>
                          <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-2">
                            {column.map((task) => {
                              const overdue = checkOverdue(task)
                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  className="block w-full rounded-lg border bg-card p-3 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => setViewTask(task)}
                                >
                                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                                    {task.title}
                                  </p>
                                  {task.findingTitle && (
                                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                      {task.findingTitle}
                                    </p>
                                  )}
                                  <div className="mt-2.5 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[9px]">
                                          {getInitials(task.assigneeName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="truncate text-[11px] text-muted-foreground">
                                        {task.assigneeName
                                          ? task.assigneeName.split(' ')[0]
                                          : 'Unassigned'}
                                      </span>
                                    </div>
                                    {task.dueDate && (
                                      <span
                                        className={`flex shrink-0 items-center gap-1 text-[11px] ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                                      >
                                        <Calendar className="h-3 w-3" />
                                        {safeFormatDate(task.dueDate, {
                                          month: 'short',
                                          day: 'numeric',
                                        }) ?? '--'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={`${priorityColors[task.priority]} text-[11px]`}
                                    >
                                      {TASK_PRIORITY_LABELS[task.priority]}
                                    </Badge>
                                    <SeverityBadge severity={task.severity} />
                                    {overdue && (
                                      <Badge variant="destructive" className="text-[11px]">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                            {column.length === 0 && (
                              <p className="py-8 text-center text-xs text-muted-foreground">
                                No tasks
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredData}
                  getRowId={(t) => t.id}
                  onRowClick={(task) => setViewTask(task)}
                  onSelectionChange={(rows) => setSelectedIds(rows.map((t) => t.id))}
                  resetSelectionKey={selectionEpoch}
                  showSelectionCount={false}
                  searchPlaceholder="Search tasks..."
                  toolbarStart={filterButton}
                  toolbarEnd={
                    <>
                      {viewToggle}
                      {secondaryActions}
                    </>
                  }
                  emptyMessage="No tasks found"
                  emptyDescription={
                    activeFilterCount > 0 || quickFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first task to get started'
                  }
                />
              )}
            </div>
          </div>
        )}

        <BulkActionBar count={selectedIds.length} onClear={clearSelection} noun="tasks selected">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowRight className="me-1.5 h-3.5 w-3.5" />
                Move to
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'In Progress')}>
                In progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'Review')}>
                Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'Completed')}>
                Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BulkActionBar>
      </Main>

      <FilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen} title="Task filters">
        {filterPanel}
      </FilterSheet>

      {/* ─── View Task Sheet ─────────────────────────────────────────── */}
      <TaskDetailSheet
        task={viewTask}
        onClose={() => setViewTask(null)}
        onDelete={(task) => {
          setViewTask(null)
          setDeleteTask(task)
        }}
        onAction={handleTaskAction}
        onPatch={handleInlinePatch}
        findings={findings}
        memberNameById={memberNameById}
        findingCampaigns={findingCampaigns}
        onCopyId={handleCopyId}
        onCopyLink={handleCopyLink}
        onOpenCampaign={(task) => router.push(`/remediation/${task.id}`)}
      />

      {/* ─── Task Form Dialog ─────────────────────────────────────────── */}
      <TaskFormDialog
        open={isCreateOpen || !!editTask}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditTask(null)
          }
        }}
        mode={editTask ? 'edit' : 'create'}
        formData={formData}
        setFormData={setFormData}
        dueDateOpen={dueDateOpen}
        setDueDateOpen={setDueDateOpen}
        findings={findings}
        onSubmit={editTask ? handleEditTask : handleCreateTask}
        onCancel={() => {
          setIsCreateOpen(false)
          setEditTask(null)
        }}
      />

      {/* ─── Delete Confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTask}
        onOpenChange={() => setDeleteTask(null)}
        title="Delete task"
        desc={
          <>
            Are you sure you want to delete &quot;{deleteTask?.title}&quot;? This action cannot be
            undone.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
      />

      <CreateJiraEpicDialog
        campaign={jiraTask ? { id: jiraTask.id, name: jiraTask.title } : null}
        onOpenChange={(open) => {
          if (!open) setJiraTask(null)
        }}
      />
    </TooltipProvider>
  )
}

// ─── Task Detail Sheet ───────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: RemediationTask | null
  onClose: () => void
  onDelete: (task: RemediationTask) => void
  onAction: (action: string, task: RemediationTask) => void
  onPatch: (task: RemediationTask, body: Record<string, unknown>) => void | Promise<void>
  findings: Array<{
    id: string
    title?: string
    message?: string
    severity?: Severity
    status?: string
    asset?: { name: string; type: string }
    assigned_to?: string
    assigned_to_user?: { name: string }
  }>
  /** UUID → display-name map so finding assignees render as names, not UUIDs. */
  memberNameById: Map<string, string>
  /** finding_id → campaigns that already reference it (to flag cross-linking). */
  findingCampaigns: Map<string, Array<{ id: string; name: string }>>
  onCopyId: (id: string) => void
  onCopyLink: (id: string) => void
  onOpenCampaign: (task: RemediationTask) => void
}

function TaskDetailSheet({
  task,
  onClose,
  onDelete,
  onAction,
  onPatch,
  findings,
  memberNameById,
  findingCampaigns,
  onCopyId,
  onCopyLink,
  onOpenCampaign,
}: TaskDetailSheetProps) {
  // Inline title/description editing state — hooks must run unconditionally,
  // before the early null-return below.
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task?.title ?? '')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(task?.description ?? '')
  const [dueOpen, setDueOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  if (!task) {
    return (
      <Sheet open={false}>
        <SheetContent>
          <VisuallyHidden>
            <SheetTitle>Task</SheetTitle>
          </VisuallyHidden>
        </SheetContent>
      </Sheet>
    )
  }

  const overdue = checkOverdue(task)
  const due = daysUntil(task.dueDate)
  const actions = getAvailableActions(task.status)

  const saveTitle = () => {
    setEditingTitle(false)
    const v = titleDraft.trim()
    if (v && v !== task.title) onPatch(task, { name: v })
    else setTitleDraft(task.title)
  }
  const saveDesc = () => {
    setEditingDesc(false)
    if (descDraft !== (task.description || '')) onPatch(task, { description: descDraft })
  }

  // Get progress from API data or estimate from status
  const taskProgress =
    (task as unknown as Record<string, unknown>).progress != null
      ? Number((task as unknown as Record<string, unknown>).progress)
      : task.status === 'completed'
        ? 100
        : task.status === 'review'
          ? 75
          : task.status === 'in_progress'
            ? 50
            : 0

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent
        className="sm:max-w-lg p-0 overflow-y-auto [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Task Details</SheetTitle>
        </VisuallyHidden>

        {/* Findings picker: an INLINE view that replaces the drawer body (not an
            overlay/portal/fixed panel) so it touch-scrolls via the Sheet's own
            overflow-y-auto. The details below are hidden while it's open. */}
        {manageOpen && (
          <FindingPickerPanel
            onClose={() => setManageOpen(false)}
            selectedIds={task.findingIds ?? []}
            onToggle={(findingId, next) =>
              onPatch(task, {
                finding_filter: {
                  finding_ids: next
                    ? [...(task.findingIds ?? []), findingId]
                    : (task.findingIds ?? []).filter((id) => id !== findingId),
                },
              })
            }
            findingCampaigns={findingCampaigns}
            currentCampaignId={task.id}
            memberNameById={memberNameById}
          />
        )}

        <div className={manageOpen ? 'hidden' : undefined}>
          {/* ── Header ── */}
          <div className="p-5 border-b bg-muted/30">
            {/* Toolbar: title left, actions right */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Task details</p>
              <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onCopyId(task.id)}
                    >
                      <Hash className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Copy ID</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onCopyLink(task.id)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Copy link</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onOpenCampaign(task)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Open campaign</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Title (click to edit inline) */}
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') {
                    setTitleDraft(task.title)
                    setEditingTitle(false)
                  }
                }}
                className="h-7 text-base font-semibold"
              />
            ) : (
              <h2
                className="text-base font-semibold leading-tight cursor-text rounded px-1 -mx-1 hover:bg-muted/50"
                onClick={() => {
                  setTitleDraft(task.title)
                  setEditingTitle(true)
                }}
              >
                {task.title}
              </h2>
            )}
            <p className="text-xs text-muted-foreground mt-1">{task.findingTitle}</p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    className={`${priorityColors[task.priority]} text-xs h-5 cursor-pointer`}
                    title="Change priority"
                  >
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => onPatch(task, { priority: p })}>
                      {TASK_PRIORITY_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge variant={statusVariants[task.status]} className="text-xs h-5">
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
              <SeverityBadge severity={task.severity} />
              {overdue && (
                <Badge variant="destructive" className="text-xs h-5">
                  <AlertCircle className="me-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="p-5 space-y-4">
            {/* Key info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                icon={<UserPlus className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Assignee"
              >
                {/* Inline edit (Jira-style): pick a member → PATCH assigned_to. */}
                <AssigneeSelect
                  variant="ghost"
                  showFullName
                  placeholder="Assign"
                  value={
                    task.assigneeId
                      ? { id: task.assigneeId, name: task.assigneeName || 'Assigned' }
                      : null
                  }
                  onChange={(user) => onPatch(task, { assigned_to: user?.id ?? '' })}
                />
              </InfoCard>

              <InfoCard
                icon={<Play className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Start Date"
              >
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-start rounded px-1 -mx-1 hover:bg-muted/50">
                      <span className="text-sm font-medium">
                        {safeFormatDate(task.startDate, { month: 'short', day: 'numeric' }) ??
                          'Auto on start'}
                      </span>
                      {!task.startDate && (
                        <span className="text-[11px] text-muted-foreground block">
                          set when work begins
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={task.startDate ? new Date(task.startDate) : undefined}
                      onSelect={(date) => {
                        setStartOpen(false)
                        if (date) onPatch(task, { start_date: date.toISOString() })
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </InfoCard>

              <InfoCard
                icon={
                  <Calendar
                    className={`h-3.5 w-3.5 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                  />
                }
                label="Due date"
              >
                <Popover open={dueOpen} onOpenChange={setDueOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-start rounded px-1 -mx-1 hover:bg-muted/50">
                      <span className={`text-sm font-medium ${overdue ? 'text-destructive' : ''}`}>
                        {safeFormatDate(task.dueDate, { month: 'short', day: 'numeric' }) ??
                          'Set date'}
                      </span>
                      {due && task.status !== 'completed' && (
                        <span
                          className={`text-[11px] block ${due.overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {due.overdue ? `${due.days}d overdue` : `${due.days}d remaining`}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={(date) => {
                        setDueOpen(false)
                        onPatch(task, { due_date: date ? date.toISOString() : null })
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </InfoCard>

              {/* Validator (assigned_team) — the person who verifies the fix. Shown
                once the task is in validation, so the fixer and the verifier are
                explicitly different people (segregation of duties). */}
              {task.status === 'review' && (
                <InfoCard
                  icon={<CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                  label="Validator"
                >
                  <AssigneeSelect
                    variant="ghost"
                    showFullName
                    placeholder="Assign validator"
                    value={
                      task.validatorId
                        ? { id: task.validatorId, name: task.validatorName || 'Assigned' }
                        : null
                    }
                    onChange={(user) => onPatch(task, { assigned_team: user?.id ?? '' })}
                  />
                </InfoCard>
              )}
            </div>

            {/* Description (click to edit inline) */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              {editingDesc ? (
                <Textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={saveDesc}
                  className="min-h-[80px] text-sm"
                />
              ) : (
                <p
                  className="text-sm leading-relaxed bg-muted/30 rounded-lg p-3 cursor-text hover:bg-muted/50"
                  onClick={() => {
                    setDescDraft(task.description || '')
                    setEditingDesc(true)
                  }}
                >
                  {task.description || (
                    <span className="text-muted-foreground">Add a description…</span>
                  )}
                </p>
              )}
            </div>

            {/* Linked Findings — a task can cover many; view + manage inline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Linked Findings ({task.findingIds?.length ?? 0})
                </p>
                {/* A standalone modal (not a Popover nested in the drawer Sheet) so the
                  list scrolls reliably on touch — nested Radix portals broke iOS scroll. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setManageOpen(true)}
                >
                  <Plus className="me-1 h-3 w-3" /> Manage
                </Button>
              </div>
              {(task.findingIds?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">No findings linked yet.</p>
              ) : (
                <div className="space-y-1">
                  {(task.findingIds ?? []).map((id) => {
                    const f = findings.find((x) => x.id === id)
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{f ? f.title || f.message : id}</span>
                          <span className="text-muted-foreground flex items-center gap-2 truncate text-[10px]">
                            {f?.asset?.name && <span className="truncate">{f.asset.name}</span>}
                            {f?.assigned_to ? (
                              <span className="flex shrink-0 items-center gap-0.5">
                                <UserPlus className="h-2.5 w-2.5" />
                                {memberNameById.get(f.assigned_to) ||
                                  f.assigned_to_user?.name ||
                                  'Assigned'}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Unlink finding"
                          onClick={() =>
                            onPatch(task, {
                              finding_filter: {
                                finding_ids: (task.findingIds ?? []).filter((x) => x !== id),
                              },
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Progress</p>
                <span className="text-xs font-medium tabular-nums">{taskProgress}%</span>
              </div>
              <Progress value={taskProgress} className="h-1.5" />
            </div>

            <Separator />

            {/* Status Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Actions</p>
              <div className="flex flex-wrap gap-2">
                {actions.map(({ action, label, icon: Icon, variant }) => (
                  <Button
                    key={action}
                    variant={variant}
                    size="sm"
                    className="h-8"
                    onClick={() => onAction(action, task)}
                  >
                    <Icon className="me-1.5 h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                icon={<Hash className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Task ID"
              >
                <p className="font-mono text-[11px] truncate">{task.id}</p>
              </InfoCard>
              <InfoCard
                icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Created"
              >
                <p className="text-sm">
                  {safeFormatDate(task.createdAt, { month: 'short', day: 'numeric' }) ?? '--'}
                </p>
                {task.createdAt && (
                  <p className="text-[11px] text-muted-foreground">{timeAgo(task.createdAt)}</p>
                )}
              </InfoCard>
            </div>

            <Can permission={Permission.RemediationWrite}>
              <DangerZone as="h3">
                <DangerZoneItem
                  title="Delete task"
                  description="Permanently remove this task."
                  action={
                    <Button variant="destructive" size="sm" onClick={() => onDelete(task)}>
                      <Trash2 className="me-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  }
                />
              </DangerZone>
            </Can>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Small info card used in detail sheet */
function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Task Form Dialog ────────────────────────────────────────────────

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  formData: TaskFormData
  setFormData: (data: TaskFormData) => void
  dueDateOpen: boolean
  setDueDateOpen: (open: boolean) => void
  findings: Array<{ id: string; title?: string; message?: string; severity?: Severity }>
  onSubmit: () => void
  onCancel: () => void
}

function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  formData,
  setFormData,
  dueDateOpen,
  setDueDateOpen,
  findings,
  onSubmit,
  onCancel,
}: TaskFormDialogProps) {
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
            {isEdit ? 'Edit Task' : 'Create Task'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update task information' : 'Create a new remediation task'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs">
              Title *
            </Label>
            <Input
              id="task-title"
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="task-desc"
              placeholder="Task description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          {/* Only fields the backend actually persists are shown. Severity
              (derived from priority), Estimated Hours (no column), and the free-
              text Assignee (broken end-to-end — empty picker, dropped on save,
              never returned) were removed; a real assignee picker is a follow-up. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-start font-normal h-9"
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => {
                      setFormData({ ...formData, dueDate: date })
                      setDueDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assignee</Label>
            <div>
              <AssigneeSelect
                variant="outline"
                showFullName
                placeholder="Assign to…"
                value={
                  formData.assignedTo
                    ? { id: formData.assignedTo, name: formData.assigneeName || 'Assigned' }
                    : null
                }
                onChange={(user) =>
                  setFormData({
                    ...formData,
                    assignedTo: user?.id ?? '',
                    assigneeName: user?.name ?? '',
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">
              Link Findings
              {formData.findingIds.length > 0 ? ` (${formData.findingIds.length})` : ''}
            </Label>
            {/* A remediation task can cover MANY findings (one fix → many). Multi-
                select → finding_filter.finding_ids (backend counts + resolves all). */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full justify-between font-normal"
                  type="button"
                >
                  <span className="truncate">
                    {formData.findingIds.length === 0
                      ? 'Select findings…'
                      : `${formData.findingIds.length} finding${formData.findingIds.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                <div className="max-h-64 overflow-y-auto">
                  {findings.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">No findings available</p>
                  ) : (
                    findings.map((f) => {
                      const checked = formData.findingIds.includes(f.id)
                      return (
                        <button
                          key={f.id}
                          type="button"
                          className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-muted"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              findingIds: checked
                                ? formData.findingIds.filter((id) => id !== f.id)
                                : [...formData.findingIds, f.id],
                            })
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                              checked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input'
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="line-clamp-2">{f.title || f.message || f.id}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            {isEdit ? (
              <>
                <Save className="me-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="me-2 h-4 w-4" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

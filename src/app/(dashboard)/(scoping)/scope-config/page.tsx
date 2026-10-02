'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableRowActions,
  EmptyState,
  MetricStrip,
  type MetricStripItem,
} from '@/features/shared'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { useUrlFilter, useUrlFilterNumber } from '@/hooks/use-url-param'
import { cn } from '@/lib/utils'
import { Can, Permission, useHasPermission } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsCount } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Globe,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Server,
  Code,
  Cloud,
  GitBranch,
  Target,
  Ban,
  Play,
  Search as SearchIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
  Database,
  Box,
  Mail,
  Folder,
  Link,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  type ScopeTargetType,
  type ScanType,
  type ScanFrequency,
  getScopeTypeConfig,
  // API hooks
  useScopeTargetsApi,
  useScopeExclusionsApi,
  useScanSchedulesApi,
  useScopeStatsApi,
  useCreateScopeTargetApi,
  useUpdateScopeTargetApi,
  useDeleteScopeTargetApi,
  useCreateScopeExclusionApi,
  useUpdateScopeExclusionApi,
  useDeleteScopeExclusionApi,
  useCreateScanScheduleApi,
  useUpdateScanScheduleApi,
  useDeleteScanScheduleApi,
  invalidateScopeCache,
  invalidateScopeTargetsCache,
  invalidateScopeExclusionsCache,
  invalidateScanSchedulesCache,
  invalidateScopeStatsCache,
  // API types
  type ApiScopeTarget,
  type ApiScopeExclusion,
  type ApiScanSchedule,
} from '@/features/scope'
import { post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'

const OVERVIEW_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f97316',
  '#ef4444',
  '#eab308',
]

// Use shared validation from scope feature types
const validatePattern = (
  type: ScopeTargetType,
  pattern: string
): { valid: boolean; error?: string } => {
  if (!pattern.trim()) {
    return { valid: false, error: 'Pattern is required' }
  }

  const config = getScopeTypeConfig(type)
  if (!config) {
    return { valid: true } // Allow if no config (generic type)
  }

  if (!config.validation.pattern.test(pattern)) {
    return { valid: false, error: config.validation.message }
  }

  // Additional IP validation
  if (type === 'ip_range' || type === 'ip_address') {
    const ipPart = pattern.split('/')[0]
    const octets = ipPart.split('.').map(Number)
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
      return { valid: false, error: 'IP octets must be between 0-255' }
    }
    if (pattern.includes('/')) {
      const cidr = parseInt(pattern.split('/')[1])
      if (isNaN(cidr) || cidr < 0 || cidr > 32) {
        return { valid: false, error: 'CIDR must be between 0-32' }
      }
    }
  }

  return { valid: true }
}

// Extended icon mapping for all scope target types
const targetTypeIcons: Record<string, React.ReactNode> = {
  // Network & External
  domain: <Globe className="h-4 w-4" />,
  subdomain: <Globe className="h-4 w-4" />,
  ip_address: <Server className="h-4 w-4" />,
  ip_range: <Server className="h-4 w-4" />,
  certificate: <Shield className="h-4 w-4" />,
  // Applications
  api: <Code className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  mobile_app: <Box className="h-4 w-4" />,
  // Cloud
  cloud_account: <Cloud className="h-4 w-4" />,
  cloud_resource: <Cloud className="h-4 w-4" />,
  // Infrastructure
  database: <Database className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
  host: <Server className="h-4 w-4" />,
  network: <Link className="h-4 w-4" />,
  // Code & CI/CD
  project: <GitBranch className="h-4 w-4" />,
  repository: <GitBranch className="h-4 w-4" />,
  // Generic
  path: <Folder className="h-4 w-4" />,
  email_domain: <Mail className="h-4 w-4" />,
}

// Type categories for grouped dropdown
const targetTypeCategories = [
  {
    label: 'Network & External',
    types: ['domain', 'subdomain', 'ip_address', 'ip_range', 'certificate'],
  },
  {
    label: 'Applications',
    types: ['api', 'website', 'mobile_app'],
  },
  {
    label: 'Cloud',
    types: ['cloud_account', 'cloud_resource'],
  },
  {
    label: 'Infrastructure',
    types: ['database', 'container', 'host', 'network'],
  },
  {
    label: 'Code & CI/CD',
    types: ['repository'],
  },
  {
    label: 'Other',
    types: ['path', 'email_domain'],
  },
]

const scanTypeLabels: Record<string, string> = {
  vulnerability: 'Vulnerability',
  port_scan: 'Port scan',
  pentest: 'Pentest',
  credential: 'Credential',
  secret_scan: 'Secret scan',
  compliance: 'Compliance',
  configuration: 'Config audit',
}

const SCOPE_TABS = ['overview', 'targets', 'exclusions', 'schedules'] as const
type ScopeTab = (typeof SCOPE_TABS)[number]
const PAGE_SIZES = [10, 20, 30, 50, 100]

export default function ScopeConfigPage() {
  // Permission check for write operations
  const canWriteScope = useHasPermission(Permission.ScopeWrite)

  // Dashboard stats for Overview tab
  const { currentTenant } = useTenant()
  const { stats: dashboardStats, isLoading: dashboardLoading } = useDashboardStats(
    currentTenant?.id || null
  )

  const assetTypeData = useMemo(() => {
    return Object.entries(dashboardStats.assets.byType).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
      color: OVERVIEW_COLORS[index % OVERVIEW_COLORS.length],
    }))
  }, [dashboardStats.assets.byType])

  const assetStatusData = useMemo(() => {
    return Object.entries(dashboardStats.assets.byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [dashboardStats.assets.byStatus])

  // Tab, search, type filter and page live in the URL so a view can be linked
  // to. One set of list params serves whichever table tab is open (they are
  // cleared on tab change), and each API call only receives them for its own tab
  // so the other tabs' counts stay unfiltered.
  const [tabParam, setTabParam] = useUrlFilter('tab', 'overview')
  const tab: ScopeTab = (SCOPE_TABS as readonly string[]).includes(tabParam)
    ? (tabParam as ScopeTab)
    : 'overview'
  const [searchParam, setSearchParam] = useUrlFilter('q', '')
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all')
  const [page, setPage] = useUrlFilterNumber('page', 1)
  const [perPageParam, setPerPage] = useUrlFilterNumber('per_page', 20)
  const perPage = PAGE_SIZES.includes(perPageParam) ? perPageParam : 20
  const [searchValue, setSearchValue] = useState(searchParam)
  const debouncedSearch = useDebounce(searchValue, 300)
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      setSearchParam(debouncedSearch)
      setPage(1)
    }
    // Only react to the debounced input, not to URL writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const selectTab = (next: string) => {
    if (next === tab) return
    setSearchValue('')
    setSearchParam('')
    setTypeFilter('all')
    setPage(1)
    setTabParam(next)
  }
  const setTypeFilterAndReset = (v: string) => {
    setTypeFilter(v)
    setPage(1)
  }
  const listParams = (forTab: ScopeTab) =>
    tab === forTab
      ? { search: searchParam || undefined, type: typeFilter !== 'all' ? typeFilter : undefined }
      : { search: undefined, type: undefined }
  const targetParams = listParams('targets')
  const exclusionParams = listParams('exclusions')
  const scheduleParams = listParams('schedules')

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null)

  // Dialog states
  const [isAddTargetOpen, setIsAddTargetOpen] = useState(false)
  const [isAddExclusionOpen, setIsAddExclusionOpen] = useState(false)
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApiScopeTarget | null>(null)
  const [editExclusion, setEditExclusion] = useState<ApiScopeExclusion | null>(null)
  const [editSchedule, setEditSchedule] = useState<ApiScanSchedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiScopeTarget | null>(null)
  const [deleteExclusion, setDeleteExclusion] = useState<ApiScopeExclusion | null>(null)
  const [deleteSchedule, setDeleteSchedule] = useState<ApiScanSchedule | null>(null)

  // Form states
  const [targetForm, setTargetForm] = useState({
    type: 'domain' as ScopeTargetType,
    pattern: '',
    description: '',
    priority: 0,
    tags: [] as string[],
  })

  const [exclusionForm, setExclusionForm] = useState({
    type: 'domain' as ScopeTargetType,
    pattern: '',
    reason: '',
  })

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    type: 'vulnerability' as ScanType,
    targets: '',
    frequency: 'daily' as ScanFrequency,
    time: '',
  })

  // API hooks for fetching data (using debounced search values)
  const { data: targetsData, isLoading: targetsLoading } = useScopeTargetsApi({
    search: targetParams.search,
    target_type: targetParams.type,
    page: tab === 'targets' ? page : 1,
    per_page: tab === 'targets' ? perPage : 20,
  })

  const { data: exclusionsData, isLoading: exclusionsLoading } = useScopeExclusionsApi({
    search: exclusionParams.search,
    exclusion_type: exclusionParams.type,
    page: tab === 'exclusions' ? page : 1,
    per_page: tab === 'exclusions' ? perPage : 20,
  })

  const { data: schedulesData, isLoading: schedulesLoading } = useScanSchedulesApi({
    search: scheduleParams.search,
    scan_type: scheduleParams.type as ScanType | undefined,
    page: tab === 'schedules' ? page : 1,
    per_page: tab === 'schedules' ? perPage : 20,
  })

  const { data: statsData, isLoading: statsLoading } = useScopeStatsApi()

  // Mutation hooks
  const { trigger: createTarget, isMutating: isCreatingTarget } = useCreateScopeTargetApi()
  const { trigger: updateTarget, isMutating: isUpdatingTarget } = useUpdateScopeTargetApi(
    editTarget?.id || ''
  )
  const { trigger: removeTarget, isMutating: isRemovingTarget } = useDeleteScopeTargetApi(
    deleteTarget?.id || ''
  )

  const { trigger: createExclusion, isMutating: isCreatingExclusion } = useCreateScopeExclusionApi()
  const { trigger: updateExclusion, isMutating: isUpdatingExclusion } = useUpdateScopeExclusionApi(
    editExclusion?.id || ''
  )
  const { trigger: removeExclusion, isMutating: isRemovingExclusion } = useDeleteScopeExclusionApi(
    deleteExclusion?.id || ''
  )

  const { trigger: createSchedule, isMutating: isCreatingSchedule } = useCreateScanScheduleApi()
  const { trigger: updateScheduleApi, isMutating: isUpdatingSchedule } = useUpdateScanScheduleApi(
    editSchedule?.id || ''
  )
  const { trigger: removeSchedule, isMutating: isRemovingSchedule } = useDeleteScanScheduleApi(
    deleteSchedule?.id || ''
  )

  // Extracted data - memoized for stable references
  const targets = useMemo(() => targetsData?.data || [], [targetsData?.data])
  const exclusions = useMemo(() => exclusionsData?.data || [], [exclusionsData?.data])
  const schedules = useMemo(() => schedulesData?.data || [], [schedulesData?.data])

  // Stats (with fallback to 0 for undefined values)
  const stats = useMemo(() => {
    if (statsData) {
      return {
        targets: statsData.total_targets ?? 0,
        activeTargets: statsData.active_targets ?? 0,
        exclusions: statsData.total_exclusions ?? 0,
        activeSchedules: statsData.enabled_schedules ?? 0,
        coverage: statsData.coverage ?? 0,
      }
    }
    // Fallback when stats API hasn't loaded yet.
    //
    // Use API totals (targetsData?.total etc) instead of array .length so the
    // numbers don't drop to "current page count" while statsData is loading.
    // Active/enabled counts are still derived from the loaded page because we
    // don't have a per-status breakdown without statsData; this is a brief
    // loading-state fallback only — once statsData arrives the branch above
    // takes over with authoritative numbers.
    return {
      targets: targetsData?.total ?? 0,
      activeTargets: targets.filter((t) => t.status === 'active').length,
      exclusions: exclusionsData?.total ?? 0,
      activeSchedules: schedules.filter((s) => s.enabled).length,
      coverage:
        targetsData?.total && targetsData.total > 0
          ? Math.round(
              (targets.filter((t) => t.status === 'active').length / targetsData.total) * 100
            )
          : 0,
    }
  }, [statsData, targetsData, exclusionsData, targets, schedules])

  // Duplicate check helpers
  const checkDuplicateTarget = useCallback(
    (pattern: string, excludeId?: string): boolean => {
      return targets.some((t) => t.pattern === pattern && t.id !== excludeId)
    },
    [targets]
  )

  const checkDuplicateExclusion = useCallback(
    (pattern: string, excludeId?: string): boolean => {
      return exclusions.some((e) => e.pattern === pattern && e.id !== excludeId)
    },
    [exclusions]
  )

  // Toggle target status using activate/deactivate endpoints
  const toggleTargetStatus = async (target: ApiScopeTarget) => {
    try {
      const action = target.status === 'active' ? 'deactivate' : 'activate'
      await post<ApiScopeTarget>(`/api/v1/scope/targets/${target.id}/${action}`)
      await invalidateScopeTargetsCache()
      await invalidateScopeStatsCache()
      toast.success(`Target ${action}d successfully`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update target status'))
    }
  }

  // Toggle exclusion status using activate/deactivate endpoints
  const toggleExclusionStatus = async (exclusion: ApiScopeExclusion) => {
    try {
      const action = exclusion.status === 'active' ? 'deactivate' : 'activate'
      await post<ApiScopeExclusion>(`/api/v1/scope/exclusions/${exclusion.id}/${action}`)
      await invalidateScopeExclusionsCache()
      await invalidateScopeStatsCache()
      toast.success(`Exclusion ${action}d successfully`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update exclusion status'))
    }
  }

  // Toggle schedule status using enable/disable endpoints
  const toggleScheduleStatus = async (schedule: ApiScanSchedule) => {
    try {
      const action = schedule.enabled ? 'disable' : 'enable'
      await post<ApiScanSchedule>(`/api/v1/scope/schedules/${schedule.id}/${action}`)
      await invalidateScanSchedulesCache()
      await invalidateScopeStatsCache()
      toast.success(`Schedule ${action}d successfully`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update schedule status'))
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Target handlers
  const resetTargetForm = () => {
    setTargetForm({ type: 'domain', pattern: '', description: '', priority: 0, tags: [] })
    setValidationError(null)
  }

  const handleAddTarget = async () => {
    // Validate pattern format
    const validation = validatePattern(targetForm.type, targetForm.pattern)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid pattern')
      return
    }

    // Check for duplicates
    if (checkDuplicateTarget(targetForm.pattern)) {
      setValidationError('This pattern already exists in targets')
      return
    }

    try {
      const result = await createTarget({
        target_type: targetForm.type,
        pattern: targetForm.pattern,
        description: targetForm.description,
      })
      await invalidateScopeCache()
      toast.success('Target added successfully')
      // Show overlap warnings if any
      const warnings = (result as unknown as { warnings?: string[] })?.warnings
      if (warnings && warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w))
      }
      setIsAddTargetOpen(false)
      resetTargetForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add target'))
    }
  }

  const handleEditTarget = async () => {
    if (!editTarget) return

    // Validate pattern format
    const validation = validatePattern(targetForm.type, targetForm.pattern)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid pattern')
      return
    }

    // Check for duplicates (exclude current target)
    if (checkDuplicateTarget(targetForm.pattern, editTarget.id)) {
      setValidationError('This pattern already exists in targets')
      return
    }

    try {
      await updateTarget({
        description: targetForm.description,
        priority: targetForm.priority,
        tags: targetForm.tags,
      })
      await invalidateScopeCache()
      toast.success('Target updated successfully')
      setEditTarget(null)
      resetTargetForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update target'))
    }
  }

  const handleDeleteTarget = async () => {
    if (!deleteTarget) return
    try {
      await removeTarget()
      await invalidateScopeCache()
      toast.success('Target removed successfully')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove target'))
    }
  }

  const openEditTarget = (target: ApiScopeTarget) => {
    setTargetForm({
      type: (target.target_type ?? '') as ScopeTargetType,
      pattern: target.pattern ?? '',
      description: target.description ?? '',
      priority: target.priority ?? 0,
      tags: target.tags ?? [],
    })
    setEditTarget(target)
  }

  // Exclusion handlers
  const resetExclusionForm = () => {
    setExclusionForm({ type: 'domain', pattern: '', reason: '' })
    setValidationError(null)
  }

  const handleAddExclusion = async () => {
    // Validate pattern format
    const validation = validatePattern(exclusionForm.type, exclusionForm.pattern)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid pattern')
      return
    }

    // Check for duplicates
    if (checkDuplicateExclusion(exclusionForm.pattern)) {
      setValidationError('This pattern already exists in exclusions')
      return
    }

    try {
      await createExclusion({
        exclusion_type: exclusionForm.type,
        pattern: exclusionForm.pattern,
        reason: exclusionForm.reason,
      })
      await invalidateScopeCache()
      toast.success('Exclusion added successfully')
      setIsAddExclusionOpen(false)
      resetExclusionForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add exclusion'))
    }
  }

  const handleEditExclusion = async () => {
    if (!editExclusion) return

    // Validate pattern format
    const validation = validatePattern(exclusionForm.type, exclusionForm.pattern)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid pattern')
      return
    }

    // Check for duplicates (exclude current exclusion)
    if (checkDuplicateExclusion(exclusionForm.pattern, editExclusion.id)) {
      setValidationError('This pattern already exists in exclusions')
      return
    }

    try {
      await updateExclusion({
        reason: exclusionForm.reason,
      })
      await invalidateScopeCache()
      toast.success('Exclusion updated successfully')
      setEditExclusion(null)
      resetExclusionForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update exclusion'))
    }
  }

  const handleDeleteExclusion = async () => {
    if (!deleteExclusion) return
    try {
      await removeExclusion()
      await invalidateScopeCache()
      toast.success('Exclusion removed successfully')
      setDeleteExclusion(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove exclusion'))
    }
  }

  const openEditExclusion = (exclusion: ApiScopeExclusion) => {
    setExclusionForm({
      type: (exclusion.exclusion_type ?? '') as ScopeTargetType,
      pattern: exclusion.pattern ?? '',
      reason: exclusion.reason ?? '',
    })
    setEditExclusion(exclusion)
  }

  // Schedule handlers
  const resetScheduleForm = () => {
    setScheduleForm({ name: '', type: 'vulnerability', targets: '', frequency: 'daily', time: '' })
  }

  // Map frontend frequency to backend schedule type and params
  const mapFrequencyToSchedule = (
    frequency: ScanFrequency
  ): { schedule_type: string; cron_expression?: string; interval_hours?: number } => {
    switch (frequency) {
      case 'hourly':
        return { schedule_type: 'interval', interval_hours: 1 }
      case 'daily':
        return { schedule_type: 'cron', cron_expression: '0 2 * * *' }
      case 'weekly':
        return { schedule_type: 'cron', cron_expression: '0 3 * * 0' }
      case 'monthly':
        return { schedule_type: 'cron', cron_expression: '0 4 1 * *' }
      case 'quarterly':
        return { schedule_type: 'cron', cron_expression: '0 4 1 */3 *' }
      case 'continuous':
        return { schedule_type: 'interval', interval_hours: 0 }
      case 'on_commit':
      case 'on_demand':
      default:
        return { schedule_type: 'cron', cron_expression: '' }
    }
  }

  const handleAddSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.targets) {
      toast.error('Please fill in required fields')
      return
    }

    const scheduleParams = mapFrequencyToSchedule(scheduleForm.frequency)

    try {
      await createSchedule({
        name: scheduleForm.name,
        scan_type: scheduleForm.type,
        target_tags: scheduleForm.targets.split(',').map((t) => t.trim()),
        ...scheduleParams,
      })
      await invalidateScopeCache()
      toast.success('Schedule created successfully')
      setIsAddScheduleOpen(false)
      resetScheduleForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create schedule'))
    }
  }

  const handleEditSchedule = async () => {
    if (!editSchedule || !scheduleForm.name || !scheduleForm.targets) {
      toast.error('Please fill in required fields')
      return
    }

    const scheduleParams = mapFrequencyToSchedule(scheduleForm.frequency)

    try {
      await updateScheduleApi({
        name: scheduleForm.name,
        target_tags: scheduleForm.targets.split(',').map((t) => t.trim()),
        ...scheduleParams,
      })
      await invalidateScopeCache()
      toast.success('Schedule updated successfully')
      setEditSchedule(null)
      resetScheduleForm()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update schedule'))
    }
  }

  const handleDeleteSchedule = async () => {
    if (!deleteSchedule) return
    try {
      await removeSchedule()
      await invalidateScopeCache()
      toast.success('Schedule deleted successfully')
      setDeleteSchedule(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete schedule'))
    }
  }

  // Reverse of mapFrequencyToSchedule: derive the form's frequency from the
  // stored schedule so opening an existing schedule shows its real cadence.
  // Previously this was hardcoded to 'daily', so editing (and re-saving) any
  // weekly/monthly/… schedule silently overwrote its cron with the daily cron.
  const mapScheduleToFrequency = (schedule: ApiScanSchedule): ScanFrequency => {
    if (schedule.schedule_type === 'interval') {
      return schedule.interval_hours === 0 ? 'continuous' : 'hourly'
    }
    switch (schedule.cron_expression) {
      case '0 2 * * *':
        return 'daily'
      case '0 3 * * 0':
        return 'weekly'
      case '0 4 1 * *':
        return 'monthly'
      case '0 4 1 */3 *':
        return 'quarterly'
      default:
        return 'daily'
    }
  }

  const openEditSchedule = (schedule: ApiScanSchedule) => {
    setScheduleForm({
      name: schedule.name ?? '',
      type: (schedule.scan_type ?? '') as ScanType,
      targets: schedule.target_tags?.join(', ') || '',
      frequency: mapScheduleToFrequency(schedule),
      time: schedule.cron_expression || '',
    })
    setEditSchedule(schedule)
  }

  const handleRunNow = async (schedule: ApiScanSchedule) => {
    try {
      await post(`/api/v1/scope/schedules/${schedule.id}/run`, {})
      await invalidateScanSchedulesCache()
      await invalidateScopeStatsCache()
      toast.success(`Started: ${schedule.name}`)
    } catch {
      toast.error(`Failed to run schedule: ${schedule.name}`)
    }
  }

  // Get pattern placeholder and help text from shared config
  const getTypeConfig = (type: ScopeTargetType) => {
    const config = getScopeTypeConfig(type)
    return {
      placeholder: config?.placeholder || 'Enter pattern',
      helpText: config?.helpText || '',
    }
  }

  // Format type label for display
  const formatTypeLabel = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Form JSX
  const targetFormFields = (
    <div className="space-y-4">
      {validationError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {validationError}
        </div>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={targetForm.type}
          disabled={!!editTarget}
          onValueChange={(v) => {
            setTargetForm({ ...targetForm, type: v as ScopeTargetType })
            setValidationError(null)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {targetTypeCategories.map((category) => (
              <div key={category.label}>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
                  {category.label}
                </div>
                {category.types.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-wrap items-center gap-2">
                      {targetTypeIcons[type]}
                      {formatTypeLabel(type)}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Pattern *</Label>
        <Input
          placeholder={getTypeConfig(targetForm.type).placeholder}
          value={targetForm.pattern}
          disabled={!!editTarget}
          onChange={(e) => {
            setTargetForm({ ...targetForm, pattern: e.target.value })
            setValidationError(null)
          }}
        />
        <p className="text-muted-foreground text-xs">
          {editTarget
            ? 'Type and pattern identify the target and cannot be changed after creation. Remove and re-add to change them.'
            : getTypeConfig(targetForm.type).helpText}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          placeholder="Description of this target"
          value={targetForm.description}
          onChange={(e) => setTargetForm({ ...targetForm, description: e.target.value })}
        />
      </div>
    </div>
  )

  const exclusionFormFields = (
    <div className="space-y-4">
      {validationError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {validationError}
        </div>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={exclusionForm.type}
          disabled={!!editExclusion}
          onValueChange={(v) => {
            setExclusionForm({ ...exclusionForm, type: v as ScopeTargetType })
            setValidationError(null)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {targetTypeCategories.map((category) => (
              <div key={category.label}>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
                  {category.label}
                </div>
                {category.types.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-wrap items-center gap-2">
                      {targetTypeIcons[type]}
                      {formatTypeLabel(type)}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Pattern *</Label>
        <Input
          placeholder={getTypeConfig(exclusionForm.type).placeholder}
          value={exclusionForm.pattern}
          disabled={!!editExclusion}
          onChange={(e) => {
            setExclusionForm({ ...exclusionForm, pattern: e.target.value })
            setValidationError(null)
          }}
        />
        <p className="text-muted-foreground text-xs">
          {editExclusion
            ? 'Type and pattern identify the exclusion and cannot be changed after creation. Remove and re-add to change them.'
            : 'Pattern to exclude from security assessments'}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Input
          placeholder="Reason for exclusion"
          value={exclusionForm.reason}
          onChange={(e) => setExclusionForm({ ...exclusionForm, reason: e.target.value })}
        />
      </div>
    </div>
  )

  const scheduleFormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          placeholder="e.g., Daily Vulnerability Scan"
          value={scheduleForm.name}
          onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Scan type</Label>
          <Select
            value={scheduleForm.type}
            disabled={!!editSchedule}
            onValueChange={(v) => setScheduleForm({ ...scheduleForm, type: v as ScanType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vulnerability">Vulnerability scan</SelectItem>
              <SelectItem value="port_scan">Port scan</SelectItem>
              <SelectItem value="pentest">Penetration test</SelectItem>
              <SelectItem value="credential">Credential monitor</SelectItem>
              <SelectItem value="secret_scan">Secret scan</SelectItem>
              <SelectItem value="compliance">Compliance check</SelectItem>
              <SelectItem value="configuration">Config audit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={scheduleForm.frequency}
            onValueChange={(v) =>
              setScheduleForm({ ...scheduleForm, frequency: v as ScanFrequency })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="continuous">Continuous</SelectItem>
              <SelectItem value="on_commit">On commit</SelectItem>
              <SelectItem value="on_demand">On demand</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Targets *</Label>
        <Input
          placeholder="Comma-separated targets (e.g., *.example.com, 10.0.0.0/8)"
          value={scheduleForm.targets}
          onChange={(e) => setScheduleForm({ ...scheduleForm, targets: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Time</Label>
        <Input
          placeholder="e.g., 02:00 or Sunday 03:00"
          value={scheduleForm.time}
          onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
        />
      </div>
    </div>
  )

  const typeFilterSelect = (
    <Select value={typeFilter} onValueChange={setTypeFilterAndReset}>
      <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by type">
        <SelectValue placeholder="Filter by type" />
      </SelectTrigger>
      {tab === 'schedules' ? (
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {Object.entries(scanTypeLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      ) : (
        <SelectContent className="max-h-80">
          <SelectItem value="all">All types</SelectItem>
          {targetTypeCategories.map((category) => (
            <div key={category.label}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {category.label}
              </div>
              {category.types.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex flex-wrap items-center gap-2">
                    {targetTypeIcons[type]}
                    {formatTypeLabel(type)}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      )}
    </Select>
  )

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            tab === 'targets'
              ? 'Search targets…'
              : tab === 'exclusions'
                ? 'Search exclusions…'
                : 'Search schedules…'
          }
          aria-label={`Search ${tab}`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      {typeFilterSelect}
    </>
  )

  const onTablePagination = (p: { pageIndex: number; pageSize: number }) => {
    if (p.pageSize !== perPage) {
      setPerPage(p.pageSize)
      setPage(1)
    } else {
      setPage(p.pageIndex + 1)
    }
  }

  const filtersActive = !!searchParam || typeFilter !== 'all'

  const targetColumns: ColumnDef<ApiScopeTarget>[] = [
    {
      accessorKey: 'pattern',
      header: 'Pattern',
      enableHiding: false,
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm">{row.original.pattern}</code>
      ),
    },
    {
      accessorKey: 'target_type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          {targetTypeIcons[row.original.target_type ?? '']}
          <span className="text-sm capitalize text-foreground">
            {(row.original.target_type ?? '').replace('_', ' ')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.description}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const target = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={target.status === 'active'}
              onCheckedChange={() => toggleTargetStatus(target)}
              disabled={!canWriteScope}
              aria-label={`Toggle ${target.pattern}`}
            />
            <span
              className={cn(
                'text-xs capitalize',
                target.status !== 'active' && 'text-muted-foreground'
              )}
            >
              {target.status}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'created_by',
      header: 'Created by',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.created_by}</span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
          <DataTableRowActions
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => openEditTarget(row.original),
                permission: Permission.ScopeWrite,
              },
              {
                label: 'Remove',
                icon: Trash2,
                onClick: () => setDeleteTarget(row.original),
                destructive: true,
                permission: Permission.ScopeDelete,
              },
            ]}
          />
        </Can>
      ),
    },
  ]

  const exclusionColumns: ColumnDef<ApiScopeExclusion>[] = [
    {
      accessorKey: 'pattern',
      header: 'Pattern',
      enableHiding: false,
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm">{row.original.pattern}</code>
      ),
    },
    {
      accessorKey: 'exclusion_type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          {targetTypeIcons[row.original.exclusion_type ?? ''] || <Ban className="h-4 w-4" />}
          <span className="text-sm capitalize text-foreground">
            {(row.original.exclusion_type ?? '').replace('_', ' ')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.reason}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const exclusion = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={exclusion.status === 'active'}
              onCheckedChange={() => toggleExclusionStatus(exclusion)}
              disabled={!canWriteScope}
              aria-label={`Toggle ${exclusion.pattern}`}
            />
            <span
              className={cn('text-xs', exclusion.status !== 'active' && 'text-muted-foreground')}
            >
              {exclusion.status === 'active' ? 'Excluded' : 'Inactive'}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'created_by',
      header: 'Created by',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.created_by}</span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
          <DataTableRowActions
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => openEditExclusion(row.original),
                permission: Permission.ScopeWrite,
              },
              {
                label: 'Remove',
                icon: Trash2,
                onClick: () => setDeleteExclusion(row.original),
                destructive: true,
                permission: Permission.ScopeDelete,
              },
            ]}
          />
        </Can>
      ),
    },
  ]

  const scheduleColumns: ColumnDef<ApiScanSchedule>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      enableHiding: false,
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <div>
            <p className="font-medium">{schedule.name}</p>
            <p className="text-xs text-muted-foreground">
              {schedule.target_tags?.join(', ') || schedule.target_scope || 'All targets'}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'scan_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {scanTypeLabels[row.original.scan_type ?? ''] ?? row.original.scan_type}
        </Badge>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {schedule.cron_expression ? (
              <code className="text-xs">{schedule.cron_expression}</code>
            ) : schedule.interval_hours ? (
              `Every ${schedule.interval_hours}h`
            ) : (
              'On demand'
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'last_run_at',
      header: 'Last run',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.last_run_at)}</span>,
    },
    {
      accessorKey: 'next_run_at',
      header: 'Next run',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.next_run_at ? formatDate(row.original.next_run_at) : 'On trigger'}
        </span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={schedule.enabled}
              onCheckedChange={() => toggleScheduleStatus(schedule)}
              disabled={!canWriteScope}
              aria-label={`Toggle ${schedule.name}`}
            />
            <span className={cn('text-xs', !schedule.enabled && 'text-muted-foreground')}>
              {schedule.enabled ? 'Active' : 'Paused'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <Can permission={[Permission.ScansExecute, Permission.ScopeWrite, Permission.ScopeDelete]}>
          <DataTableRowActions
            actions={[
              {
                label: 'Run now',
                icon: Play,
                onClick: () => handleRunNow(row.original),
                permission: Permission.ScansExecute,
              },
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => openEditSchedule(row.original),
                permission: Permission.ScopeWrite,
              },
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => setDeleteSchedule(row.original),
                destructive: true,
                permission: Permission.ScopeDelete,
              },
            ]}
          />
        </Can>
      ),
    },
  ]

  const tableSkeleton = (
    <div className="space-y-2 rounded-xl border p-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )

  const metrics: MetricStripItem[] = [
    {
      key: 'targets',
      label: 'In-scope targets',
      value: stats.targets,
      hint: `${stats.activeTargets} active`,
      onClick: () => selectTab('targets'),
    },
    {
      key: 'exclusions',
      label: 'Exclusions',
      value: stats.exclusions,
      onClick: () => selectTab('exclusions'),
    },
    {
      key: 'schedules',
      label: 'Active schedules',
      value: stats.activeSchedules,
      onClick: () => selectTab('schedules'),
    },
    {
      key: 'coverage',
      label: 'Scope coverage',
      value: `${stats.coverage}%`,
      hint: `${stats.activeTargets} of ${stats.targets} targets active`,
    },
  ]

  const addButton =
    tab === 'exclusions' ? (
      <Button size="sm" onClick={() => setIsAddExclusionOpen(true)}>
        <Plus className="me-2 h-4 w-4" />
        Add exclusion
      </Button>
    ) : tab === 'schedules' ? (
      <Button size="sm" onClick={() => setIsAddScheduleOpen(true)}>
        <Plus className="me-2 h-4 w-4" />
        New schedule
      </Button>
    ) : (
      <Button size="sm" onClick={() => setIsAddTargetOpen(true)}>
        <Plus className="me-2 h-4 w-4" />
        Add target
      </Button>
    )

  return (
    <>
      <Main>
        <PageHeader
          title="Scope configuration"
          description="What gets scanned: in-scope targets, exclusions and scan schedules."
        >
          <Can permission={Permission.ScopeWrite}>{addButton}</Can>
        </PageHeader>

        <Tabs value={tab} onValueChange={selectTab} className="mt-4">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="targets">
                Targets{' '}
                <TabsCount value={targetsLoading ? '…' : (targetsData?.total ?? targets.length)} />
              </TabsTrigger>
              <TabsTrigger value="exclusions">
                Exclusions{' '}
                <TabsCount
                  value={exclusionsLoading ? '…' : (exclusionsData?.total ?? exclusions.length)}
                />
              </TabsTrigger>
              <TabsTrigger value="schedules">
                Schedules{' '}
                <TabsCount
                  value={schedulesLoading ? '…' : (schedulesData?.total ?? schedules.length)}
                />
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            <MetricStrip loading={statsLoading} items={metrics} />
            {dashboardLoading ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inventory by asset type</CardTitle>
                    <CardDescription>Every asset in the inventory, in scope or not</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assetTypeData.length === 0 ? (
                      <EmptyState
                        icon={BarChart3}
                        title="No asset types yet"
                        description="Asset types appear once discovery or an import adds assets."
                        card={false}
                        className="py-8"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        {/* Chart area is its own flex item with a fixed
                            square box. Built-in Recharts Legend was
                            eating into the Pie's vertical space and
                            squashing it into an oval when there were
                            many asset-type entries; hoisting the
                            legend out fixes that. */}
                        <div className="h-[240px] w-[240px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={assetTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="100%"
                                dataKey="value"
                                nameKey="name"
                                paddingAngle={2}
                              >
                                {assetTypeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <ul className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                          {assetTypeData.map((entry) => (
                            <li
                              key={entry.name}
                              className="flex items-center gap-2 text-muted-foreground"
                            >
                              <span
                                aria-hidden
                                className="inline-block h-2.5 w-2.5 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-foreground">{entry.name}</span>
                              <span className="tabular-nums">{entry.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset status</CardTitle>
                    <CardDescription>Status of every asset in the inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assetStatusData.length === 0 ? (
                      <EmptyState
                        icon={BarChart3}
                        title="No status data"
                        description="Status appears once discovery or an import adds assets."
                        card={false}
                        className="py-8"
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={assetStatusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Assets" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Insights</CardTitle>
                    <CardDescription>Where the scope boundaries could be tightened</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.targets === 0 && dashboardStats.assets.total === 0 ? (
                      <EmptyState
                        icon={Target}
                        title="No targets configured"
                        description="Add targets to begin scoping."
                        card={false}
                        className="py-8"
                      />
                    ) : (
                      <div className="divide-y">
                        <div className="pb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Scope coverage</p>
                            <span className="text-sm font-semibold tabular-nums">
                              {stats.activeTargets} / {stats.targets} targets active
                            </span>
                          </div>
                          <Progress value={stats.coverage} className="mt-2 h-2" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stats.coverage}% scope coverage — {stats.exclusions} exclusion
                            {stats.exclusions !== 1 ? 's' : ''}, {stats.activeSchedules} active
                            schedule{stats.activeSchedules !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-start gap-3 py-4">
                          {stats.coverage < 80 ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">Target coverage</p>
                            <p className="text-sm text-muted-foreground">
                              {stats.coverage < 80
                                ? `Only ${stats.activeTargets} of ${stats.targets} targets are active. Activate more targets to improve coverage.`
                                : 'At least 80% of targets are active.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-4">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Repository integration</p>
                            <p className="text-sm text-muted-foreground">
                              {dashboardStats.repositories.total > 0
                                ? `${dashboardStats.repositories.total} repositories linked. ${dashboardStats.repositories.withFindings} have active findings.`
                                : 'Connect repositories to expand scope for code assets.'}
                            </p>
                          </div>
                        </div>
                        {stats.activeSchedules === 0 && stats.targets > 0 && (
                          <div className="flex items-start gap-3 pt-4">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">No active schedules</p>
                              <p className="text-sm text-muted-foreground">
                                You have {stats.targets} targets but no active scan schedules.
                                Create a schedule to automate scanning.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="targets" className="mt-5">
            {targetsLoading && !targetsData ? (
              tableSkeleton
            ) : (
              <DataTable
                columns={targetColumns}
                data={targets}
                showSearch={false}
                toolbarStart={toolbarStart}
                manualPagination
                rowCount={targetsData?.total ?? 0}
                pagination={{ pageIndex: page - 1, pageSize: perPage }}
                onPaginationChange={onTablePagination}
                pageSizeOptions={PAGE_SIZES}
                emptyMessage={filtersActive ? 'No targets match' : 'No targets configured yet'}
                emptyDescription={
                  filtersActive
                    ? 'Try adjusting your search or type filter.'
                    : 'Add a target to bring it into scope.'
                }
              />
            )}
          </TabsContent>

          <TabsContent value="exclusions" className="mt-5">
            {exclusionsLoading && !exclusionsData ? (
              tableSkeleton
            ) : (
              <DataTable
                columns={exclusionColumns}
                data={exclusions}
                showSearch={false}
                toolbarStart={toolbarStart}
                manualPagination
                rowCount={exclusionsData?.total ?? 0}
                pagination={{ pageIndex: page - 1, pageSize: perPage }}
                onPaginationChange={onTablePagination}
                pageSizeOptions={PAGE_SIZES}
                emptyMessage={
                  filtersActive ? 'No exclusions match' : 'No exclusions configured yet'
                }
                emptyDescription={
                  filtersActive
                    ? 'Try adjusting your search or type filter.'
                    : 'Add an exclusion to keep something out of scans.'
                }
              />
            )}
          </TabsContent>

          <TabsContent value="schedules" className="mt-5">
            {schedulesLoading && !schedulesData ? (
              tableSkeleton
            ) : (
              <DataTable
                columns={scheduleColumns}
                data={schedules}
                showSearch={false}
                toolbarStart={toolbarStart}
                manualPagination
                rowCount={schedulesData?.total ?? 0}
                pagination={{ pageIndex: page - 1, pageSize: perPage }}
                onPaginationChange={onTablePagination}
                pageSizeOptions={PAGE_SIZES}
                emptyMessage={filtersActive ? 'No schedules match' : 'No schedules configured yet'}
                emptyDescription={
                  filtersActive
                    ? 'Try adjusting your search or type filter.'
                    : 'Create a schedule to automate scanning.'
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* Add Target Dialog */}
      <Dialog
        open={isAddTargetOpen}
        onOpenChange={(open) => {
          setIsAddTargetOpen(open)
          if (!open) {
            resetTargetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add target</DialogTitle>
            <DialogDescription>Add a new target to the scope</DialogDescription>
          </DialogHeader>
          {targetFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTargetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTarget} disabled={isCreatingTarget}>
              {isCreatingTarget && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Add Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Target Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            resetTargetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit target</DialogTitle>
            <DialogDescription>Update target information</DialogDescription>
          </DialogHeader>
          {targetFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditTarget} disabled={isUpdatingTarget}>
              {isUpdatingTarget && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Target Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove target?"
        desc={<>Remove &quot;{deleteTarget?.pattern}&quot; from scope?</>}
        confirmText="Remove"
        destructive
        isLoading={isRemovingTarget}
        handleConfirm={handleDeleteTarget}
      />

      {/* Add Exclusion Dialog */}
      <Dialog
        open={isAddExclusionOpen}
        onOpenChange={(open) => {
          setIsAddExclusionOpen(open)
          if (!open) {
            resetExclusionForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add exclusion</DialogTitle>
            <DialogDescription>Add a pattern to exclude from scope</DialogDescription>
          </DialogHeader>
          {exclusionFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExclusionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExclusion} disabled={isCreatingExclusion}>
              {isCreatingExclusion && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Add Exclusion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Exclusion Dialog */}
      <Dialog
        open={!!editExclusion}
        onOpenChange={(open) => {
          if (!open) {
            setEditExclusion(null)
            resetExclusionForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit exclusion</DialogTitle>
            <DialogDescription>Update exclusion information</DialogDescription>
          </DialogHeader>
          {exclusionFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExclusion(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditExclusion} disabled={isUpdatingExclusion}>
              {isUpdatingExclusion && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exclusion Dialog */}
      <ConfirmDialog
        open={!!deleteExclusion}
        onOpenChange={(open) => !open && setDeleteExclusion(null)}
        title="Remove exclusion?"
        desc={<>Remove &quot;{deleteExclusion?.pattern}&quot; from exclusions?</>}
        confirmText="Remove"
        destructive
        isLoading={isRemovingExclusion}
        handleConfirm={handleDeleteExclusion}
      />

      {/* Add Schedule Dialog */}
      <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New schedule</DialogTitle>
            <DialogDescription>Create a new scan schedule</DialogDescription>
          </DialogHeader>
          {scheduleFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSchedule} disabled={isCreatingSchedule}>
              {isCreatingSchedule && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editSchedule} onOpenChange={(open) => !open && setEditSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit schedule</DialogTitle>
            <DialogDescription>Update schedule configuration</DialogDescription>
          </DialogHeader>
          {scheduleFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSchedule} disabled={isUpdatingSchedule}>
              {isUpdatingSchedule && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Dialog */}
      <ConfirmDialog
        open={!!deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
        title="Delete schedule?"
        desc={<>Delete &quot;{deleteSchedule?.name}&quot;? This cannot be undone.</>}
        confirmText="Delete"
        destructive
        isLoading={isRemovingSchedule}
        handleConfirm={handleDeleteSchedule}
      />
    </>
  )
}

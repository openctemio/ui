'use client'

import { useState, useMemo, useCallback } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Can, Permission, useHasPermission } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Server,
  Code,
  Cloud,
  GitBranch,
  Target,
  Ban,
  Calendar,
  Play,
  Search as SearchIcon,
  AlertTriangle,
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

const scanTypeConfig: Record<string, { label: string; color: string }> = {
  vulnerability: { label: 'Vulnerability', color: 'bg-red-500/20 text-red-400' },
  port_scan: { label: 'Port Scan', color: 'bg-blue-500/20 text-blue-400' },
  pentest: { label: 'Pentest', color: 'bg-purple-500/20 text-purple-400' },
  credential: { label: 'Credential', color: 'bg-orange-500/20 text-orange-400' },
  secret_scan: { label: 'Secret Scan', color: 'bg-yellow-500/20 text-yellow-400' },
  compliance: { label: 'Compliance', color: 'bg-cyan-500/20 text-cyan-400' },
  configuration: { label: 'Config Audit', color: 'bg-indigo-500/20 text-indigo-400' },
}

// Loading skeleton component - defined outside to avoid recreation on each render
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function ScopeConfigPage() {
  // Permission check for write operations
  const canWriteScope = useHasPermission(Permission.ScopeWrite)

  // Search & filter states
  const [targetSearch, setTargetSearch] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [exclusionSearch, setExclusionSearch] = useState('')
  const [exclusionTypeFilter, setExclusionTypeFilter] = useState<string>('all')
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>('all')

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

  // API hooks for fetching data
  const { data: targetsData, isLoading: targetsLoading } = useScopeTargetsApi({
    search: targetSearch || undefined,
    target_type: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
  })

  const { data: exclusionsData, isLoading: exclusionsLoading } = useScopeExclusionsApi({
    search: exclusionSearch || undefined,
    exclusion_type: exclusionTypeFilter !== 'all' ? exclusionTypeFilter : undefined,
  })

  const { data: schedulesData, isLoading: schedulesLoading } = useScanSchedulesApi({
    search: scheduleSearch || undefined,
    scan_type: scheduleTypeFilter !== 'all' ? (scheduleTypeFilter as ScanType) : undefined,
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
    // Fallback when stats API hasn't loaded yet
    return {
      targets: targets.length,
      activeTargets: targets.filter((t) => t.status === 'active').length,
      exclusions: exclusions.length,
      activeSchedules: schedules.filter((s) => s.enabled).length,
      coverage:
        targets.length > 0
          ? Math.round((targets.filter((t) => t.status === 'active').length / targets.length) * 100)
          : 0,
    }
  }, [statsData, targets, exclusions, schedules])

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
    setTargetForm({ type: 'domain', pattern: '', description: '' })
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
      await createTarget({
        target_type: targetForm.type,
        pattern: targetForm.pattern,
        description: targetForm.description,
      })
      await invalidateScopeCache()
      toast.success('Target added successfully')
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
      type: target.target_type as ScopeTargetType,
      pattern: target.pattern,
      description: target.description,
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
      type: exclusion.exclusion_type as ScopeTargetType,
      pattern: exclusion.pattern,
      reason: exclusion.reason,
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

  const openEditSchedule = (schedule: ApiScanSchedule) => {
    setScheduleForm({
      name: schedule.name,
      type: schedule.scan_type as ScanType,
      targets: schedule.target_tags?.join(', ') || '',
      frequency: 'daily', // Default, backend doesn't store frequency directly
      time: schedule.cron_expression || '',
    })
    setEditSchedule(schedule)
  }

  const handleRunNow = (schedule: ApiScanSchedule) => {
    toast.success(`Started: ${schedule.name}`)
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
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4" />
          {validationError}
        </div>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={targetForm.type}
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
          onChange={(e) => {
            setTargetForm({ ...targetForm, pattern: e.target.value })
            setValidationError(null)
          }}
        />
        <p className="text-muted-foreground text-xs">{getTypeConfig(targetForm.type).helpText}</p>
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
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4" />
          {validationError}
        </div>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={exclusionForm.type}
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
          onChange={(e) => {
            setExclusionForm({ ...exclusionForm, pattern: e.target.value })
            setValidationError(null)
          }}
        />
        <p className="text-muted-foreground text-xs">
          Pattern to exclude from security assessments
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
          <Label>Scan Type</Label>
          <Select
            value={scheduleForm.type}
            onValueChange={(v) => setScheduleForm({ ...scheduleForm, type: v as ScanType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vulnerability">Vulnerability Scan</SelectItem>
              <SelectItem value="port_scan">Port Scan</SelectItem>
              <SelectItem value="pentest">Penetration Test</SelectItem>
              <SelectItem value="credential">Credential Monitor</SelectItem>
              <SelectItem value="secret_scan">Secret Scan</SelectItem>
              <SelectItem value="compliance">Compliance Check</SelectItem>
              <SelectItem value="configuration">Config Audit</SelectItem>
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
              <SelectItem value="on_commit">On Commit</SelectItem>
              <SelectItem value="on_demand">On Demand</SelectItem>
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

  return (
    <>
      <Main>
        <PageHeader
          title="Scope Configuration"
          description="Configure scan targets, exclusions, and schedules"
        />

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                In-Scope Targets
              </CardDescription>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats.targets}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Exclusions
              </CardDescription>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats.exclusions}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled Scans
              </CardDescription>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats.activeSchedules}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Coverage
              </CardDescription>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle
                  className={`text-3xl ${stats.coverage >= 80 ? 'text-green-500' : stats.coverage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}
                >
                  {stats.coverage}%
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-xs">
                {stats.activeTargets} of {stats.targets} targets active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="targets" className="mt-6">
          <TabsList>
            <TabsTrigger value="targets">
              In-Scope Targets ({targetsLoading ? '...' : targets.length})
            </TabsTrigger>
            <TabsTrigger value="exclusions">
              Exclusions ({exclusionsLoading ? '...' : exclusions.length})
            </TabsTrigger>
            <TabsTrigger value="schedules">
              Scan Schedules ({schedulesLoading ? '...' : schedules.length})
            </TabsTrigger>
          </TabsList>

          {/* In-Scope Targets */}
          <TabsContent value="targets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>In-Scope Targets</CardTitle>
                    <CardDescription>
                      Assets and patterns included in security assessments
                    </CardDescription>
                  </div>
                  <Can permission={Permission.ScopeWrite}>
                    <Button size="sm" onClick={() => setIsAddTargetOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Target
                    </Button>
                  </Can>
                </div>
                {/* Search & Filter */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search targets..."
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="all">All Types</SelectItem>
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
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetsLoading ? (
                      <TableSkeleton />
                    ) : targets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                          {targetSearch || targetTypeFilter !== 'all'
                            ? 'No targets match your search criteria'
                            : 'No targets configured'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      targets.map((target) => (
                        <TableRow key={target.id}>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {targetTypeIcons[target.target_type]}
                              <span className="text-sm capitalize">
                                {target.target_type.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted rounded px-2 py-1 text-sm">
                              {target.pattern}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {target.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Switch
                                checked={target.status === 'active'}
                                onCheckedChange={() => toggleTargetStatus(target)}
                                disabled={!canWriteScope}
                              />
                              <span
                                className={`text-xs ${target.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}
                              >
                                {target.status}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {target.created_by}
                          </TableCell>
                          <TableCell>
                            <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Can permission={Permission.ScopeWrite}>
                                    <DropdownMenuItem onClick={() => openEditTarget(target)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  </Can>
                                  <Can permission={Permission.ScopeDelete}>
                                    <DropdownMenuItem
                                      className="text-red-400"
                                      onClick={() => setDeleteTarget(target)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </DropdownMenuItem>
                                  </Can>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Can>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exclusions */}
          <TabsContent value="exclusions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exclusions</CardTitle>
                    <CardDescription>
                      Assets and patterns excluded from security assessments
                    </CardDescription>
                  </div>
                  <Can permission={Permission.ScopeWrite}>
                    <Button size="sm" onClick={() => setIsAddExclusionOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exclusion
                    </Button>
                  </Can>
                </div>
                {/* Search & Filter */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search exclusions..."
                      value={exclusionSearch}
                      onChange={(e) => setExclusionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={exclusionTypeFilter} onValueChange={setExclusionTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="all">All Types</SelectItem>
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
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exclusionsLoading ? (
                      <TableSkeleton />
                    ) : exclusions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                          {exclusionSearch || exclusionTypeFilter !== 'all'
                            ? 'No exclusions match your search criteria'
                            : 'No exclusions configured'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      exclusions.map((exclusion) => (
                        <TableRow key={exclusion.id}>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {targetTypeIcons[exclusion.exclusion_type] || (
                                <Ban className="h-4 w-4" />
                              )}
                              <span className="text-sm capitalize">
                                {exclusion.exclusion_type.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted rounded px-2 py-1 text-sm">
                              {exclusion.pattern}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {exclusion.reason}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Switch
                                checked={exclusion.status === 'active'}
                                onCheckedChange={() => toggleExclusionStatus(exclusion)}
                                disabled={!canWriteScope}
                              />
                              <span
                                className={`text-xs ${exclusion.status === 'active' ? 'text-orange-400' : 'text-gray-400'}`}
                              >
                                {exclusion.status === 'active' ? 'Excluded' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {exclusion.created_by}
                          </TableCell>
                          <TableCell>
                            <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Can permission={Permission.ScopeWrite}>
                                    <DropdownMenuItem onClick={() => openEditExclusion(exclusion)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  </Can>
                                  <Can permission={Permission.ScopeDelete}>
                                    <DropdownMenuItem
                                      className="text-red-400"
                                      onClick={() => setDeleteExclusion(exclusion)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </DropdownMenuItem>
                                  </Can>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Can>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scan Schedules */}
          <TabsContent value="schedules">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scan Schedules</CardTitle>
                    <CardDescription>Automated scan configurations and schedules</CardDescription>
                  </div>
                  <Can permission={Permission.ScopeWrite}>
                    <Button size="sm" onClick={() => setIsAddScheduleOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Schedule
                    </Button>
                  </Can>
                </div>
                {/* Search & Filter */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search schedules..."
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={scheduleTypeFilter} onValueChange={setScheduleTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="vulnerability">Vulnerability</SelectItem>
                      <SelectItem value="port_scan">Port Scan</SelectItem>
                      <SelectItem value="pentest">Pentest</SelectItem>
                      <SelectItem value="credential">Credential</SelectItem>
                      <SelectItem value="secret_scan">Secret Scan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesLoading ? (
                      <TableSkeleton />
                    ) : schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                          {scheduleSearch || scheduleTypeFilter !== 'all'
                            ? 'No schedules match your search criteria'
                            : 'No schedules configured'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((schedule) => {
                        const typeConfig = scanTypeConfig[schedule.scan_type] || {
                          label: schedule.scan_type,
                          color: 'bg-gray-500/20 text-gray-400',
                        }
                        return (
                          <TableRow key={schedule.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{schedule.name}</p>
                                <p className="text-muted-foreground text-xs">
                                  {schedule.target_tags?.join(', ') ||
                                    schedule.target_scope ||
                                    'All targets'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${typeConfig.color} border-0`}>
                                {typeConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="text-muted-foreground h-3 w-3" />
                                {schedule.cron_expression ||
                                  (schedule.interval_hours
                                    ? `Every ${schedule.interval_hours}h`
                                    : 'On demand')}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(schedule.last_run_at)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {schedule.next_run_at
                                ? formatDate(schedule.next_run_at)
                                : 'On trigger'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <Switch
                                  checked={schedule.enabled}
                                  onCheckedChange={() => toggleScheduleStatus(schedule)}
                                  disabled={!canWriteScope}
                                />
                                <span className="text-xs capitalize">
                                  {schedule.enabled ? 'Active' : 'Paused'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Can
                                permission={[
                                  Permission.ScansExecute,
                                  Permission.ScopeWrite,
                                  Permission.ScopeDelete,
                                ]}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <Can permission={Permission.ScansExecute}>
                                      <DropdownMenuItem onClick={() => handleRunNow(schedule)}>
                                        <Play className="mr-2 h-4 w-4" />
                                        Run Now
                                      </DropdownMenuItem>
                                    </Can>
                                    <Can permission={Permission.ScopeWrite}>
                                      <DropdownMenuItem onClick={() => openEditSchedule(schedule)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    </Can>
                                    <Can permission={Permission.ScopeDelete}>
                                      <DropdownMenuItem
                                        className="text-red-400"
                                        onClick={() => setDeleteSchedule(schedule)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </Can>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </Can>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
            <DialogTitle>Add Target</DialogTitle>
            <DialogDescription>Add a new target to the scope</DialogDescription>
          </DialogHeader>
          {targetFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTargetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTarget} disabled={isCreatingTarget}>
              {isCreatingTarget && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <DialogTitle>Edit Target</DialogTitle>
            <DialogDescription>Update target information</DialogDescription>
          </DialogHeader>
          {targetFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditTarget} disabled={isUpdatingTarget}>
              {isUpdatingTarget && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Target Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Target</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{deleteTarget?.pattern}&quot; from scope?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTarget} disabled={isRemovingTarget}>
              {isRemovingTarget && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Add Exclusion</DialogTitle>
            <DialogDescription>Add a pattern to exclude from scope</DialogDescription>
          </DialogHeader>
          {exclusionFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExclusionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExclusion} disabled={isCreatingExclusion}>
              {isCreatingExclusion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <DialogTitle>Edit Exclusion</DialogTitle>
            <DialogDescription>Update exclusion information</DialogDescription>
          </DialogHeader>
          {exclusionFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExclusion(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditExclusion} disabled={isUpdatingExclusion}>
              {isUpdatingExclusion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exclusion Dialog */}
      <Dialog open={!!deleteExclusion} onOpenChange={(open) => !open && setDeleteExclusion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Exclusion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{deleteExclusion?.pattern}&quot; from
              exclusions?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExclusion(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExclusion}
              disabled={isRemovingExclusion}
            >
              {isRemovingExclusion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
            <DialogDescription>Create a new scan schedule</DialogDescription>
          </DialogHeader>
          {scheduleFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSchedule} disabled={isCreatingSchedule}>
              {isCreatingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editSchedule} onOpenChange={(open) => !open && setEditSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update schedule configuration</DialogDescription>
          </DialogHeader>
          {scheduleFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSchedule} disabled={isUpdatingSchedule}>
              {isUpdatingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Dialog */}
      <Dialog open={!!deleteSchedule} onOpenChange={(open) => !open && setDeleteSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteSchedule?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSchedule(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSchedule}
              disabled={isRemovingSchedule}
            >
              {isRemovingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

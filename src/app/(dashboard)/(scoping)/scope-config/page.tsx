'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableRowActions,
  MetricStrip,
  type MetricStripItem,
} from '@/features/shared'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { useUrlFilter, useUrlFilterNumber } from '@/hooks/use-url-param'
import { cn } from '@/lib/utils'
import { Can, Permission, useHasPermission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
  Server,
  Code,
  Cloud,
  GitBranch,
  Ban,
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
  getScopeTypeConfig,
  // API hooks
  useScopeTargetsApi,
  useScopeExclusionsApi,
  useScopeStatsApi,
  useCreateScopeTargetApi,
  useUpdateScopeTargetApi,
  useDeleteScopeTargetApi,
  useCreateScopeExclusionApi,
  useUpdateScopeExclusionApi,
  useDeleteScopeExclusionApi,
  invalidateScopeCache,
  invalidateScopeTargetsCache,
  invalidateScopeExclusionsCache,
  invalidateScopeStatsCache,
  // API types
  type ApiScopeTarget,
  type ApiScopeExclusion,
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

// Targets | Exclusions. The old Overview tab charted the whole inventory and the
// Schedules tab never ran (nothing executes scope schedules; Scans owns
// scheduling), so an old `?tab=overview` or `?tab=schedules` link lands on Targets.
const SCOPE_TABS = ['targets', 'exclusions'] as const
type ScopeTab = (typeof SCOPE_TABS)[number]
const PAGE_SIZES = [10, 20, 30, 50, 100]

export default function ScopeConfigPage() {
  // Permission check for write operations
  const canWriteScope = useHasPermission(Permission.ScopeWrite)

  // Tab, search, type filter and page live in the URL so a view can be linked
  // to. One set of list params serves whichever table tab is open (they are
  // cleared on tab change), and each API call only receives them for its own tab
  // so the other tabs' counts stay unfiltered.
  const [tabParam, setTabParam] = useUrlFilter('tab', 'targets')
  const tab: ScopeTab = (SCOPE_TABS as readonly string[]).includes(tabParam)
    ? (tabParam as ScopeTab)
    : 'targets'
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

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null)

  // Dialog states
  const [isAddTargetOpen, setIsAddTargetOpen] = useState(false)
  const [isAddExclusionOpen, setIsAddExclusionOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApiScopeTarget | null>(null)
  const [editExclusion, setEditExclusion] = useState<ApiScopeExclusion | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiScopeTarget | null>(null)
  const [deleteExclusion, setDeleteExclusion] = useState<ApiScopeExclusion | null>(null)

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

  // Extracted data - memoized for stable references
  const targets = useMemo(() => targetsData?.data || [], [targetsData?.data])
  const exclusions = useMemo(() => exclusionsData?.data || [], [exclusionsData?.data])

  // Stats (with fallback to 0 for undefined values)
  const stats = useMemo(() => {
    if (statsData) {
      return {
        targets: statsData.total_targets ?? 0,
        activeTargets: statsData.active_targets ?? 0,
        exclusions: statsData.total_exclusions ?? 0,
        // Share of discovered assets an active target covers (and no
        // exclusion removes), computed by the API; not a share of targets.
        coverage: Math.round(statsData.coverage ?? 0),
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
      // Only the API knows how much of the inventory the targets cover.
      coverage: 0,
    }
  }, [statsData, targetsData, exclusionsData, targets])

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

  const typeFilterSelect = (
    <Select value={typeFilter} onValueChange={setTypeFilterAndReset}>
      <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by type">
        <SelectValue placeholder="Filter by type" />
      </SelectTrigger>
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
    </Select>
  )

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={tab === 'targets' ? 'Search targets…' : 'Search exclusions…'}
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
      key: 'coverage',
      label: 'Inventory in scope',
      value: `${stats.coverage}%`,
      hint: 'of discovered assets match an active target',
    },
  ]

  const addButton =
    tab === 'exclusions' ? (
      <Button size="sm" onClick={() => setIsAddExclusionOpen(true)}>
        <Plus className="me-2 h-4 w-4" />
        Add exclusion
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
          title="Boundaries"
          description="What the program covers, and what scans must never touch. Exclusions are enforced on every scan; schedule scans on the Scans page."
        >
          <Can permission={Permission.ScopeWrite}>{addButton}</Can>
        </PageHeader>

        <MetricStrip className="mt-5" loading={statsLoading} items={metrics} />

        <Tabs value={tab} onValueChange={selectTab} className="mt-5">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>
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
            </TabsList>
          </div>

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
    </>
  )
}

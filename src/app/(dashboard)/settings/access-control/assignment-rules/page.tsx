'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  MetricStrip,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
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
import { toast } from 'sonner'
import {
  GitBranch,
  Plus,
  Trash2,
  Search as SearchIcon,
  Eye,
  Pencil,
  Loader2,
  AlertCircle,
  Play,
  RefreshCw,
} from 'lucide-react'
import { useUrlFilter } from '@/hooks/use-url-param'
import {
  useAssignmentRules,
  useCreateAssignmentRule,
  useDeleteAssignmentRule,
  useGroups,
  type AssignmentRule,
  formatDate,
} from '@/features/access-control'
import { AssignmentRuleDetailSheet } from '@/features/access-control/components/assignment-rule-detail-sheet'
import { getErrorMessage } from '@/lib/api/error-handler'
import { fetcherWithOptions } from '@/lib/api/client'
import { Can, Permission } from '@/lib/permissions'

type FilterType = 'all' | 'active' | 'inactive'

const typeFilters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const CONDITION_LABELS: Record<string, string> = {
  asset_type: 'Asset Type',
  finding_severity: 'Severity',
  finding_type: 'Finding Type',
  finding_source: 'Source',
  asset_tags: 'Tags',
  file_path_pattern: 'File Path',
}

const CONDITION_OPTIONS: Record<string, string[]> = {
  asset_type: [
    'host',
    'website',
    'domain',
    'ip_address',
    'network',
    'cloud_resource',
    'repository',
    'container',
    'api_endpoint',
  ],
  finding_severity: ['critical', 'high', 'medium', 'low', 'info'],
  // NOTE: asset_status / asset_criticality were phantom condition keys — the
  // backend AssignmentConditions only accepts asset_type, file_path_pattern,
  // finding_severity, finding_type, finding_source, asset_tags, and silently
  // drops anything else (no DisallowUnknownFields). Rules built on them never
  // matched. Removed until the backend supports them.
}

export default function AssignmentRulesPage() {
  // API Hooks
  const { assignmentRules, isLoading, isError, mutate: mutateRules } = useAssignmentRules()
  const { createAssignmentRule, isCreating } = useCreateAssignmentRule()
  const { groups } = useGroups()

  // UI State
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<AssignmentRule | null>(null)
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [typeFilterParam, setTypeFilter] = useUrlFilter('status', 'all')
  const typeFilter: FilterType =
    typeFilterParam === 'active' || typeFilterParam === 'inactive' ? typeFilterParam : 'all'
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    priority: 0,
    target_group_id: '',
    conditions: {} as Record<string, string[]>,
  })

  // Delete hook
  const { deleteAssignmentRule, isDeleting } = useDeleteAssignmentRule(ruleToDelete?.id || null)

  // Group lookup map: id → name
  const groupMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of groups) {
      map[g.id] = g.name
    }
    return map
  }, [groups])

  // Refresh data
  const refreshData = useCallback(() => {
    mutateRules()
  }, [mutateRules])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...assignmentRules]

    if (typeFilter === 'active') {
      data = data.filter((r) => r.is_active)
    } else if (typeFilter === 'inactive') {
      data = data.filter((r) => !r.is_active)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          groupMap[r.target_group_id]?.toLowerCase().includes(q)
      )
    }

    return data
  }, [assignmentRules, typeFilter, searchQuery, groupMap])

  // Type counts
  const typeCounts = useMemo(
    () => ({
      all: assignmentRules.length,
      active: assignmentRules.filter((r) => r.is_active).length,
      inactive: assignmentRules.filter((r) => !r.is_active).length,
    }),
    [assignmentRules]
  )

  // Table columns
  const columns: ColumnDef<AssignmentRule>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rule" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{row.original.name}</p>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {row.original.description && (
              <p className="text-muted-foreground text-xs line-clamp-1">
                {row.original.description}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'target_group_id',
      header: 'Target team',
      enableSorting: false,
      cell: ({ row }) => {
        const name = groupMap[row.original.target_group_id]
        return <span className="text-sm">{name || 'Unknown team'}</span>
      },
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.priority}</span>,
    },
    {
      id: 'conditions',
      header: 'Conditions',
      enableSorting: false,
      cell: ({ row }) => {
        const conditions = row.original.conditions || {}
        const entries = Object.entries(conditions).filter(
          ([, v]) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
        )
        if (entries.length === 0) {
          return <span className="text-xs text-muted-foreground">No conditions</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {entries.map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {CONDITION_LABELS[key] || key}:{' '}
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const rule = row.original

        return (
          <DataTableRowActions
            actions={[
              { label: 'View details', icon: Eye, onClick: () => setSelectedRuleId(rule.id) },
              {
                label: 'Edit',
                icon: Pencil,
                permission: Permission.AssignmentRulesWrite,
                onClick: () => setSelectedRuleId(rule.id),
              },
              {
                label: 'Test rule',
                icon: Play,
                permission: Permission.AssignmentRulesWrite,
                onClick: async () => {
                  try {
                    const result = await fetcherWithOptions<{ matching_findings: number }>(
                      `/api/v1/assignment-rules/${rule.id}/test`,
                      { method: 'POST' }
                    )
                    if (result) {
                      toast.success(`Rule matched ${result.matching_findings} finding(s)`)
                    }
                  } catch (error) {
                    toast.error(getErrorMessage(error, 'Failed to test rule'))
                  }
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                permission: Permission.AssignmentRulesDelete,
                onClick: () => {
                  setRuleToDelete(rule)
                  setDeleteDialogOpen(true)
                },
              },
            ]}
          />
        )
      },
    },
  ]

  // Actions
  const handleCreateRule = async () => {
    if (!createForm.name) {
      toast.error('Please enter a rule name')
      return
    }
    if (!createForm.target_group_id) {
      toast.error('Please select a target group')
      return
    }

    try {
      // Filter out empty condition arrays
      const conditions: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(createForm.conditions)) {
        if (values.length > 0) conditions[key] = values
      }

      await createAssignmentRule({
        name: createForm.name,
        description: createForm.description || undefined,
        priority: createForm.priority,
        target_group_id: createForm.target_group_id,
        conditions,
      })
      toast.success(`Assignment rule "${createForm.name}" created successfully`)
      setCreateDialogOpen(false)
      setCreateForm({ name: '', description: '', priority: 0, target_group_id: '', conditions: {} })
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create assignment rule'))
    }
  }

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      await deleteAssignmentRule()
      toast.success(`Assignment rule "${ruleToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setRuleToDelete(null)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete assignment rule'))
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Assignment rules"
          description="Rules that assign assets to teams automatically, evaluated in priority order."
        >
          <Can permission={Permission.AssignmentRulesWrite} mode="disable">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Create rule
            </Button>
          </Can>
        </PageHeader>

        {isError && !isLoading ? (
          <Alert variant="destructive" className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load assignment rules</AlertTitle>
            <AlertDescription>
              <p>The rule list could not be loaded.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refreshData}>
                <RefreshCw className="me-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <MetricStrip
              className="mt-5"
              loading={isLoading}
              items={[
                {
                  key: 'all',
                  label: 'Rules',
                  value: typeCounts.all,
                  onClick: () => setTypeFilter('all'),
                  active: typeFilter === 'all',
                },
                {
                  key: 'active',
                  label: 'Active',
                  value: typeCounts.active,
                  onClick: () => setTypeFilter(typeFilter === 'active' ? 'all' : 'active'),
                  active: typeFilter === 'active',
                },
                {
                  key: 'inactive',
                  label: 'Inactive',
                  value: typeCounts.inactive,
                  onClick: () => setTypeFilter(typeFilter === 'inactive' ? 'all' : 'inactive'),
                  active: typeFilter === 'inactive',
                },
              ]}
            />

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full max-w-sm" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : assignmentRules.length === 0 ? (
                <EmptyState
                  icon={GitBranch}
                  title="No assignment rules yet"
                  description="Rules assign assets to teams automatically, in priority order."
                  action={
                    <Can permission={Permission.AssignmentRulesWrite}>
                      <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="me-2 h-4 w-4" />
                        Create rule
                      </Button>
                    </Can>
                  }
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredData}
                  getRowId={(r) => r.id}
                  showSearch={false}
                  showColumnToggle={false}
                  onRowClick={(r) => setSelectedRuleId(r.id)}
                  toolbarStart={
                    <>
                      <div className="relative min-w-0 flex-1 sm:max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search assignment rules..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="ps-9"
                          aria-label="Search assignment rules"
                        />
                      </div>
                      <Select
                        value={typeFilter}
                        onValueChange={(v) => setTypeFilter(v as FilterType)}
                      >
                        <SelectTrigger className="h-9 w-[140px]" aria-label="Status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {typeFilters.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                  emptyMessage="No assignment rules match these filters"
                />
              )}
            </div>
          </>
        )}
      </Main>

      {/* Detail Sheet */}
      <AssignmentRuleDetailSheet
        ruleId={selectedRuleId}
        open={!!selectedRuleId}
        onOpenChange={(open) => !open && setSelectedRuleId(null)}
        onUpdate={refreshData}
        onDelete={refreshData}
      />

      {/* Create Rule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create assignment rule</DialogTitle>
            <DialogDescription>
              Create a rule to automatically assign assets to a group based on conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Critical assets to Security team"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description (optional)</Label>
              <Textarea
                id="rule-description"
                placeholder="Describe what this rule does..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                type="number"
                value={createForm.priority}
                onChange={(e) =>
                  setCreateForm({ ...createForm, priority: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">Lower numbers have higher priority</p>
            </div>

            <div className="space-y-2">
              <Label>Target team</Label>
              <Select
                value={createForm.target_group_id}
                onValueChange={(v) => setCreateForm({ ...createForm, target_group_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions Builder */}
          <div className="space-y-3 py-2">
            <Label>Conditions (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Assets matching these conditions will be automatically assigned to the target group.
            </p>
            <div className="space-y-3">
              {Object.entries(CONDITION_OPTIONS).map(([condKey, options]) => {
                const selected = createForm.conditions[condKey] || []
                return (
                  <div key={condKey} className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {CONDITION_LABELS[condKey] || condKey}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt) => {
                        const isSelected = selected.includes(opt)
                        return (
                          <Badge
                            key={opt}
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              const newValues = isSelected
                                ? selected.filter((v) => v !== opt)
                                : [...selected, opt]
                              setCreateForm({
                                ...createForm,
                                conditions: {
                                  ...createForm.conditions,
                                  [condKey]: newValues,
                                },
                              })
                            }}
                          >
                            {opt.replace(/_/g, ' ')}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={isCreating || !createForm.name || !createForm.target_group_id}
            >
              {isCreating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="me-2 h-4 w-4" />
              )}
              Create rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete assignment rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{ruleToDelete?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRuleToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

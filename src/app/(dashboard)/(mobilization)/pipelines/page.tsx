'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { Main } from '@/components/layout'
import type { ColumnDef } from '@tanstack/react-table'
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  MetricStrip,
  PageHeader,
  RunStatusBadge,
} from '@/features/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUrlFilter } from '@/hooks/use-url-param'
import { formatRelative } from '@/lib/format-date'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Workflow,
  Play,
  Plus,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Pencil,
  Copy,
  Zap,
  AlertCircle,
  Cloud,
  Server,
  Settings,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'

import { NodePalette } from '@/features/pipelines/components/node-palette'
import { PipelineForm } from '@/features/pipelines/components/pipeline-form'
// Lazy-load the visual builder: it pulls in @xyflow/react (~100KB+) and its
// CSS. Loading it via dynamic() keeps the graph engine out of the pipelines
// route's initial bundle until the builder is actually rendered.
const WorkflowBuilder = dynamic(
  () => import('@/features/pipelines/components/workflow-builder').then((m) => m.WorkflowBuilder),
  { ssr: false }
)
import {
  usePipelines,
  usePipelineRuns,
  useScanManagementStats,
  useTriggerPipelineRun,
  useCreatePipeline,
  invalidateAllPipelineCaches,
  get,
  post,
  put,
  pipelineEndpoints,
  getErrorMessage,
  type PipelineTemplate,
  type PipelineRun,
  type UIPosition,
  type CreatePipelineRequest,
  type UpdatePipelineRequest,
  PIPELINE_TRIGGER_LABELS,
  PIPELINE_SENSOR_PREFERENCE_LABELS,
} from '@/lib/api'

export default function PipelinesPage() {
  // Tab and owner filter live in the URL so a reload or shared link keeps them.
  const [tab, setTab] = useUrlFilter('tab', 'pipelines')
  const [owner, setOwner] = useUrlFilter('owner', 'all')
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineTemplate | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<PipelineTemplate | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Clone dialog state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [cloningPipeline, setCloningPipeline] = useState<PipelineTemplate | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [isCloning, setIsCloning] = useState(false)

  // Fetch data from API
  // Use higher per_page to get accurate stats (total comes from API, but active count needs all items)
  const {
    data: pipelines,
    isLoading: loadingPipelines,
    error: pipelinesError,
  } = usePipelines({ per_page: 100 })
  const { data: pipelineRuns, isLoading: loadingRuns } = usePipelineRuns({ per_page: 10 })
  const { data: stats, isLoading: loadingStats } = useScanManagementStats()

  // Mutations
  const { trigger: triggerRun, isMutating: triggeringRun } = useTriggerPipelineRun()
  const { trigger: createPipeline, isMutating: creatingPipeline } = useCreatePipeline()
  const [updatingPipeline, setUpdatingPipeline] = useState(false)
  const [togglingPipeline, setTogglingPipeline] = useState<string | null>(null)

  const handleTriggerPipeline = async (pipeline: PipelineTemplate) => {
    try {
      await triggerRun({
        template_id: pipeline.id,
        trigger_type: 'manual',
      })
      toast.success(`Pipeline "${pipeline.name}" triggered successfully`)
      await invalidateAllPipelineCaches()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to trigger pipeline "${pipeline.name}"`))
    }
  }

  const handleToggleActive = async (pipeline: PipelineTemplate) => {
    setTogglingPipeline(pipeline.id)
    try {
      if (pipeline.is_active) {
        await post(pipelineEndpoints.deactivate(pipeline.id), {})
        toast.success(`Pipeline "${pipeline.name}" deactivated`)
      } else {
        await post(pipelineEndpoints.activate(pipeline.id), {})
        toast.success(`Pipeline "${pipeline.name}" activated`)
      }
      await invalidateAllPipelineCaches()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to update pipeline "${pipeline.name}"`))
    } finally {
      setTogglingPipeline(null)
    }
  }

  // Open clone dialog with suggested name
  const handleOpenCloneDialog = (pipeline: PipelineTemplate) => {
    setCloningPipeline(pipeline)
    // Suggest name: for system template use original name, for tenant pipeline add (Copy)
    const suggestedName = pipeline.is_system_template ? pipeline.name : `${pipeline.name} (Copy)`
    setCloneName(suggestedName)
    setCloneDialogOpen(true)
  }

  // Execute the clone action
  const handleConfirmClone = async () => {
    if (!cloningPipeline || !cloneName.trim()) return

    setIsCloning(true)
    try {
      await post(pipelineEndpoints.clone(cloningPipeline.id), { name: cloneName.trim() })
      toast.success(
        cloningPipeline.is_system_template
          ? `System template "${cloningPipeline.name}" has been added to your pipelines as "${cloneName.trim()}"`
          : `Pipeline cloned successfully as "${cloneName.trim()}"`
      )
      await invalidateAllPipelineCaches()
      setCloneDialogOpen(false)
      setCloningPipeline(null)
      setCloneName('')
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to clone pipeline "${cloningPipeline.name}"`))
    } finally {
      setIsCloning(false)
    }
  }

  const handleCloseCloneDialog = () => {
    setCloneDialogOpen(false)
    setCloningPipeline(null)
    setCloneName('')
  }

  // Open pipeline detail with full data (including steps)
  const handleOpenPipelineDetail = async (pipeline: PipelineTemplate) => {
    setLoadingDetail(true)
    setSelectedPipeline(pipeline) // Show immediately with basic data
    try {
      const fullPipeline = await get<PipelineTemplate>(pipelineEndpoints.get(pipeline.id))
      setSelectedPipeline(fullPipeline) // Update with full data including steps
    } catch (error) {
      console.error('Failed to fetch pipeline details:', error)
      // Keep showing basic data if fetch fails
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCreatePipeline = async (data: CreatePipelineRequest) => {
    try {
      await createPipeline(data)
      toast.success('Pipeline created successfully')
      await invalidateAllPipelineCaches()
      setIsFormOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create pipeline'))
    }
  }

  const handleUpdatePipeline = async (data: CreatePipelineRequest) => {
    if (!editingPipeline) return
    setUpdatingPipeline(true)
    try {
      await put<PipelineTemplate>(
        pipelineEndpoints.update(editingPipeline.id),
        data as UpdatePipelineRequest
      )
      toast.success(`Pipeline "${editingPipeline.name}" updated`)
      await invalidateAllPipelineCaches()
      setEditingPipeline(null)
      setIsFormOpen(false)
    } catch (error) {
      console.error('Update pipeline error:', error)
      toast.error(getErrorMessage(error, 'Failed to update pipeline'))
    } finally {
      setUpdatingPipeline(false)
    }
  }

  const handleOpenCreateForm = () => {
    setEditingPipeline(null)
    setIsFormOpen(true)
  }

  const handleOpenEditForm = async (pipeline: PipelineTemplate) => {
    // Fetch pipeline with steps from API (list doesn't include steps)
    setLoadingEdit(true)
    try {
      const fullPipeline = await get<PipelineTemplate>(pipelineEndpoints.get(pipeline.id))
      setEditingPipeline(fullPipeline)
      setIsFormOpen(true)
    } catch (error) {
      console.error('Failed to fetch pipeline:', error)
      toast.error(getErrorMessage(error, 'Failed to load pipeline details'))
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleCloseForm = () => {
    setEditingPipeline(null)
    setIsFormOpen(false)
  }

  // Preview mode - position changes are not persisted in the preview
  // Use the dedicated builder page for actual editing: /pipelines/[id]/builder
  const handleNodePositionChange = useCallback(async (_stepId: string, _position: UIPosition) => {
    // Preview mode only - no persistence
  }, [])

  // Calculate stats
  // Split pipelines into tenant-owned and system templates for clearer stats
  const tenantPipelines = pipelines?.items?.filter((p) => !p.is_system_template) ?? []
  const systemTemplates = pipelines?.items?.filter((p) => p.is_system_template) ?? []

  // "My Pipelines" = only tenant-owned pipelines (not system templates)
  const totalPipelines = tenantPipelines.length
  // Active count = only active tenant pipelines
  const activePipelines = tenantPipelines.filter((p) => p.is_active).length
  // System templates count (for display if needed)
  const _totalSystemTemplates = systemTemplates.length

  // Total runs = pipeline runs (from stats.pipelines, not stats.scans)
  const totalRuns = stats?.pipelines.total ?? 0
  // Success rate = completed pipeline runs / total pipeline runs
  const successRate =
    stats && stats.pipelines.total > 0
      ? Math.round((stats.pipelines.completed / stats.pipelines.total) * 100)
      : 0

  const allPipelines = pipelines?.items ?? []
  const visiblePipelines =
    owner === 'mine' ? tenantPipelines : owner === 'system' ? systemTemplates : allPipelines
  const runs = pipelineRuns?.items ?? []
  const pipelineNameById = new Map(allPipelines.map((p) => [p.id, p.name]))

  const triggerText = (pipeline: PipelineTemplate) =>
    pipeline.triggers.map((t) => PIPELINE_TRIGGER_LABELS[t.type]).join(', ') || 'Manual'

  const pipelineColumns: ColumnDef<PipelineTemplate>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pipeline" />,
      cell: ({ row }) => {
        const pipeline = row.original
        return (
          <div className="min-w-0 max-w-[380px]">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{pipeline.name}</p>
              {pipeline.is_system_template && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  System
                </Badge>
              )}
            </div>
            {pipeline.description && (
              <p className="truncate text-xs text-muted-foreground">{pipeline.description}</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      accessorFn: (p) => (p.is_active ? 'active' : 'inactive'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active
            ? 'Active'
            : row.original.is_system_template
              ? 'Unavailable'
              : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'trigger',
      enableSorting: false,
      header: 'Trigger',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {triggerText(row.original)}
        </span>
      ),
    },
    {
      id: 'steps',
      accessorFn: (p) => p.steps?.length ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Steps" />,
      cell: ({ getValue }) => <span className="text-sm tabular-nums">{getValue<number>()}</span>,
    },
    {
      accessorKey: 'version',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">v{row.original.version}</span>
      ),
    },
    {
      id: 'enabled',
      enableSorting: false,
      header: 'Enabled',
      cell: ({ row }) =>
        row.original.is_system_template ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.original.is_active}
              onCheckedChange={() => handleToggleActive(row.original)}
              disabled={togglingPipeline === row.original.id}
              aria-label={row.original.is_active ? 'Deactivate pipeline' : 'Activate pipeline'}
            />
          </div>
        ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const pipeline = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Actions for ${pipeline.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleOpenPipelineDetail(pipeline)}>
                <Eye className="me-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              {pipeline.is_system_template ? (
                <DropdownMenuItem
                  onClick={() => handleOpenCloneDialog(pipeline)}
                  disabled={!pipeline.is_active}
                >
                  <Copy className="me-2 h-4 w-4" />
                  Use template
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleOpenEditForm(pipeline)}
                    disabled={loadingEdit}
                  >
                    {loadingEdit ? (
                      <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="me-2 h-4 w-4" />
                    )}
                    Edit pipeline
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/pipelines/${pipeline.id}/builder`}>
                      <Settings className="me-2 h-4 w-4" />
                      Visual builder
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleTriggerPipeline(pipeline)}
                disabled={triggeringRun || (pipeline.is_system_template && !pipeline.is_active)}
              >
                <Play className="me-2 h-4 w-4" />
                Run now
              </DropdownMenuItem>
              {!pipeline.is_system_template && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenCloneDialog(pipeline)}>
                    <Copy className="me-2 h-4 w-4" />
                    Clone
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const runColumns: ColumnDef<PipelineRun>[] = [
    {
      id: 'pipeline',
      accessorFn: (run) => pipelineNameById.get(run.pipeline_id) ?? 'Pipeline run',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pipeline" />,
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <RunStatusBadge status={row.original.status} />,
    },
    {
      id: 'trigger',
      enableSorting: false,
      header: 'Trigger',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {PIPELINE_TRIGGER_LABELS[row.original.trigger_type] ?? row.original.trigger_type}
        </span>
      ),
    },
    {
      id: 'steps',
      enableSorting: false,
      header: 'Steps',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {row.original.completed_steps}/{row.original.total_steps}
          {row.original.failed_steps > 0 && (
            <span className="ms-1.5 text-destructive">({row.original.failed_steps} failed)</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Started" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatRelative(row.original.created_at)}
        </span>
      ),
    },
  ]

  const tableSkeleton = (
    <div className="space-y-px overflow-hidden rounded-xl border">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-none" />
      ))}
    </div>
  )

  const ownerFilter = (
    <Select value={owner} onValueChange={setOwner}>
      <SelectTrigger className="h-9 w-[160px]" aria-label="Pipeline owner">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All pipelines</SelectItem>
        <SelectItem value="mine">My pipelines</SelectItem>
        <SelectItem value="system">System templates</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Scan pipelines"
          description="Multi-step scans that chain tools together, run on demand or on a schedule."
        >
          <Can permission={Permission.WorkflowsWrite} mode="disable">
            <Button size="sm" onClick={handleOpenCreateForm}>
              <Plus className="me-2 h-4 w-4" />
              New pipeline
            </Button>
          </Can>
        </PageHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="runs">Recent runs</TabsTrigger>
            <TabsTrigger value="builder">Visual builder</TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines" className="mt-5 space-y-5">
            <MetricStrip
              loading={loadingPipelines || loadingStats}
              items={[
                {
                  key: 'mine',
                  label: 'My pipelines',
                  value: totalPipelines,
                  onClick: () => setOwner(owner === 'mine' ? 'all' : 'mine'),
                  active: owner === 'mine',
                },
                { key: 'active', label: 'Active', value: activePipelines },
                {
                  key: 'system',
                  label: 'System templates',
                  value: systemTemplates.length,
                  onClick: () => setOwner(owner === 'system' ? 'all' : 'system'),
                  active: owner === 'system',
                },
                { key: 'runs', label: 'Total runs', value: totalRuns },
                {
                  key: 'success',
                  label: 'Success rate',
                  value: totalRuns > 0 ? `${successRate}%` : '—',
                },
              ]}
            />
            {pipelinesError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to load pipelines</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{getErrorMessage(pipelinesError, 'Please try again.')}</span>
                  <Button variant="outline" size="sm" onClick={() => invalidateAllPipelineCaches()}>
                    <RefreshCw className="me-2 h-4 w-4" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : loadingPipelines ? (
              tableSkeleton
            ) : allPipelines.length === 0 ? (
              <EmptyState
                icon={Workflow}
                title="No pipelines yet"
                description="Create a pipeline to chain scan steps together."
                action={
                  <Can permission={Permission.WorkflowsWrite} mode="disable">
                    <Button size="sm" onClick={handleOpenCreateForm}>
                      <Plus className="me-2 h-4 w-4" />
                      Create pipeline
                    </Button>
                  </Can>
                }
              />
            ) : (
              <DataTable
                columns={pipelineColumns}
                data={visiblePipelines}
                searchKey="name"
                searchPlaceholder="Search pipelines..."
                getRowId={(p) => p.id}
                onRowClick={handleOpenPipelineDetail}
                toolbarEnd={ownerFilter}
                emptyMessage={owner === 'mine' ? 'No custom pipelines yet' : 'No pipelines match'}
                emptyDescription={
                  owner === 'mine'
                    ? 'Create a pipeline, or use a system template as a starting point.'
                    : 'Try a different search or owner filter.'
                }
              />
            )}
          </TabsContent>

          <TabsContent value="runs" className="mt-5">
            {loadingRuns ? (
              tableSkeleton
            ) : runs.length === 0 ? (
              <EmptyState
                icon={Play}
                title="No pipeline runs yet"
                description="Run a pipeline to see its execution history here."
              />
            ) : (
              <DataTable
                columns={runColumns}
                data={runs}
                showSearch={false}
                showColumnToggle={false}
                showPagination={false}
                getRowId={(r) => r.id}
                toolbarStart={
                  <span className="text-sm text-muted-foreground">Latest {runs.length} runs</span>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="builder" className="mt-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Pipeline preview
                      {selectedPipeline && (
                        <Badge variant="secondary" className="font-normal">
                          Read-only
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedPipeline
                        ? `Viewing: ${selectedPipeline.name}`
                        : 'Select a pipeline from the list to preview its workflow'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPipeline(null)}>
                      <RefreshCw className="me-2 h-4 w-4" />
                      Clear
                    </Button>
                    {selectedPipeline && !selectedPipeline.is_system_template && (
                      <Button size="sm" asChild>
                        <Link href={`/pipelines/${selectedPipeline.id}/builder`}>
                          <Pencil className="me-2 h-4 w-4" />
                          Edit in builder
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex h-[600px] border-t">
                  <NodePalette />
                  <div className="flex-1">
                    {selectedPipeline ? (
                      <WorkflowBuilder
                        steps={selectedPipeline.steps || []}
                        onNodePositionChange={handleNodePositionChange}
                        readOnly={true}
                      />
                    ) : (
                      <EmptyState
                        card={false}
                        className="h-full"
                        icon={Workflow}
                        title="No pipeline selected"
                        description="Select a pipeline from the list to preview its workflow."
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* Create/Edit Pipeline Sheet */}
      <Sheet open={isFormOpen} onOpenChange={handleCloseForm}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {editingPipeline ? `Edit: ${editingPipeline.name}` : 'Create pipeline'}
            </SheetTitle>
            <SheetDescription>
              {editingPipeline
                ? 'Modify the pipeline configuration'
                : 'Configure a new scan pipeline with triggers and steps'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <PipelineForm
              pipeline={editingPipeline}
              onSubmit={editingPipeline ? handleUpdatePipeline : handleCreatePipeline}
              onCancel={handleCloseForm}
              isSubmitting={creatingPipeline || updatingPipeline}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Pipeline Detail Sheet */}
      <Sheet open={!!selectedPipeline} onOpenChange={() => setSelectedPipeline(null)}>
        <SheetContent className="sm:max-w-md flex flex-col p-0">
          {selectedPipeline && (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedPipeline.is_system_template ? (
                        <Cloud className="h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <h2 className="text-lg font-semibold truncate">{selectedPipeline.name}</h2>
                    </div>
                    {selectedPipeline.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {selectedPipeline.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {selectedPipeline.is_system_template ? (
                    <Badge variant="secondary" className="text-xs">
                      <Cloud className="me-1 h-3 w-3" />
                      System template
                    </Badge>
                  ) : (
                    <Badge
                      variant={selectedPipeline.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {selectedPipeline.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    v{selectedPipeline.version}
                  </Badge>
                </div>
                {selectedPipeline.is_system_template && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a read-only system template. Use &quot;Add to my pipelines&quot; to
                    create your own editable copy.
                  </p>
                )}
              </div>

              {/* Content - scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Trigger:</span>
                    <span className="font-medium">
                      {selectedPipeline.triggers.length > 0
                        ? selectedPipeline.triggers
                            .map((t) => PIPELINE_TRIGGER_LABELS[t.type])
                            .join(', ')
                        : 'Manual'}
                    </span>
                  </div>
                </div>

                {/* Steps Section */}
                {loadingDetail ? (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Steps</span>
                    <div className="space-y-1.5">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ) : selectedPipeline.steps && selectedPipeline.steps.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Steps ({selectedPipeline.steps.length})
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedPipeline.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{step.name}</span>
                            {step.tool && (
                              <span className="text-xs text-muted-foreground">{step.tool}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">No steps configured</p>
                    {!selectedPipeline.is_system_template && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0"
                        onClick={() => {
                          handleOpenEditForm(selectedPipeline)
                          setSelectedPipeline(null)
                        }}
                      >
                        Add steps →
                      </Button>
                    )}
                  </div>
                )}

                {/* Settings */}
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max parallel</span>
                    <span className="font-medium">
                      {selectedPipeline.settings?.max_parallel_steps || 3} steps
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Timeout</span>
                    <span className="font-medium">
                      {Math.round((selectedPipeline.settings?.timeout_seconds || 3600) / 60)} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sensor</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedPipeline.settings?.sensor_preference === 'platform' ? (
                        <Cloud className="me-1 h-3 w-3" />
                      ) : selectedPipeline.settings?.sensor_preference === 'tenant' ? (
                        <Server className="me-1 h-3 w-3" />
                      ) : (
                        <Settings className="me-1 h-3 w-3" />
                      )}
                      {
                        PIPELINE_SENSOR_PREFERENCE_LABELS[
                          selectedPipeline.settings?.sensor_preference || 'auto'
                        ]
                      }
                    </Badge>
                  </div>
                </div>

                {/* Tags */}
                {selectedPipeline.tags && selectedPipeline.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedPipeline.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t bg-muted/30 flex gap-2">
                {selectedPipeline.is_system_template ? (
                  <>
                    {/* System Template: Show "Add to My Pipelines" as primary action */}
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleOpenCloneDialog(selectedPipeline)
                        setSelectedPipeline(null)
                      }}
                    >
                      <Plus className="me-2 h-4 w-4" />
                      Add to my pipelines
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTriggerPipeline(selectedPipeline)}
                      disabled={triggeringRun}
                      aria-label="Run now"
                      title="Run now"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Tenant Pipeline: Show Run and Edit */}
                    <Button
                      className="flex-1"
                      onClick={() => handleTriggerPipeline(selectedPipeline)}
                      disabled={triggeringRun || !selectedPipeline.is_active}
                    >
                      <Play className="me-2 h-4 w-4" />
                      Run now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleOpenEditForm(selectedPipeline)
                        setSelectedPipeline(null)
                      }}
                      disabled={loadingEdit}
                    >
                      {loadingEdit ? (
                        <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="me-2 h-4 w-4" />
                      )}
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Clone Template Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={handleCloseCloneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cloningPipeline?.is_system_template ? (
                <>
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                  Use system template
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Clone pipeline
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {cloningPipeline?.is_system_template
                ? `Create your own copy of "${cloningPipeline?.name}" in My Pipelines. You can customize it after creation.`
                : `Create a copy of "${cloningPipeline?.name}". The cloned pipeline will appear in My Pipelines.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">Pipeline name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter a name for the new pipeline"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                You can change this name later in the pipeline settings.
              </p>
            </div>
            {cloningPipeline?.is_system_template && (
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertTitle>System template</AlertTitle>
                <AlertDescription>
                  This is a pre-built template. Your copy will be fully editable and independent
                  from the original.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={handleCloseCloneDialog} disabled={isCloning}>
              Cancel
            </Button>
            <Button onClick={handleConfirmClone} disabled={!cloneName.trim() || isCloning}>
              {isCloning ? (
                <>
                  <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : cloningPipeline?.is_system_template ? (
                <>
                  <Plus className="me-2 h-4 w-4" />
                  Add to my pipelines
                </>
              ) : (
                <>
                  <Copy className="me-2 h-4 w-4" />
                  Clone pipeline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

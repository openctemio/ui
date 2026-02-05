'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import '@xyflow/react/dist/style.css'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
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
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Pencil,
  Copy,
  Clock,
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

import { WorkflowBuilder, NodePalette, PipelineForm } from '@/features/pipelines'
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
  type UIPosition,
  type CreatePipelineRequest,
  type UpdatePipelineRequest,
  PIPELINE_RUN_STATUS_LABELS,
  PIPELINE_TRIGGER_LABELS,
  PIPELINE_AGENT_PREFERENCE_LABELS,
} from '@/lib/api'

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  active: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  inactive: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

const runStatusConfig: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  running: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
  timeout: 'bg-orange-500/20 text-orange-400',
}

export default function PipelinesPage() {
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
      console.log('Updating pipeline:', editingPipeline.id)
      console.log('Update data:', JSON.stringify(data, null, 2))
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
      console.log('Fetched pipeline for edit:', fullPipeline)
      console.log('Steps:', fullPipeline.steps)
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

  return (
    <>
      <Main>
        <PageHeader
          title="Scan Pipelines"
          description="Create and manage multi-step scan workflows with visual builder"
        >
          <Can permission={Permission.WorkflowsWrite} mode="disable">
            <Button onClick={handleOpenCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Pipeline
            </Button>
          </Can>
        </PageHeader>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                My Pipelines
              </CardDescription>
              {loadingPipelines ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{totalPipelines}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Active
              </CardDescription>
              {loadingPipelines ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{activePipelines}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Total Runs
              </CardDescription>
              {loadingStats ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{totalRuns}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success Rate
              </CardDescription>
              {loadingStats ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{successRate}%</CardTitle>
              )}
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pipelines" className="mt-6">
          <TabsList>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="runs">Recent Runs</TabsTrigger>
            <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines">
            {pipelinesError ? (
              <Card className="mt-4">
                <CardContent className="py-8">
                  <div className="flex items-center justify-center text-muted-foreground">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Failed to load pipelines
                  </div>
                </CardContent>
              </Card>
            ) : loadingPipelines ? (
              <div className="mt-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {/* My Pipelines Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      <CardTitle>My Pipelines</CardTitle>
                    </div>
                    <CardDescription>
                      Your custom pipelines - fully editable and manageable
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tenantPipelines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Workflow className="mb-2 h-8 w-8" />
                        <p>No custom pipelines yet</p>
                        <p className="text-sm mt-1">
                          Create a new pipeline or use a system template below
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={handleOpenCreateForm}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Pipeline
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tenantPipelines.map((pipeline) => {
                          const status = pipeline.is_active
                            ? statusConfig.active
                            : statusConfig.inactive
                          const triggerLabels = pipeline.triggers
                            .map((t) => PIPELINE_TRIGGER_LABELS[t.type])
                            .join(', ')

                          return (
                            <div
                              key={pipeline.id}
                              className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-medium">{pipeline.name}</h4>
                                  <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                    {pipeline.is_active ? 'active' : 'inactive'}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                  {pipeline.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {triggerLabels || 'Manual'}
                                  </span>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />v{pipeline.version}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {pipeline.steps?.length || 0} steps
                                  </span>
                                </div>
                                {pipeline.tags && pipeline.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {pipeline.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Switch
                                  checked={pipeline.is_active}
                                  onCheckedChange={() => handleToggleActive(pipeline)}
                                  disabled={togglingPipeline === pipeline.id}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleOpenPipelineDetail(pipeline)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenEditForm(pipeline)}
                                      disabled={loadingEdit}
                                    >
                                      {loadingEdit ? (
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Pencil className="mr-2 h-4 w-4" />
                                      )}
                                      Edit Pipeline
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/pipelines/${pipeline.id}/builder`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Visual Builder
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleTriggerPipeline(pipeline)}
                                      disabled={triggeringRun}
                                    >
                                      <Play className="mr-2 h-4 w-4" />
                                      Run Now
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleOpenCloneDialog(pipeline)}
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Clone
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Templates Section */}
                {systemTemplates.length > 0 && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-blue-600 dark:text-blue-400">
                          System Templates
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          Read-only
                        </Badge>
                      </div>
                      <CardDescription>
                        Pre-built pipeline templates by Exploop. Click &quot;Use Template&quot; to
                        create your own copy.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2">
                        {systemTemplates.map((pipeline) => {
                          const triggerLabels = pipeline.triggers
                            .map((t) => PIPELINE_TRIGGER_LABELS[t.type])
                            .join(', ')

                          return (
                            <div
                              key={pipeline.id}
                              className={`flex flex-col rounded-lg border border-dashed p-4 transition-colors ${
                                pipeline.is_active
                                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
                                  : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/20 opacity-75'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Cloud
                                      className={`h-4 w-4 ${pipeline.is_active ? 'text-blue-500' : 'text-gray-400'}`}
                                    />
                                    <h4
                                      className={`font-medium ${pipeline.is_active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
                                    >
                                      {pipeline.name}
                                    </h4>
                                    {/* Status badge for system templates */}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        pipeline.is_active
                                          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400'
                                          : 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                                      }`}
                                    >
                                      {pipeline.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground text-sm line-clamp-2">
                                    {pipeline.description}
                                  </p>
                                  {!pipeline.is_active && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      This template is currently unavailable
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  {triggerLabels || 'Manual'}
                                </span>
                                <span>{pipeline.steps?.length || 0} steps</span>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`flex-1 ${
                                    pipeline.is_active
                                      ? 'border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/50'
                                      : 'border-gray-300 text-gray-500'
                                  }`}
                                  onClick={() => handleOpenCloneDialog(pipeline)}
                                  disabled={!pipeline.is_active}
                                >
                                  <Copy className="mr-2 h-3 w-3" />
                                  Use Template
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPipelineDetail(pipeline)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTriggerPipeline(pipeline)}
                                  disabled={triggeringRun || !pipeline.is_active}
                                  title={
                                    !pipeline.is_active
                                      ? 'Template is not active'
                                      : 'Run this pipeline'
                                  }
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="runs">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent Pipeline Runs</CardTitle>
                <CardDescription>Latest pipeline executions and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRuns ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : pipelineRuns?.items?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Play className="mb-2 h-8 w-8" />
                    <p>No pipeline runs yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pipelineRuns?.items?.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">Pipeline Run</p>
                          <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{PIPELINE_TRIGGER_LABELS[run.trigger_type]}</span>
                            <span>-</span>
                            <span>
                              {run.completed_steps}/{run.total_steps} steps
                            </span>
                          </div>
                        </div>
                        <Badge className={`${runStatusConfig[run.status] || ''} border-0`}>
                          {run.status === 'completed' ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : run.status === 'failed' ? (
                            <XCircle className="mr-1 h-3 w-3" />
                          ) : null}
                          {PIPELINE_RUN_STATUS_LABELS[run.status] || run.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="builder">
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Pipeline Preview
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
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    {selectedPipeline && !selectedPipeline.is_system_template && (
                      <Button size="sm" asChild>
                        <Link href={`/pipelines/${selectedPipeline.id}/builder`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit in Builder
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
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Workflow className="mx-auto mb-4 h-12 w-12" />
                          <p className="text-lg font-medium">No Pipeline Selected</p>
                          <p className="text-sm mt-2">
                            Select a pipeline from the list to preview its workflow
                          </p>
                        </div>
                      </div>
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
              {editingPipeline ? `Edit: ${editingPipeline.name}` : 'Create New Pipeline'}
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
              <div
                className={`px-6 pt-6 pb-4 border-b ${selectedPipeline.is_system_template ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedPipeline.is_system_template ? (
                        <Cloud className="h-5 w-5 shrink-0 text-blue-500" />
                      ) : (
                        <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <h2
                        className={`text-lg font-semibold truncate ${selectedPipeline.is_system_template ? 'text-blue-700 dark:text-blue-300' : ''}`}
                      >
                        {selectedPipeline.name}
                      </h2>
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
                    <Badge className="bg-blue-500/15 text-blue-600 border-0 text-xs">
                      <Cloud className="mr-1 h-3 w-3" />
                      System Template
                    </Badge>
                  ) : (
                    <Badge
                      className={`${selectedPipeline.is_active ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'} border-0 text-xs`}
                    >
                      {selectedPipeline.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    v{selectedPipeline.version}
                  </Badge>
                </div>
                {selectedPipeline.is_system_template && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    This is a read-only system template. Use &quot;Add to My Pipelines&quot; to
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
                    <span className="text-muted-foreground">Max Parallel</span>
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
                    <span className="text-muted-foreground">Agent</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        selectedPipeline.settings?.agent_preference === 'platform'
                          ? 'bg-purple-500/15 text-purple-600'
                          : selectedPipeline.settings?.agent_preference === 'tenant'
                            ? 'bg-blue-500/15 text-blue-600'
                            : ''
                      }`}
                    >
                      {selectedPipeline.settings?.agent_preference === 'platform' ? (
                        <Cloud className="mr-1 h-3 w-3" />
                      ) : selectedPipeline.settings?.agent_preference === 'tenant' ? (
                        <Server className="mr-1 h-3 w-3" />
                      ) : (
                        <Settings className="mr-1 h-3 w-3" />
                      )}
                      {
                        PIPELINE_AGENT_PREFERENCE_LABELS[
                          selectedPipeline.settings?.agent_preference || 'auto'
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
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        handleOpenCloneDialog(selectedPipeline)
                        setSelectedPipeline(null)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add to My Pipelines
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTriggerPipeline(selectedPipeline)}
                      disabled={triggeringRun}
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
                      <Play className="mr-2 h-4 w-4" />
                      Run Now
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
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="mr-2 h-4 w-4" />
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
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Use System Template
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Clone Pipeline
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
              <Label htmlFor="clone-name">Pipeline Name</Label>
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
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-300">
                <div className="flex items-start gap-2">
                  <Cloud className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">System Template</p>
                    <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      This is a pre-built template. Your copy will be fully editable and independent
                      from the original.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={handleCloseCloneDialog} disabled={isCloning}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmClone}
              disabled={!cloneName.trim() || isCloning}
              className={cloningPipeline?.is_system_template ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {isCloning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : cloningPipeline?.is_system_template ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to My Pipelines
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Clone Pipeline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

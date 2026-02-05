'use client'

import { use, useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, ArrowLeft, Cloud, Server, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import {
  WorkflowBuilder,
  NodePalette,
  type AddNodeData,
  type AvailableTool,
} from '@/features/pipelines'
import {
  get,
  put,
  pipelineEndpoints,
  invalidateAllPipelineCaches,
  type PipelineTemplate,
  type PipelineStep,
  type UIPosition,
  type UpdatePipelineRequest,
} from '@/lib/api'
import { useToolsWithConfig } from '@/lib/api/tool-hooks'
import { getErrorMessage } from '@/lib/api/error-handler'
import { generateTempStepId, generateStepKey } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PipelineBuilderPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  // Pipeline data
  const [pipeline, setPipeline] = useState<PipelineTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Local state for steps
  const [localSteps, setLocalSteps] = useState<PipelineStep[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Start/End node positions
  const [startPosition, setStartPosition] = useState<UIPosition | undefined>(undefined)
  const [endPosition, setEndPosition] = useState<UIPosition | undefined>(undefined)

  // Delete confirmation state
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null)

  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Fetch tools for selection
  const { data: toolsData } = useToolsWithConfig({
    is_active: true,
    per_page: 100,
  })

  // Convert tools to AvailableTool format for inline editing (including capabilities)
  // Capabilities are now sourced from the normalized tool_capabilities junction table
  // via migration 000096 which syncs tools.capabilities from the junction table
  const availableTools: AvailableTool[] = useMemo(() => {
    if (!toolsData?.items) return []
    return toolsData.items
      .filter((t) => t.is_enabled && t.tool.is_active && t.is_available)
      .map((t) => ({
        name: t.tool.name,
        displayName: t.tool.display_name || t.tool.name,
        capabilities: t.tool.capabilities || [],
      }))
  }, [toolsData])

  // Load pipeline data
  useEffect(() => {
    async function loadPipeline() {
      try {
        setIsLoading(true)
        const data = await get<PipelineTemplate>(pipelineEndpoints.get(id))
        setPipeline(data)
        setLocalSteps(data.steps || [])
        setStartPosition(data.ui_start_position)
        setEndPosition(data.ui_end_position)
        setError(null)
      } catch (err) {
        console.error('Failed to load pipeline:', err)
        setError('Failed to load pipeline')
      } finally {
        setIsLoading(false)
      }
    }
    loadPipeline()
  }, [id])

  // Handle navigation with unsaved changes
  const handleBack = useCallback(() => {
    if (hasChanges) {
      setPendingNavigation('/pipelines')
      setShowUnsavedDialog(true)
    } else {
      router.push('/pipelines')
    }
  }, [hasChanges, router])

  // Handle discard and navigate
  const handleDiscardAndNavigate = useCallback(() => {
    setShowUnsavedDialog(false)
    setHasChanges(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }, [pendingNavigation, router])

  // Handle steps change
  const handleStepsChange = useCallback((newSteps: PipelineStep[]) => {
    setLocalSteps(newSteps)
    setHasChanges(true)
  }, [])

  // Handle inline step updates (from node editing)
  // Auto-set capabilities when tool changes
  const handleStepUpdate = useCallback(
    (stepId: string, updates: Partial<PipelineStep>) => {
      setLocalSteps((prev) =>
        prev.map((step) => {
          if (step.id !== stepId) return step

          // If tool is being changed, auto-update capabilities from the selected tool
          if (updates.tool !== undefined && updates.tool !== step.tool) {
            // No tool selected - clear capabilities
            if (!updates.tool) {
              return {
                ...step,
                ...updates,
                capabilities: [],
              }
            }
            // Tool selected - get capabilities directly from availableTools array
            const selectedTool = availableTools.find((t) => t.name === updates.tool)
            const toolCapabilities = selectedTool?.capabilities || []
            return {
              ...step,
              ...updates,
              capabilities: toolCapabilities,
            }
          }

          return { ...step, ...updates }
        })
      )
      setHasChanges(true)
    },
    [availableTools]
  )

  // Handle node position change
  const handleNodePositionChange = useCallback((stepId: string, position: UIPosition) => {
    setLocalSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ui_position: position } : step))
    )
    setHasChanges(true)
  }, [])

  // Handle Start/End position changes
  const handleStartPositionChange = useCallback((position: UIPosition) => {
    setStartPosition(position)
    setHasChanges(true)
  }, [])

  const handleEndPositionChange = useCallback((position: UIPosition) => {
    setEndPosition(position)
    setHasChanges(true)
  }, [])

  // Handle add node from palette
  const handleAddNode = useCallback(
    (data: AddNodeData) => {
      const { nodeType, position, label, toolName } = data
      const stepName = label || `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`
      // Use tool name for step_key if available (more meaningful), otherwise use step name
      const stepKeyBase = toolName || stepName
      const stepKey = generateStepKey(stepKeyBase)

      // Get capabilities from availableTools based on toolName
      let stepCapabilities: string[] = []
      if (toolName) {
        const selectedTool = availableTools.find((t) => t.name === toolName)
        stepCapabilities = selectedTool?.capabilities || []
      }

      const newStep: PipelineStep = {
        id: generateTempStepId(), // Temporary ID - backend will assign real UUID on save
        step_key: stepKey,
        name: stepName,
        description: '',
        order: localSteps.length + 1,
        node_type: 'scanner', // All pipeline steps are scanners
        tool: toolName || '', // Pre-fill tool from palette
        capabilities: stepCapabilities,
        timeout_seconds: 3600,
        depends_on: [],
        ui_position: position,
        max_retries: 0,
        retry_delay_seconds: 0,
      }

      setLocalSteps((prev) => [...prev, newStep])
      setHasChanges(true)
    },
    [localSteps.length, availableTools]
  )

  // Handle node delete
  const handleNodeDelete = useCallback((stepId: string) => {
    setDeleteStepId(stepId)
  }, [])

  // Confirm delete
  const handleConfirmDelete = useCallback(() => {
    if (!deleteStepId) return

    const stepToDelete = localSteps.find((s) => s.id === deleteStepId)

    setLocalSteps((prev) => {
      const newSteps = prev.filter((s) => s.id !== deleteStepId)
      return newSteps.map((step, idx) => ({
        ...step,
        depends_on: (step.depends_on || []).filter((d) => d !== stepToDelete?.step_key),
        order: idx + 1,
      }))
    })

    setHasChanges(true)
    setDeleteStepId(null)
    toast.success('Step deleted')
  }, [deleteStepId, localSteps])

  // Handle save
  const handleSave = async () => {
    if (!pipeline) return

    // Validate: all steps must have a tool or capabilities
    if (invalidSteps.length > 0) {
      const stepNames = invalidSteps.map((s) => s.name).join(', ')
      toast.error(`Please select a scanner for: ${stepNames}`)
      return
    }

    setIsSaving(true)
    try {
      const updateData: UpdatePipelineRequest = {
        // Don't send capabilities - backend will derive them from the selected tool
        steps: localSteps.map((s, idx) => ({
          step_key: s.step_key,
          name: s.name,
          description: s.description || undefined,
          order: idx + 1,
          tool: s.tool,
          timeout_seconds: s.timeout_seconds,
          depends_on: s.depends_on || [],
          ui_position: s.ui_position,
        })),
        // Save Start/End node positions
        ui_start_position: startPosition,
        ui_end_position: endPosition,
      }
      await put<PipelineTemplate>(pipelineEndpoints.update(pipeline.id), updateData)
      await invalidateAllPipelineCaches()
      setHasChanges(false)
      toast.success('Pipeline saved successfully')
    } catch (err) {
      console.error('Failed to save pipeline:', err)
      toast.error(getErrorMessage(err, 'Failed to save pipeline'))
    } finally {
      setIsSaving(false)
    }
  }

  const isReadOnly = pipeline?.is_system_template || false

  // Validation: count steps without tool or capabilities
  const invalidSteps = useMemo(() => {
    return localSteps.filter((s) => !s.tool && (!s.capabilities || s.capabilities.length === 0))
  }, [localSteps])

  const hasValidationErrors = invalidSteps.length > 0

  // Loading state
  if (isLoading) {
    return (
      <Main fixed>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64 mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <Skeleton className="w-48 h-full" />
            <Skeleton className="flex-1 h-full" />
          </div>
        </div>
      </Main>
    )
  }

  // Error state
  if (error || !pipeline) {
    return (
      <Main fixed>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium">{error || 'Pipeline not found'}</p>
          <Button variant="outline" asChild>
            <Link href="/pipelines">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pipelines
            </Link>
          </Button>
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main fixed className="p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {pipeline.is_system_template ? (
                <Cloud className="h-5 w-5 text-blue-500 shrink-0" />
              ) : (
                <Server className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate">{pipeline.name}</h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {isReadOnly
                    ? 'Read-only view - Clone to edit'
                    : 'Drag nodes from palette • Connect nodes • Click to edit'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isReadOnly && (
                <Badge className="bg-blue-500/15 text-blue-600 border-0 text-xs">
                  System Template
                </Badge>
              )}
              {hasValidationErrors && !isReadOnly && (
                <Badge variant="outline" className="text-red-600 border-red-600 text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {invalidSteps.length} step{invalidSteps.length > 1 ? 's' : ''} need scanner
                </Badge>
              )}
              {hasChanges && !isReadOnly && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                  Unsaved
                </Badge>
              )}
              {!isReadOnly && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving || hasValidationErrors}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Workflow Canvas */}
            <div className="flex-1 relative">
              <WorkflowBuilder
                steps={localSteps}
                availableTools={availableTools}
                initialStartPosition={startPosition}
                initialEndPosition={endPosition}
                onStepsChange={handleStepsChange}
                onStepUpdate={handleStepUpdate}
                onNodePositionChange={handleNodePositionChange}
                onStartPositionChange={handleStartPositionChange}
                onEndPositionChange={handleEndPositionChange}
                onNodeDelete={isReadOnly ? undefined : handleNodeDelete}
                onAddNode={isReadOnly ? undefined : handleAddNode}
                readOnly={isReadOnly}
              />
            </div>

            {/* Node Palette - Right Side */}
            {!isReadOnly && <NodePalette position="right" />}
          </div>
        </div>
      </Main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Step
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? This action cannot be undone. Any
              dependencies on this step will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardAndNavigate}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

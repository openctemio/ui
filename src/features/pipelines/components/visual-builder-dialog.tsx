'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
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
import {
  Save,
  X,
  Cloud,
  Server,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkflowBuilder, type AvailableTool } from './workflow-builder'
import { NodePalette } from './node-palette'
import type { PipelineTemplate, PipelineStep, UIPosition } from '@/lib/api'
import { getErrorMessage } from '@/lib/api'
import { useToolsWithConfig } from '@/lib/api/tool-hooks'
import { generateTempStepId, generateStepKey } from '@/lib/utils'

interface SaveData {
  steps: PipelineStep[]
  ui_start_position?: UIPosition
  ui_end_position?: UIPosition
}

interface VisualBuilderDialogProps {
  pipeline: PipelineTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: SaveData) => Promise<void>
}

export function VisualBuilderDialog({
  pipeline,
  open,
  onOpenChange,
  onSave,
}: VisualBuilderDialogProps) {
  // Local state for steps (modified version)
  const [localSteps, setLocalSteps] = useState<PipelineStep[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Start/End node positions (persisted with pipeline)
  const [startPosition, setStartPosition] = useState<UIPosition | undefined>(undefined)
  const [endPosition, setEndPosition] = useState<UIPosition | undefined>(undefined)

  // Selected step state (for highlighting/context only, not for edit panel)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null)

  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  // Fetch tools for inline node editing
  const { data: toolsData } = useToolsWithConfig({
    is_active: true,
    per_page: 100,
  })

  // Convert tools to AvailableTool format for inline editing
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

  // Initialize local steps and positions when pipeline changes or dialog opens
  useEffect(() => {
    if (open && pipeline) {
      setLocalSteps([...(pipeline.steps || [])])
      setStartPosition(pipeline.ui_start_position)
      setEndPosition(pipeline.ui_end_position)
      setHasChanges(false)
    } else if (open && !pipeline) {
      setLocalSteps([])
      setStartPosition(undefined)
      setEndPosition(undefined)
      setHasChanges(false)
    }
  }, [open, pipeline])

  // Handle closing
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setShowUnsavedDialog(true)
      return
    }
    onOpenChange(newOpen)
  }

  // Handle closing without saving
  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false)
    setHasChanges(false)
    onOpenChange(false)
  }

  // Handle steps change
  const handleStepsChange = useCallback((newSteps: PipelineStep[]) => {
    setLocalSteps(newSteps)
    setHasChanges(true)
  }, [])

  // Handle inline step updates (from node editing or panel)
  const handleStepUpdate = useCallback((stepId: string, updates: Partial<PipelineStep>) => {
    setLocalSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    )
    setHasChanges(true)
  }, [])

  // Handle Start/End position changes (persisted to pipeline)
  const handleStartPositionChange = useCallback((position: UIPosition) => {
    setStartPosition(position)
    setHasChanges(true)
  }, [])

  const handleEndPositionChange = useCallback((position: UIPosition) => {
    setEndPosition(position)
    setHasChanges(true)
  }, [])

  // Handle node position change
  const handleNodePositionChange = useCallback((stepId: string, position: UIPosition) => {
    setLocalSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ui_position: position } : step
      )
    )
    setHasChanges(true)
  }, [])

  // Handle add node from palette
  const handleAddNode = useCallback(
    (data: { nodeType: string; position: { x: number; y: number }; label?: string; capabilities?: string[]; toolName?: string }) => {
      const { nodeType, position, label, capabilities, toolName } = data
      const stepName = label || `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`
      // Use tool name for step_key if available (more meaningful), otherwise use step name
      const stepKeyBase = toolName || stepName
      const stepKey = generateStepKey(stepKeyBase)

      const newStep: PipelineStep = {
        id: generateTempStepId(), // Temporary ID - backend will assign real UUID on save
        step_key: stepKey,
        name: stepName,
        description: '',
        order: localSteps.length + 1,
        node_type: 'scanner', // All pipeline steps are scanners
        tool: toolName || '', // Pre-fill tool from palette
        capabilities: capabilities || ['scan'],
        timeout_seconds: 3600,
        depends_on: [],
        ui_position: position,
        max_retries: 0,
        retry_delay_seconds: 0,
      }

      setLocalSteps((prev) => [...prev, newStep])
      setHasChanges(true)

      // Select the new node
      setSelectedStepId(newStep.id)
    },
    [localSteps.length]
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
      // Remove the step
      const newSteps = prev.filter((s) => s.id !== deleteStepId)

      // Remove from depends_on of other steps
      return newSteps.map((step) => ({
        ...step,
        depends_on: (step.depends_on || []).filter(
          (d) => d !== stepToDelete?.step_key
        ),
        order: newSteps.indexOf(step) + 1,
      }))
    })

    setHasChanges(true)
    setDeleteStepId(null)

    // Clear selection if deleted step was selected
    if (selectedStepId === deleteStepId) {
      setSelectedStepId(null)
    }

    toast.success('Step deleted')
  }, [deleteStepId, localSteps, selectedStepId])


  // Handle save
  const handleSave = async () => {
    if (!pipeline) return

    setIsSaving(true)
    try {
      await onSave({
        steps: localSteps,
        ui_start_position: startPosition,
        ui_end_position: endPosition,
      })
      setHasChanges(false)
      toast.success('Pipeline saved successfully')
    } catch (error) {
      console.error('Failed to save pipeline:', error)
      toast.error(getErrorMessage(error, 'Failed to save pipeline'))
    } finally {
      setIsSaving(false)
    }
  }

  const isReadOnly = pipeline?.is_system_template || false

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 gap-0 rounded-none border-0 flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {pipeline?.is_system_template ? (
                <Cloud className="h-5 w-5 text-blue-500 shrink-0" />
              ) : (
                <Server className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {pipeline?.name || 'Visual Builder'}
                </h2>
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
              {hasChanges && !isReadOnly && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                  Unsaved
                </Badge>
              )}
              {!isReadOnly && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
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

            {/* Node Palette - Always show on right side */}
            {!isReadOnly && <NodePalette position="right" />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Step
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? This action cannot be
              undone. Any dependencies on this step will be removed.
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
              You have unsaved changes. Are you sure you want to close without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

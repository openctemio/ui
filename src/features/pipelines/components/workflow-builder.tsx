'use client'

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  useUpdateNodeInternals,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ScannerNode, StartNode, EndNode, type ScannerNodeData } from './scanner-node'
import type { PipelineStep, UIPosition } from '@/lib/api'

// ============================================
// TYPES
// ============================================

export interface AddNodeData {
  nodeType: string
  position: { x: number; y: number }
  label?: string
  capabilities?: string[]
  toolName?: string
  toolId?: string
  categoryColor?: string
}

export interface AvailableTool {
  name: string
  displayName: string
  capabilities?: string[]
}

export interface WorkflowBuilderProps {
  steps: PipelineStep[]
  availableTools?: AvailableTool[]
  // Initial positions for Start/End nodes (from pipeline template)
  initialStartPosition?: UIPosition
  initialEndPosition?: UIPosition
  onStepsChange?: (steps: PipelineStep[]) => void
  onStepUpdate?: (stepId: string, updates: Partial<PipelineStep>) => void
  onNodePositionChange?: (stepId: string, position: UIPosition) => void
  // Callbacks for Start/End position changes
  onStartPositionChange?: (position: UIPosition) => void
  onEndPositionChange?: (position: UIPosition) => void
  onNodeDelete?: (stepId: string) => void
  onAddNode?: (data: AddNodeData) => void
  readOnly?: boolean
  className?: string
}

type WorkflowNode = Node<ScannerNodeData | Record<string, unknown>, string>

// Special node IDs for start/end
const START_NODE_ID = '__start__'
const END_NODE_ID = '__end__'

// ============================================
// UTILITIES
// ============================================

// Layout constants
const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const HORIZONTAL_GAP = 80
const VERTICAL_GAP = 40
const START_X = 50
const START_Y = 100

/**
 * Calculate auto-layout positions for steps based on dependency graph.
 * Uses topological sort to determine levels (columns).
 */
function calculateAutoLayout(steps: PipelineStep[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  if (steps.length === 0) return positions

  // Build dependency map: step_key -> step
  const stepsByKey = new Map<string, PipelineStep>()
  steps.forEach(step => stepsByKey.set(step.step_key, step))

  // Calculate level (column) for each step using BFS
  const levels = new Map<string, number>()

  // Find root steps (no dependencies)
  const rootSteps = steps.filter(
    step => !step.depends_on || step.depends_on.length === 0
  )

  // BFS to assign levels
  const queue: { stepKey: string; level: number }[] = []
  rootSteps.forEach(step => {
    queue.push({ stepKey: step.step_key, level: 0 })
    levels.set(step.step_key, 0)
  })

  while (queue.length > 0) {
    const { stepKey, level } = queue.shift()!

    // Find steps that depend on this step
    steps.forEach(step => {
      if (step.depends_on?.includes(stepKey)) {
        const currentLevel = levels.get(step.step_key)
        const newLevel = level + 1

        // Update level if this path is longer
        if (currentLevel === undefined || newLevel > currentLevel) {
          levels.set(step.step_key, newLevel)
          queue.push({ stepKey: step.step_key, level: newLevel })
        }
      }
    })
  }

  // Handle steps with no level assigned (orphans or cycles)
  steps.forEach(step => {
    if (!levels.has(step.step_key)) {
      levels.set(step.step_key, 0)
    }
  })

  // Group steps by level
  const levelGroups = new Map<number, PipelineStep[]>()
  steps.forEach(step => {
    const level = levels.get(step.step_key) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(step)
  })

  // Calculate positions
  const maxLevel = Math.max(...Array.from(levels.values()), 0)

  levelGroups.forEach((stepsInLevel, level) => {
    const x = START_X + 100 + level * (NODE_WIDTH + HORIZONTAL_GAP)
    const totalHeight = stepsInLevel.length * NODE_HEIGHT + (stepsInLevel.length - 1) * VERTICAL_GAP
    const startY = START_Y + (maxLevel > 0 ? 0 : 0) - totalHeight / 2 + NODE_HEIGHT / 2

    stepsInLevel.forEach((step, index) => {
      const y = startY + index * (NODE_HEIGHT + VERTICAL_GAP)
      positions.set(step.id, { x, y: Math.max(START_Y, y) })
    })
  })

  return positions
}

function stepsToEdges(steps: PipelineStep[]): Edge[] {
  const edges: Edge[] = []

  // Find root nodes (steps with no dependencies)
  const rootSteps = steps.filter(
    (step) => !step.depends_on || step.depends_on.length === 0
  )

  // Connect Start node to root steps
  rootSteps.forEach((step) => {
    edges.push({
      id: `${START_NODE_ID}-${step.id}`,
      source: START_NODE_ID,
      target: step.id,
      animated: true,
      style: { stroke: '#10b981' }, // emerald-500
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#10b981',
        width: 20,
        height: 20,
      },
    })
  })

  // Add edges based on depends_on
  steps.forEach((step) => {
    if (step.depends_on && step.depends_on.length > 0) {
      step.depends_on.forEach((dependsOnKey) => {
        const sourceStep = steps.find((s) => s.step_key === dependsOnKey)
        if (sourceStep) {
          edges.push({
            id: `${sourceStep.id}-${step.id}`,
            source: sourceStep.id,
            target: step.id,
            animated: true,
            style: { stroke: '#3b82f6' }, // blue-500
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#3b82f6',
              width: 20,
              height: 20,
            },
          })
        }
      })
    }
  })

  // Find leaf nodes (steps that no other step depends on)
  const leafSteps = steps.filter((step) => {
    return !steps.some(
      (otherStep) =>
        otherStep.depends_on && otherStep.depends_on.includes(step.step_key)
    )
  })

  // Connect leaf steps to End node
  leafSteps.forEach((step) => {
    edges.push({
      id: `${step.id}-${END_NODE_ID}`,
      source: step.id,
      target: END_NODE_ID,
      animated: true,
      style: { stroke: '#ef4444' }, // red-500
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#ef4444',
        width: 20,
        height: 20,
      },
    })
  })

  // If no steps, connect Start directly to End
  if (steps.length === 0) {
    edges.push({
      id: `${START_NODE_ID}-${END_NODE_ID}`,
      source: START_NODE_ID,
      target: END_NODE_ID,
      animated: true,
      style: { stroke: '#94a3b8', strokeDasharray: '5,5' }, // slate-400 dashed
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
        width: 20,
        height: 20,
      },
    })
  }

  return edges
}

// ============================================
// INNER COMPONENT (needs ReactFlowProvider)
// ============================================

function WorkflowBuilderInner({
  steps,
  availableTools = [],
  initialStartPosition,
  initialEndPosition,
  // onStepsChange, // Unused
  onStepUpdate,
  onNodePositionChange,
  onStartPositionChange,
  onEndPositionChange,
  onNodeDelete,
  onAddNode,
  readOnly = false,
  className,
}: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  // Calculate default End node position based on steps (fallback if no saved position)
  const calculateDefaultEndPosition = (stepsData: PipelineStep[]) => {
    const autoPositions = calculateAutoLayout(stepsData)
    const allX = stepsData.map(s => {
      const hasValidPosition = s.ui_position?.x !== undefined
      return hasValidPosition ? s.ui_position!.x : (autoPositions.get(s.id)?.x || 200)
    })
    const maxX = allX.length > 0 ? Math.max(...allX) : START_X + 100
    return { x: maxX + NODE_WIDTH + HORIZONTAL_GAP, y: START_Y + 50 }
  }

  // Store Start/End positions in state
  // Use saved positions from pipeline template if available, otherwise calculate defaults
  const [startEndPositions, setStartEndPositions] = useState(() => ({
    start: initialStartPosition || { x: START_X, y: START_Y + 50 },
    end: initialEndPosition || calculateDefaultEndPosition(steps),
  }))


  // Build all nodes including Start/End
  const buildAllNodes = useCallback((
    scannerNodes: WorkflowNode[],
    startPos: { x: number; y: number },
    endPos: { x: number; y: number }
  ): WorkflowNode[] => {
    const startNode: WorkflowNode = {
      id: START_NODE_ID,
      type: 'start',
      position: startPos,
      data: { label: 'Start' },
      draggable: !readOnly,
      selectable: false,
      deletable: false,
    }

    const endNode: WorkflowNode = {
      id: END_NODE_ID,
      type: 'end',
      position: endPos,
      data: { label: 'End' },
      draggable: !readOnly,
      selectable: false,
      deletable: false,
    }

    return [startNode, ...scannerNodes, endNode]
  }, [readOnly])

  // Initialize nodes - just start/end, scanner nodes will be added by useEffect
  const initialNodes = useMemo(() => {
    return buildAllNodes([], startEndPositions.start, startEndPositions.end)
  }, [buildAllNodes, startEndPositions])

  const initialEdges = useMemo(() => stepsToEdges(steps), [steps])

  const [nodes, setNodes] = useNodesState(initialNodes)
  const [edges, setEdges] = useEdgesState(initialEdges)

  // Sync nodes with steps data, availableTools, and callbacks
  // This is the single source of truth for node data updates
  useEffect(() => {
    setNodes((currentNodes) => {
      const currentStart = currentNodes.find(n => n.id === START_NODE_ID)
      const currentEnd = currentNodes.find(n => n.id === END_NODE_ID)

      const startPos = currentStart?.position || startEndPositions.start
      const endPos = currentEnd?.position || startEndPositions.end

      // Build scanner nodes from steps with full data
      const autoPositions = calculateAutoLayout(steps)
      const scannerNodes: WorkflowNode[] = steps.map((step) => {
        // Preserve current position if node exists, otherwise use saved or auto position
        const existingNode = currentNodes.find(n => n.id === step.id)
        const hasValidPosition = step.ui_position?.x !== undefined && step.ui_position?.y !== undefined
        const autoPos = autoPositions.get(step.id) || { x: 200, y: START_Y }
        const position = existingNode?.position || (hasValidPosition ? { x: step.ui_position!.x, y: step.ui_position!.y } : autoPos)

        // Build available steps for this node (exclude itself)
        const availableStepsForThis = steps
          .filter(s => s.id !== step.id)
          .map(s => ({ stepKey: s.step_key, name: s.name }))

        // Create a unique key based on data that should trigger re-render
        const dataKey = `${step.tool || ''}-${JSON.stringify(step.capabilities || [])}`

        return {
          id: step.id,
          type: 'scanner' as const,
          position,
          data: {
            // Include dataKey to force re-render when tool/capabilities change
            _dataKey: dataKey,
            label: step.name,
            description: step.description,
            tool: step.tool,
            toolDisplayName: step.tool,
            capabilities: step.capabilities,
            stepKey: step.step_key,
            timeout: step.timeout_seconds,
            dependsOn: step.depends_on,
            categoryColor: (step as PipelineStep & { category_color?: string }).category_color,
            availableTools: availableTools,
            availableSteps: availableStepsForThis,
            // Add callbacks if not readOnly
            ...(!readOnly && onStepUpdate ? {
              onLabelChange: (label: string) => {
                onStepUpdate(step.id, { name: label })
              },
              onToolChange: (tool: string) => {
                // Find the selected tool's capabilities and update both tool and capabilities
                const selectedTool = availableTools.find(t => t.name === tool)
                const capabilities = selectedTool?.capabilities || []
                onStepUpdate(step.id, { tool, capabilities })
              },
              onDescriptionChange: (description: string) => {
                onStepUpdate(step.id, { description })
              },
              onStepKeyChange: (step_key: string) => {
                onStepUpdate(step.id, { step_key })
              },
              onTimeoutChange: (timeout_seconds: number) => {
                onStepUpdate(step.id, { timeout_seconds })
              },
            } : {}),
          },
          draggable: !readOnly,
          selectable: true,
        }
      })

      return buildAllNodes(scannerNodes, startPos, endPos)
    })

    setEdges(stepsToEdges(steps))

    // Force update node internals to trigger re-render of node components
    // This is needed because ReactFlow caches node components and may not re-render when only data changes
    steps.forEach(step => {
      updateNodeInternals(step.id)
    })
  }, [steps, availableTools, readOnly, onStepUpdate, setNodes, setEdges, buildAllNodes, startEndPositions, updateNodeInternals])

  // Define node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      scanner: ScannerNode,
      start: StartNode,
      end: EndNode,
    }),
    []
  )

  // Handle node changes (position, selection, etc.)
  const onNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => {
      // Filter out changes for start/end nodes deletion
      const filteredChanges = changes.filter((change) => {
        if (change.type === 'remove') {
          return change.id !== START_NODE_ID && change.id !== END_NODE_ID
        }
        return true
      })

      setNodes((nds) => applyNodeChanges(filteredChanges, nds) as WorkflowNode[])

      // Handle position changes
      filteredChanges.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          // Save Start/End positions to state and notify parent
          if (change.id === START_NODE_ID) {
            const newPos = { x: change.position.x, y: change.position.y }
            setStartEndPositions(prev => ({ ...prev, start: newPos }))
            onStartPositionChange?.(newPos)
          } else if (change.id === END_NODE_ID) {
            const newPos = { x: change.position.x, y: change.position.y }
            setStartEndPositions(prev => ({ ...prev, end: newPos }))
            onEndPositionChange?.(newPos)
          } else if (onNodePositionChange && !readOnly) {
            // Notify parent of scanner node position changes
            onNodePositionChange(change.id, {
              x: change.position.x,
              y: change.position.y,
            })
          }
        }
      })

      // Handle node removal
      if (onNodeDelete && !readOnly) {
        filteredChanges.forEach((change) => {
          if (change.type === 'remove') {
            onNodeDelete(change.id)
          }
        })
      }
    },
    [setNodes, onNodePositionChange, onStartPositionChange, onEndPositionChange, onNodeDelete, readOnly]
  )

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (!readOnly) {
        // Filter out changes for start/end edges
        const filteredChanges = changes.filter((change) => {
          if (change.type === 'remove') {
            const edge = edges.find((e) => e.id === change.id)
            if (edge) {
              return (
                edge.source !== START_NODE_ID &&
                edge.target !== END_NODE_ID
              )
            }
          }
          return true
        })

        setEdges((eds) => applyEdgeChanges(filteredChanges, eds))

        // Handle edge removal - update depends_on
        filteredChanges.forEach((change) => {
          if (change.type === 'remove') {
            const edge = edges.find((e) => e.id === change.id)
            if (edge && edge.source !== START_NODE_ID && edge.target !== END_NODE_ID) {
              const sourceStep = steps.find((s) => s.id === edge.source)
              const targetStep = steps.find((s) => s.id === edge.target)

              if (sourceStep && targetStep && onStepUpdate) {
                // Use onStepUpdate to remove dependency
                onStepUpdate(targetStep.id, {
                  depends_on: (targetStep.depends_on || []).filter(
                    (d) => d !== sourceStep.step_key
                  ),
                })
              }
            }
          }
        })
      }
    },
    [setEdges, readOnly, edges, steps, onStepUpdate]
  )

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!readOnly && connection.source && connection.target) {
        // Don't allow connecting from End or to Start
        if (connection.source === END_NODE_ID || connection.target === START_NODE_ID) {
          return
        }

        // Handle connection FROM Start node - make target a root node (clear depends_on)
        if (connection.source === START_NODE_ID) {
          const targetStep = steps.find((s) => s.id === connection.target)
          if (targetStep && onStepUpdate) {
            // Clear all dependencies to make it a root node
            // (edges from Start are auto-generated for root nodes)
            if (targetStep.depends_on && targetStep.depends_on.length > 0) {
              onStepUpdate(targetStep.id, { depends_on: [] })
            }
          }
          // Don't add edge manually - it will be auto-generated by stepsToEdges
          return
        }

        // Handle connection TO End node - no data update needed
        // (edges to End are auto-generated for leaf nodes)
        if (connection.target === END_NODE_ID) {
          // Don't add edge manually - it will be auto-generated by stepsToEdges
          return
        }

        // Normal step-to-step connection
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              animated: true,
              style: { stroke: '#3b82f6' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
                width: 20,
                height: 20,
              },
            },
            eds
          )
        )

        // Update depends_on for the target step
        const sourceStep = steps.find((s) => s.id === connection.source)
        const targetStep = steps.find((s) => s.id === connection.target)

        if (sourceStep && targetStep && onStepUpdate) {
          const currentDepsOn = targetStep.depends_on || []
          if (!currentDepsOn.includes(sourceStep.step_key)) {
            onStepUpdate(targetStep.id, {
              depends_on: [...currentDepsOn, sourceStep.step_key],
            })
          }
        }
      }
    },
    [setEdges, steps, onStepUpdate, readOnly]
  )

  // Handle node selection (just for highlighting)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Don't select start/end nodes
      if (node.id === START_NODE_ID || node.id === END_NODE_ID) {
        return
      }
      setSelectedNodeId(node.id)
    },
    []
  )

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Handle drag over (allow drop)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (readOnly || !onAddNode) return

      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      // Get additional data from drag
      const label = event.dataTransfer.getData('application/node-label') || undefined
      const capabilitiesJson = event.dataTransfer.getData('application/node-capabilities')
      const capabilities = capabilitiesJson ? JSON.parse(capabilitiesJson) : undefined
      const toolName = event.dataTransfer.getData('application/tool-name') || undefined
      const toolId = event.dataTransfer.getData('application/tool-id') || undefined
      const categoryColor = event.dataTransfer.getData('application/category-color') || undefined

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      onAddNode({ nodeType, position, label, capabilities, toolName, toolId, categoryColor })
    },
    [readOnly, onAddNode, screenToFlowPosition]
  )

  // Handle delete key
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (readOnly) return

      // Don't delete node if user is typing in an input or textarea
      const target = event.target as HTMLElement
      const isEditing = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !isEditing &&
        selectedNodeId &&
        selectedNodeId !== START_NODE_ID &&
        selectedNodeId !== END_NODE_ID &&
        onNodeDelete
      ) {
        event.preventDefault()
        onNodeDelete(selectedNodeId)
        setSelectedNodeId(null)
      }
    },
    [readOnly, selectedNodeId, onNodeDelete]
  )

  // MiniMap node color based on node type
  const nodeColor = useCallback((node: Node) => {
    if (node.type === 'start') return '#10b981' // emerald-500
    if (node.type === 'end') return '#ef4444' // red-500
    return '#64748b' // slate-500
  }, [])

  return (
    <div
      ref={reactFlowWrapper}
      className={`h-full w-full ${className || ''}`}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
        <Controls showInteractive={!readOnly} />
        <MiniMap nodeColor={nodeColor} zoomable pannable />
      </ReactFlow>
    </div>
  )
}

// ============================================
// EXPORTED COMPONENT (with Provider)
// ============================================

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  )
}

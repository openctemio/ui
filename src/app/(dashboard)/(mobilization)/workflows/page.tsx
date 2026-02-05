'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Workflow as WorkflowIcon,
  Play,
  Plus,
  CheckCircle,
  XCircle,
  Zap,
  GitBranch,
  Mail,
  RefreshCw,
  Save,
  Trash2,
  Eye,
  MoreHorizontal,
  Pencil,
  Copy,
  Clock,
  AlertCircle,
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
import { put } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { workflowEndpoints } from '@/lib/api/endpoints'
import {
  useWorkflows,
  useWorkflowRuns,
  useTriggerWorkflow,
  useDeleteWorkflow,
  useCreateWorkflow,
  invalidateWorkflowsCache,
  invalidateWorkflowRunsCache,
} from '@/lib/api/workflow-hooks'
import type {
  Workflow,
  WorkflowRun,
  WorkflowNode as APIWorkflowNode,
  WorkflowEdge as APIWorkflowEdge,
  CreateWorkflowRequest,
  UpdateWorkflowGraphRequest,
  CreateNodeRequest,
  CreateEdgeRequest,
  WorkflowNodeType,
} from '@/lib/api/workflow-types'

// Status configuration
const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  active: { color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Active' },
  inactive: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Inactive' },
  paused: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Paused' },
}

const runStatusConfig: Record<string, { color: string; bgColor: string }> = {
  pending: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  running: { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  completed: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  failed: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  cancelled: { color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
}

// Custom Node Components
function TriggerNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-500/10 p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs font-medium text-green-500">TRIGGER</span>
      </div>
      <p className="text-sm font-medium">{data.label as string}</p>
      {Boolean(data.description) && (
        <p className="text-xs text-muted-foreground mt-1">{data.description as string}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  )
}

function ConditionNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-yellow-500 bg-yellow-500/10 p-3 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded bg-yellow-500 flex items-center justify-center">
          <GitBranch className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs font-medium text-yellow-500">CONDITION</span>
      </div>
      <p className="text-sm font-medium">{data.label as string}</p>
      {Boolean(data.description) && (
        <p className="text-xs text-muted-foreground mt-1">{data.description as string}</p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!bg-green-500 !w-3 !h-3 !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!bg-red-500 !w-3 !h-3 !left-[70%]"
      />
    </div>
  )
}

function ActionNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-blue-500 bg-blue-500/10 p-3 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center">
          <Play className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs font-medium text-blue-500">ACTION</span>
      </div>
      <p className="text-sm font-medium">{data.label as string}</p>
      {Boolean(data.description) && (
        <p className="text-xs text-muted-foreground mt-1">{data.description as string}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}

function NotificationNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-purple-500 bg-purple-500/10 p-3 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded bg-purple-500 flex items-center justify-center">
          <Mail className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs font-medium text-purple-500">NOTIFY</span>
      </div>
      <p className="text-sm font-medium">{data.label as string}</p>
      {Boolean(data.description) && (
        <p className="text-xs text-muted-foreground mt-1">{data.description as string}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}

// Initial nodes and edges for demo
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'New Critical Finding', description: 'Severity >= Critical' },
  },
  {
    id: '2',
    type: 'condition',
    position: { x: 250, y: 180 },
    data: { label: 'Check Asset Criticality', description: 'Is Production Asset?' },
  },
  {
    id: '3',
    type: 'action',
    position: { x: 100, y: 320 },
    data: { label: 'Assign to Senior Engineer', description: 'Auto-assign based on expertise' },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 400, y: 320 },
    data: { label: 'Assign to Regular Queue', description: 'Standard assignment flow' },
  },
  {
    id: '5',
    type: 'notification',
    position: { x: 100, y: 460 },
    data: { label: 'Send Slack Alert', description: '#security-critical channel' },
  },
  {
    id: '6',
    type: 'action',
    position: { x: 100, y: 600 },
    data: { label: 'Create Jira Ticket', description: 'Priority: P1' },
  },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    sourceHandle: 'yes',
    label: 'Yes',
    style: { stroke: '#22c55e' },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    sourceHandle: 'no',
    label: 'No',
    style: { stroke: '#ef4444' },
  },
  { id: 'e3-5', source: '3', target: '5', animated: true },
  { id: 'e5-6', source: '5', target: '6', animated: true },
]

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  notification: NotificationNode,
}

// Draggable node components for sidebar
const nodeTemplates = [
  { type: 'trigger', label: 'Trigger', icon: Zap, color: 'green' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'yellow' },
  { type: 'action', label: 'Action', icon: Play, color: 'blue' },
  { type: 'notification', label: 'Notification', icon: Mail, color: 'purple' },
]

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// Helper to get trigger type display
function getTriggerDisplay(workflow: Workflow): string {
  if (!workflow.nodes || workflow.nodes.length === 0) return 'No trigger configured'
  const triggerNode = workflow.nodes.find((n) => n.node_type === 'trigger')
  if (!triggerNode) return 'No trigger configured'
  const triggerType = triggerNode.config?.trigger_type
  if (!triggerType) return triggerNode.name
  const typeLabels: Record<string, string> = {
    manual: 'Manual',
    schedule: 'Scheduled',
    finding_created: 'Finding Created',
    finding_updated: 'Finding Updated',
    finding_age: 'Finding Age',
    asset_discovered: 'Asset Discovered',
    scan_completed: 'Scan Completed',
    webhook: 'Webhook',
  }
  return typeLabels[triggerType] || triggerType
}

// Helper to get action names from workflow
function getActionNames(workflow: Workflow): string[] {
  if (!workflow.nodes) return []
  return workflow.nodes
    .filter((n) => n.node_type === 'action' || n.node_type === 'notification')
    .map((n) => n.name)
}

// Convert API workflow to ReactFlow nodes/edges
function convertToReactFlowFormat(
  nodes: APIWorkflowNode[] | undefined,
  edges: APIWorkflowEdge[] | undefined
): { nodes: Node[]; edges: Edge[] } {
  if (!nodes || nodes.length === 0) {
    return { nodes: initialNodes, edges: initialEdges }
  }

  const rfNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    type: n.node_type,
    position: { x: n.ui_position.x, y: n.ui_position.y },
    data: {
      label: n.name,
      description: n.description || '',
      nodeKey: n.node_key,
      config: n.config,
    },
  }))

  const rfEdges: Edge[] = (edges || []).map((e) => ({
    id: e.id,
    source: nodes.find((n) => n.node_key === e.source_node_key)?.id || e.source_node_key,
    target: nodes.find((n) => n.node_key === e.target_node_key)?.id || e.target_node_key,
    sourceHandle: e.source_handle || undefined,
    label: e.label || undefined,
    animated: true,
  }))

  return { nodes: rfNodes, edges: rfEdges }
}

// Convert ReactFlow nodes/edges to API format for saving
function convertToAPIFormat(
  rfNodes: Node[],
  rfEdges: Edge[]
): { nodes: CreateNodeRequest[]; edges: CreateEdgeRequest[] } {
  // Create a mapping from ReactFlow id to node_key
  const idToKeyMap = new Map<string, string>()

  const nodes: CreateNodeRequest[] = rfNodes.map((n, index) => {
    // Use existing nodeKey from data if available, otherwise generate one
    const nodeKey = (n.data?.nodeKey as string) || `${n.type}_${index + 1}`
    idToKeyMap.set(n.id, nodeKey)

    // Build config based on node type
    const existingConfig = (n.data?.config as Record<string, unknown>) || {}
    const config: Record<string, unknown> = { ...existingConfig }
    if (n.type === 'trigger' && !config.trigger_type) {
      config.trigger_type = 'manual'
    }

    return {
      node_key: nodeKey,
      node_type: n.type as WorkflowNodeType,
      name: (n.data?.label as string) || `${n.type} node`,
      description: (n.data?.description as string) || undefined,
      ui_position: { x: n.position.x, y: n.position.y },
      config,
    }
  })

  const edges: CreateEdgeRequest[] = rfEdges.map((e) => ({
    source_node_key: idToKeyMap.get(e.source) || e.source,
    target_node_key: idToKeyMap.get(e.target) || e.target,
    source_handle: e.sourceHandle || undefined,
    label: (e.label as string) || undefined,
  }))

  return { nodes, edges }
}

// Workflow card component for the trigger mutation
function WorkflowTriggerButton({
  workflowId,
  workflowName,
}: {
  workflowId: string
  workflowName: string
}) {
  const { trigger, isMutating } = useTriggerWorkflow(workflowId)

  const handleRun = async () => {
    try {
      await trigger({ trigger_type: 'manual' })
      toast.success(`Workflow "${workflowName}" triggered successfully`)
      await invalidateWorkflowRunsCache()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to trigger workflow "${workflowName}"`))
    }
  }

  return (
    <DropdownMenuItem onClick={handleRun} disabled={isMutating}>
      <Play className="mr-2 h-4 w-4" />
      {isMutating ? 'Running...' : 'Run Now'}
    </DropdownMenuItem>
  )
}

export default function WorkflowsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('')

  // Visual Builder state
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveWorkflowName, setSaveWorkflowName] = useState('')
  const [saveWorkflowDescription, setSaveWorkflowDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Fetch workflows from API
  const {
    data: workflowsData,
    isLoading: workflowsLoading,
    error: workflowsError,
  } = useWorkflows({ per_page: 50 })

  // Fetch recent workflow runs
  const { data: runsData, isLoading: runsLoading } = useWorkflowRuns({ per_page: 10 })

  // Delete workflow mutation
  const { trigger: deleteWorkflow, isMutating: isDeleting } = useDeleteWorkflow(
    deleteWorkflowId || ''
  )

  // Create workflow mutation
  const { trigger: createWorkflow, isMutating: isCreating } = useCreateWorkflow()

  // Compute stats from workflow data
  const workflowStats = useMemo(() => {
    if (!workflowsData?.items) {
      return { totalWorkflows: 0, active: 0, triggered: 0, successRate: 0 }
    }
    const items = workflowsData.items
    const totalWorkflows = items.length
    const active = items.filter((w) => w.is_active).length
    const triggered = items.reduce((sum, w) => sum + w.total_runs, 0)
    const successful = items.reduce((sum, w) => sum + w.successful_runs, 0)
    const successRate = triggered > 0 ? Math.round((successful / triggered) * 100) : 0
    return { totalWorkflows, active, triggered, successRate }
  }, [workflowsData])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  )

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type}`, description: 'Configure this node' },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleSaveWorkflow = () => {
    // Check if we have at least one trigger node
    const hasTrigger = nodes.some((n) => n.type === 'trigger')
    if (!hasTrigger) {
      toast.error('Workflow must have at least one trigger node')
      return
    }

    if (editingWorkflow) {
      // Editing existing workflow - save directly
      handleSaveExistingWorkflow()
    } else {
      // New workflow - open save dialog to get name
      setSaveWorkflowName('')
      setSaveWorkflowDescription('')
      setIsSaveDialogOpen(true)
    }
  }

  const handleSaveExistingWorkflow = async () => {
    if (!editingWorkflow) return

    setIsSaving(true)
    try {
      const { nodes: apiNodes, edges: apiEdges } = convertToAPIFormat(nodes, edges)

      // Use the atomic graph update API to replace all nodes and edges
      const request: UpdateWorkflowGraphRequest = {
        name: editingWorkflow.name,
        description: editingWorkflow.description,
        tags: editingWorkflow.tags,
        nodes: apiNodes,
        edges: apiEdges,
      }

      // Atomic update - replaces entire graph in a single transaction
      await put<Workflow>(workflowEndpoints.updateGraph(editingWorkflow.id), request)

      toast.success(`Workflow "${editingWorkflow.name}" saved successfully`)
      await invalidateWorkflowsCache()
      setEditingWorkflow(null)
    } catch (err) {
      console.error('Failed to save workflow:', err)
      toast.error(getErrorMessage(err, 'Failed to save workflow'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNewWorkflow = async () => {
    if (!saveWorkflowName.trim()) {
      toast.error('Please enter a workflow name')
      return
    }

    setIsSaving(true)
    try {
      const { nodes: apiNodes, edges: apiEdges } = convertToAPIFormat(nodes, edges)

      const request: CreateWorkflowRequest = {
        name: saveWorkflowName.trim(),
        description: saveWorkflowDescription.trim() || undefined,
        nodes: apiNodes,
        edges: apiEdges,
      }

      const newWorkflow = await createWorkflow(request)
      toast.success(`Workflow "${saveWorkflowName}" created successfully`)
      await invalidateWorkflowsCache()

      // Set as editing workflow so future saves update this workflow
      if (newWorkflow) {
        setEditingWorkflow(newWorkflow)
      }

      setIsSaveDialogOpen(false)
      setSaveWorkflowName('')
      setSaveWorkflowDescription('')
    } catch (err) {
      console.error('Failed to create workflow:', err)
      toast.error(getErrorMessage(err, 'Failed to create workflow'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    setDeleteWorkflowId(workflow.id)
    try {
      await deleteWorkflow()
      toast.success(`Deleted workflow: ${workflow.name}`)
      await invalidateWorkflowsCache()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete workflow: ${workflow.name}`))
    } finally {
      setDeleteWorkflowId(null)
    }
  }

  const handleToggleWorkflow = useCallback(async (workflow: Workflow, enabled: boolean) => {
    try {
      const response = await fetch(`/api/v1/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: enabled }),
      })
      if (!response.ok) throw new Error('Failed to update workflow')
      toast.success(`Workflow ${enabled ? 'activated' : 'deactivated'}: ${workflow.name}`)
      await invalidateWorkflowsCache()
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          `Failed to ${enabled ? 'activate' : 'deactivate'} workflow: ${workflow.name}`
        )
      )
    }
  }, [])

  const handleViewWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
  }

  const handleEditInBuilder = (workflow: Workflow) => {
    // Load the workflow into the visual builder for editing
    setEditingWorkflow(workflow)
    if (workflow.nodes && workflow.nodes.length > 0) {
      const { nodes: rfNodes, edges: rfEdges } = convertToReactFlowFormat(
        workflow.nodes,
        workflow.edges
      )
      setNodes(rfNodes)
      setEdges(rfEdges)
    } else {
      // Empty workflow - start with a single trigger
      setNodes([
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: 'Manual Trigger',
            description: 'Start here',
            nodeKey: 'trigger_1',
            config: { trigger_type: 'manual' },
          },
        },
      ])
      setEdges([])
    }
    setSelectedWorkflow(null)
    // Switch to builder tab (user needs to click manually for now)
    toast.info(`Loaded "${workflow.name}" into builder. Switch to Visual Builder tab to edit.`)
  }

  const _handleNewInBuilder = () => {
    // Clear current editing state and reset to default
    setEditingWorkflow(null)
    setNodes(initialNodes)
    setEdges(initialEdges)
    toast.info('Ready to create new workflow in Visual Builder')
  }

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error('Please enter a workflow name')
      return
    }

    try {
      // Create workflow with a default manual trigger node
      const request: CreateWorkflowRequest = {
        name: newWorkflowName.trim(),
        description: newWorkflowDescription.trim() || undefined,
        nodes: [
          {
            node_key: 'trigger_1',
            node_type: 'trigger',
            name: 'Manual Trigger',
            description: 'Manually triggered workflow',
            ui_position: { x: 250, y: 50 },
            config: {
              trigger_type: 'manual',
            },
          },
        ],
        edges: [],
      }

      await createWorkflow(request)
      toast.success(`Workflow "${newWorkflowName}" created successfully`)
      await invalidateWorkflowsCache()
      setIsCreateDialogOpen(false)
      setNewWorkflowName('')
      setNewWorkflowDescription('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create workflow'))
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Automation Workflows"
          description="Create and manage automated security response workflows"
        >
          <Can permission={Permission.WorkflowsWrite} mode="disable">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </Can>
        </PageHeader>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <WorkflowIcon className="h-4 w-4" />
                Total Workflows
              </CardDescription>
              {workflowsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{workflowStats.totalWorkflows}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Active
              </CardDescription>
              {workflowsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{workflowStats.active}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Total Triggered
              </CardDescription>
              {workflowsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{workflowStats.triggered}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success Rate
              </CardDescription>
              {workflowsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-500">
                  {workflowStats.successRate}%
                </CardTitle>
              )}
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="workflows" className="mt-6">
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="executions">Recent Executions</TabsTrigger>
            <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Configured Workflows</CardTitle>
                <CardDescription>Manage your automation workflows</CardDescription>
              </CardHeader>
              <CardContent>
                {workflowsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-96 mb-2" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    ))}
                  </div>
                ) : workflowsError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <p className="text-lg font-medium">Failed to load workflows</p>
                    <p className="text-muted-foreground">Please try again later</p>
                  </div>
                ) : !workflowsData?.items || workflowsData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <WorkflowIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No workflows yet</p>
                    <p className="text-muted-foreground mb-4">
                      Create your first automation workflow
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workflow
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowsData.items.map((workflow) => {
                      const status = workflow.is_active
                        ? statusConfig['active']
                        : statusConfig['inactive']
                      const successRate =
                        workflow.total_runs > 0
                          ? Math.round((workflow.successful_runs / workflow.total_runs) * 100)
                          : 0
                      return (
                        <div
                          key={workflow.id}
                          className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{workflow.name}</h4>
                              <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {workflow.description || 'No description'}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {getTriggerDisplay(workflow)}
                              </span>
                              {workflow.last_run_at && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last: {formatRelativeTime(workflow.last_run_at)}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                {workflow.total_runs} runs ({successRate}% success)
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getActionNames(workflow)
                                .slice(0, 3)
                                .map((action, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {action}
                                  </Badge>
                                ))}
                              {getActionNames(workflow).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{getActionNames(workflow).length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Switch
                              checked={workflow.is_active}
                              onCheckedChange={(checked) => handleToggleWorkflow(workflow, checked)}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewWorkflow(workflow)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditInBuilder(workflow)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit in Builder
                                </DropdownMenuItem>
                                <WorkflowTriggerButton
                                  workflowId={workflow.id}
                                  workflowName={workflow.name}
                                />
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-400"
                                  onClick={() => handleDeleteWorkflow(workflow)}
                                  disabled={isDeleting && deleteWorkflowId === workflow.id}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {isDeleting && deleteWorkflowId === workflow.id
                                    ? 'Deleting...'
                                    : 'Delete'}
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
          </TabsContent>

          <TabsContent value="executions">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Latest workflow runs and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {runsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : !runsData?.items || runsData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No executions yet</p>
                    <p className="text-muted-foreground">Run a workflow to see execution history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {runsData.items.map((run: WorkflowRun) => {
                      const runStatus = runStatusConfig[run.status] || runStatusConfig['pending']
                      const duration =
                        run.started_at && run.completed_at
                          ? `${((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1)}s`
                          : run.started_at
                            ? 'Running...'
                            : 'Pending'
                      return (
                        <div
                          key={run.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">Workflow Run</p>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>{duration}</span>
                              <span>-</span>
                              <span>{formatRelativeTime(run.created_at)}</span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {run.completed_nodes}/{run.total_nodes} nodes completed
                              {run.failed_nodes > 0 && (
                                <span className="text-red-400 ml-2">
                                  ({run.failed_nodes} failed)
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={`${runStatus.bgColor} ${runStatus.color} border-0`}>
                            {run.status === 'completed' ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : run.status === 'failed' ? (
                              <XCircle className="mr-1 h-3 w-3" />
                            ) : null}
                            {run.status}
                          </Badge>
                        </div>
                      )
                    })}
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
                      Visual Workflow Builder
                      {editingWorkflow && (
                        <Badge variant="secondary" className="font-normal">
                          Editing: {editingWorkflow.name}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {editingWorkflow
                        ? 'Make changes and click Save to update the workflow'
                        : 'Drag and drop to create workflows'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {editingWorkflow && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingWorkflow(null)
                          setNodes(initialNodes)
                          setEdges(initialEdges)
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNodes(initialNodes)
                        setEdges(initialEdges)
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleSaveWorkflow} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : editingWorkflow ? 'Save Changes' : 'Save Workflow'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex h-[600px] border-t">
                  {/* Sidebar with node templates */}
                  <div className="w-64 border-r p-4 bg-muted/30">
                    <h4 className="font-medium mb-4">Components</h4>
                    <div className="space-y-2">
                      {nodeTemplates.map((template) => (
                        <div
                          key={template.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, template.type)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab hover:shadow-md transition-shadow bg-card ${
                            template.color === 'green'
                              ? 'border-green-500/50 hover:border-green-500'
                              : template.color === 'yellow'
                                ? 'border-yellow-500/50 hover:border-yellow-500'
                                : template.color === 'blue'
                                  ? 'border-blue-500/50 hover:border-blue-500'
                                  : 'border-purple-500/50 hover:border-purple-500'
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded flex items-center justify-center ${
                              template.color === 'green'
                                ? 'bg-green-500'
                                : template.color === 'yellow'
                                  ? 'bg-yellow-500'
                                  : template.color === 'blue'
                                    ? 'bg-blue-500'
                                    : 'bg-purple-500'
                            }`}
                          >
                            <template.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">{template.label}</span>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <h4 className="font-medium mb-4">Quick Actions</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Drag components to the canvas to build your workflow.</p>
                      <p>Connect nodes by dragging from one handle to another.</p>
                    </div>
                  </div>

                  {/* ReactFlow Canvas */}
                  <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      nodeTypes={nodeTypes}
                      fitView
                      className="bg-background"
                    >
                      <Background />
                      <Controls />
                      <MiniMap
                        nodeColor={(node) => {
                          switch (node.type) {
                            case 'trigger':
                              return '#22c55e'
                            case 'condition':
                              return '#eab308'
                            case 'action':
                              return '#3b82f6'
                            case 'notification':
                              return '#a855f7'
                            default:
                              return '#64748b'
                          }
                        }}
                      />
                    </ReactFlow>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* Workflow Detail Sheet */}
      <Sheet open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <WorkflowIcon className="h-5 w-5" />
              {selectedWorkflow?.name}
            </SheetTitle>
            <SheetDescription>{selectedWorkflow?.description || 'No description'}</SheetDescription>
          </SheetHeader>
          {selectedWorkflow && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={`${selectedWorkflow.is_active ? statusConfig['active'].bgColor : statusConfig['inactive'].bgColor} ${selectedWorkflow.is_active ? statusConfig['active'].color : statusConfig['inactive'].color} border-0`}
                >
                  {selectedWorkflow.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{selectedWorkflow.total_runs} runs</Badge>
                <Badge variant="outline">
                  {selectedWorkflow.total_runs > 0
                    ? Math.round(
                        (selectedWorkflow.successful_runs / selectedWorkflow.total_runs) * 100
                      )
                    : 0}
                  % success
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Trigger</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span>{getTriggerDisplay(selectedWorkflow)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Actions</Label>
                <div className="space-y-2">
                  {getActionNames(selectedWorkflow).length > 0 ? (
                    getActionNames(selectedWorkflow).map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border">
                        <Play className="h-4 w-4 text-blue-500" />
                        <span>{action}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No actions configured</p>
                  )}
                </div>
              </div>

              {selectedWorkflow.tags && selectedWorkflow.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedWorkflow.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">{selectedWorkflow.total_runs}</p>
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {selectedWorkflow.total_runs > 0
                      ? Math.round(
                          (selectedWorkflow.successful_runs / selectedWorkflow.total_runs) * 100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>

              <div className="flex gap-2">
                <WorkflowRunButton workflow={selectedWorkflow} className="flex-1" />
                <Button variant="outline" onClick={() => setSelectedWorkflow(null)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Create a new automation workflow. You can add nodes and configure triggers in the
              visual builder after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., Critical Finding Response"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description (optional)</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this workflow does..."
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={isCreating || !newWorkflowName.trim()}>
              {isCreating ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Workflow Dialog (from Visual Builder) */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Save your workflow design. The workflow will include {nodes.length} node(s) and{' '}
              {edges.length} connection(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-workflow-name">Name</Label>
              <Input
                id="save-workflow-name"
                placeholder="e.g., Critical Finding Response"
                value={saveWorkflowName}
                onChange={(e) => setSaveWorkflowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-workflow-description">Description (optional)</Label>
              <Textarea
                id="save-workflow-description"
                placeholder="Describe what this workflow does..."
                value={saveWorkflowDescription}
                onChange={(e) => setSaveWorkflowDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">Workflow Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Triggers: {nodes.filter((n) => n.type === 'trigger').length}</div>
                <div>Conditions: {nodes.filter((n) => n.type === 'condition').length}</div>
                <div>Actions: {nodes.filter((n) => n.type === 'action').length}</div>
                <div>Notifications: {nodes.filter((n) => n.type === 'notification').length}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewWorkflow} disabled={isSaving || !saveWorkflowName.trim()}>
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Separate component for the run button in the sheet
function WorkflowRunButton({ workflow, className }: { workflow: Workflow; className?: string }) {
  const { trigger, isMutating } = useTriggerWorkflow(workflow.id)

  const handleRun = async () => {
    try {
      await trigger({ trigger_type: 'manual' })
      toast.success(`Workflow "${workflow.name}" triggered successfully`)
      await invalidateWorkflowRunsCache()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to trigger workflow "${workflow.name}"`))
    }
  }

  return (
    <Button className={className} onClick={handleRun} disabled={isMutating}>
      <Play className="mr-2 h-4 w-4" />
      {isMutating ? 'Running...' : 'Run Now'}
    </Button>
  )
}

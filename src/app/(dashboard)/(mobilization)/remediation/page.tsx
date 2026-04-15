'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, SeverityBadge, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import {
  Plus,
  Download,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  CheckCircle,
  ArrowRight,
  X,
  ListTodo,
  Calendar,
  Copy,
  Play,
  CalendarIcon,
  Save,
  Ban,
  RotateCcw,
  ExternalLink,
  Clock,
  Hash,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { Can, Permission } from '@/lib/permissions'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/features/remediation'
import {
  useRemediationCampaigns,
  useCreateRemediationCampaign,
} from '@/features/remediation/api/use-remediation-campaigns'
import { getErrorMessage } from '@/lib/api/error-handler'
import { patch, del } from '@/lib/api/client'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { TaskStatus, TaskPriority, RemediationTask } from '@/features/remediation/types'
import type { Severity } from '@/features/shared/types'

// ─── Constants & Helpers ─────────────────────────────────────────────

interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  severity: Severity
  assigneeName: string
  dueDate: Date | undefined
  findingId: string
  estimatedHours: string
}

const emptyFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  severity: 'medium',
  assigneeName: '',
  dueDate: undefined,
  findingId: '',
  estimatedHours: '',
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
}

const statusColors: Record<TaskStatus, string> = {
  open: 'bg-gray-500 text-white',
  in_progress: 'bg-blue-500 text-white',
  review: 'bg-purple-500 text-white',
  completed: 'bg-green-500 text-white',
  blocked: 'bg-red-500 text-white',
}

const statusDotColors: Record<TaskStatus, string> = {
  open: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  completed: 'bg-green-500',
  blocked: 'bg-red-500',
}

interface Filters {
  priorities: TaskPriority[]
  statuses: TaskStatus[]
  assignees: string[]
}

const defaultFilters: Filters = {
  priorities: [],
  statuses: [],
  assignees: [],
}

/** Safely format a date string. Returns null if invalid. */
function safeFormatDate(
  dateStr: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Relative time ago from now. */
function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return safeFormatDate(dateStr, { month: 'short', day: 'numeric' })
}

/** Days until/overdue. */
function daysUntil(dateStr: string | null | undefined): { days: number; overdue: boolean } | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return { days: Math.abs(days), overdue: days < 0 }
}

/** Map API priority values to TaskPriority. */
function normalizePriority(value: string): TaskPriority {
  if (value === 'critical') return 'urgent'
  if (['urgent', 'high', 'medium', 'low'].includes(value)) return value as TaskPriority
  return 'medium'
}

/** Map API status values to TaskStatus. */
function normalizeStatus(value: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    active: 'in_progress',
    draft: 'open',
    paused: 'blocked',
    validating: 'review',
    completed: 'completed',
    canceled: 'completed',
  }
  return map[value] ?? (value as TaskStatus)
}

/** Get initials from name. */
function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Check if task is overdue */
function checkOverdue(task: RemediationTask): boolean {
  if (!task.dueDate || task.status === 'completed') return false
  const d = new Date(task.dueDate)
  return !isNaN(d.getTime()) && d < new Date()
}

/** Context-aware status actions */
function getAvailableActions(status: TaskStatus) {
  switch (status) {
    case 'open':
      return [
        { action: 'start', label: 'Start Task', icon: Play, variant: 'default' as const },
        { action: 'block', label: 'Block', icon: Ban, variant: 'outline' as const },
      ]
    case 'in_progress':
      return [
        { action: 'complete', label: 'Complete', icon: CheckCircle, variant: 'default' as const },
        { action: 'block', label: 'Block', icon: Ban, variant: 'outline' as const },
      ]
    case 'review':
      return [
        { action: 'complete', label: 'Approve', icon: CheckCircle, variant: 'default' as const },
        { action: 'reopen', label: 'Reopen', icon: RotateCcw, variant: 'outline' as const },
      ]
    case 'blocked':
      return [{ action: 'start', label: 'Unblock', icon: Play, variant: 'default' as const }]
    case 'completed':
      return [{ action: 'reopen', label: 'Reopen', icon: RotateCcw, variant: 'outline' as const }]
    default:
      return []
  }
}

// ─── Main Component ──────────────────────────────────────────────────

export default function RemediationPage() {
  const router = useRouter()

  // API data
  const { data: findingsData } = useFindingsApi({
    per_page: 20,
    statuses: ['new', 'confirmed', 'in_progress'],
  })
  const findings = findingsData?.data ?? []

  const {
    data: campaignData,
    isLoading,
    error: fetchError,
    mutate: refreshCampaigns,
  } = useRemediationCampaigns()
  const { trigger: createCampaign } = useCreateRemediationCampaign()

  const tasks: RemediationTask[] = useMemo(() => {
    if (!campaignData?.data?.length) return []
    return campaignData.data.map((c) => ({
      id: c.id,
      title: c.name,
      description: c.description || '',
      status: normalizeStatus(c.status),
      priority: normalizePriority(c.priority),
      findingId: '',
      findingTitle: `${c.finding_count} finding${c.finding_count !== 1 ? 's' : ''} linked`,
      severity: (c.priority === 'critical' ? 'critical' : c.priority) as Severity,
      assigneeId: c.assigned_to || '',
      assigneeName: c.assigned_team || '',
      dueDate: c.due_date || '',
      completedAt: c.completed_at || undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      finding_count: c.finding_count,
      resolved_count: c.resolved_count,
      progress: c.progress,
      is_overdue: c.is_overdue,
      tags: c.tags || [],
    })) as RemediationTask[]
  }, [campaignData])

  // ─── Computed ────────────────────────────────────────────────────

  const stats = useMemo(
    () => ({
      total: tasks.length,
      byStatus: {
        open: tasks.filter((t) => t.status === 'open').length,
        in_progress: tasks.filter((t) => t.status === 'in_progress').length,
        review: tasks.filter((t) => t.status === 'review').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      overdue: tasks.filter((t) => checkOverdue(t)).length,
    }),
    [tasks]
  )

  const tasksByStatus = useMemo(
    () => ({
      open: tasks.filter((t) => t.status === 'open'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      completed: tasks.filter((t) => t.status === 'completed'),
      blocked: tasks.filter((t) => t.status === 'blocked'),
    }),
    [tasks]
  )

  // ─── State ───────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [quickFilter, setQuickFilter] = useState('all')
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewTask, setViewTask] = useState<RemediationTask | null>(null)
  const [editTask, setEditTask] = useState<RemediationTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<RemediationTask | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData)
  const [dueDateOpen, setDueDateOpen] = useState(false)

  const assignees = useMemo(
    () => [...new Set(tasks.map((t) => t.assigneeName).filter(Boolean))],
    [tasks]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.priorities.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.assignees.length > 0) count++
    return count
  }, [filters])

  const filteredData = useMemo(() => {
    let data = [...tasks]

    if (quickFilter === 'open') data = data.filter((t) => t.status === 'open')
    else if (quickFilter === 'in_progress') data = data.filter((t) => t.status === 'in_progress')
    else if (quickFilter === 'review') data = data.filter((t) => t.status === 'review')
    else if (quickFilter === 'blocked') data = data.filter((t) => t.status === 'blocked')
    else if (quickFilter === 'overdue') data = data.filter((t) => checkOverdue(t))

    if (filters.priorities.length > 0)
      data = data.filter((t) => filters.priorities.includes(t.priority))
    if (filters.statuses.length > 0) data = data.filter((t) => filters.statuses.includes(t.status))
    if (filters.assignees.length > 0)
      data = data.filter((t) => filters.assignees.includes(t.assigneeName))

    return data
  }, [tasks, quickFilter, filters])

  // ─── Handlers ────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshCampaigns()
    setIsRefreshing(false)
    toast.success('Tasks refreshed')
  }, [refreshCampaigns])

  const handleTaskAction = useCallback(
    async (action: string, task: RemediationTask) => {
      if (action === 'view') {
        setViewTask(task)
        return
      }
      if (action === 'edit') {
        const dueDate = task.dueDate ? new Date(task.dueDate) : undefined
        setFormData({
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          severity: task.severity,
          assigneeName: task.assigneeName,
          dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : undefined,
          findingId: task.findingId || 'none',
          estimatedHours: task.estimatedHours?.toString() || '',
        })
        setEditTask(task)
        return
      }
      if (action === 'delete') {
        setDeleteTask(task)
        return
      }
      if (action === 'open_campaign') {
        router.push(`/remediation/${task.id}`)
        return
      }

      // Status transition actions → call API
      const statusMap: Record<string, string> = {
        start: 'active',
        complete: 'completed',
        block: 'paused',
        reopen: 'active',
        reassign: '',
      }
      const apiStatus = statusMap[action]
      if (apiStatus) {
        try {
          await patch(`/api/v1/remediation/campaigns/${task.id}/status`, { status: apiStatus })
          await refreshCampaigns()
          // Update viewTask if it's the same one
          if (viewTask?.id === task.id) {
            const updated = campaignData?.data?.find((c) => c.id === task.id)
            if (updated) {
              setViewTask({
                ...task,
                status: normalizeStatus(updated.status),
              })
            }
          }
          toast.success(
            `Task ${action === 'start' ? 'started' : action === 'complete' ? 'completed' : action === 'block' ? 'blocked' : 'reopened'}`
          )
        } catch (err) {
          toast.error(getErrorMessage(err, `Failed to ${action} task`))
        }
      } else if (action === 'reassign') {
        toast.info('Reassign feature coming soon')
      }
    },
    [router, refreshCampaigns, viewTask, campaignData]
  )

  const handleBulkAction = useCallback(
    async (action: string, value?: string) => {
      // Map "Moved" to status update API calls
      if (action === 'Moved' && value) {
        const statusMap: Record<string, string> = {
          'In Progress': 'active',
          Review: 'validating',
          Completed: 'completed',
        }
        const apiStatus = statusMap[value]
        if (apiStatus) {
          try {
            await Promise.all(
              selectedIds.map((id) =>
                patch(`/api/v1/remediation/campaigns/${id}/status`, { status: apiStatus })
              )
            )
            await refreshCampaigns()
            toast.success(`Moved ${selectedIds.length} tasks to ${value}`)
          } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update tasks'))
          }
        }
      }
      setSelectedIds([])
    },
    [selectedIds, refreshCampaigns]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTask) return
    try {
      await del(`/api/v1/remediation/campaigns/${deleteTask.id}`)
      await refreshCampaigns()
      toast.success('Task deleted', { description: deleteTask.title })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete task'))
    }
    setDeleteTask(null)
  }, [deleteTask, refreshCampaigns])

  const handleCreateTask = useCallback(async () => {
    if (!formData.title) {
      toast.error('Please fill in the title')
      return
    }
    try {
      await createCampaign({
        name: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'draft',
        due_date: formData.dueDate?.toISOString() || null,
        assigned_team: formData.assigneeName || null,
        tags: [],
      })
      await refreshCampaigns()
      setFormData(emptyFormData)
      setIsCreateOpen(false)
      toast.success('Task created successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'))
    }
  }, [formData, createCampaign, refreshCampaigns])

  const handleEditTask = useCallback(async () => {
    if (!editTask || !formData.title) {
      toast.error('Please fill in the title')
      return
    }
    try {
      await patch(`/api/v1/remediation/campaigns/${editTask.id}`, {
        name: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.dueDate?.toISOString() || null,
        assigned_team: formData.assigneeName || null,
      })
      await refreshCampaigns()
      setFormData(emptyFormData)
      setEditTask(null)
      toast.success('Task updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'))
    }
  }, [editTask, formData, refreshCampaigns])

  const handleCopyId = useCallback((id: string) => {
    copyToClipboard(id)
    toast.success('Task ID copied')
  }, [])

  const handleCopyLink = useCallback((id: string) => {
    copyToClipboard(`${window.location.origin}/remediation/${id}`)
    toast.success('Link copied')
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setQuickFilter('all')
  }, [])

  const togglePriorityFilter = useCallback((priority: TaskPriority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }))
  }, [])

  const toggleStatusFilter = useCallback((status: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }, [])

  // ─── Table Columns ─────────────────────────────────────────────────

  const columns: ColumnDef<RemediationTask>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
        cell: ({ row }) => {
          const task = row.original
          const overdue = checkOverdue(task)
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  task.status === 'completed'
                    ? 'bg-green-500/10'
                    : task.status === 'blocked' || overdue
                      ? 'bg-red-500/10'
                      : 'bg-primary/10'
                }`}
              >
                <ListTodo
                  className={`h-4 w-4 ${
                    task.status === 'completed'
                      ? 'text-green-500'
                      : task.status === 'blocked' || overdue
                        ? 'text-red-500'
                        : 'text-primary'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-sm">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate">{task.findingTitle}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => (
          <Badge className={`${priorityColors[row.original.priority]} text-xs`}>
            {TASK_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge className={`${statusColors[row.original.status]} text-xs`}>
            {TASK_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'assigneeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
        cell: ({ row }) => {
          const name = row.original.assigneeName
          if (!name) {
            return <span className="text-xs text-muted-foreground">Unassigned</span>
          }
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => {
          const task = row.original
          const formatted = safeFormatDate(task.dueDate, { month: 'short', day: 'numeric' })
          const overdue = checkOverdue(task)
          const due = daysUntil(task.dueDate)
          if (!formatted) {
            return <span className="text-xs text-muted-foreground">--</span>
          }
          return (
            <div className="flex flex-col">
              <span className={`text-sm ${overdue ? 'text-red-500 font-medium' : ''}`}>
                {formatted}
              </span>
              {due && task.status !== 'completed' && (
                <span
                  className={`text-[11px] ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}
                >
                  {due.overdue ? `${due.days}d overdue` : `${due.days}d left`}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const task = row.original
          const actions = getAvailableActions(task.status)
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTaskAction('view', task)}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTaskAction('open_campaign', task)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Campaign
                </DropdownMenuItem>
                <Can permission={Permission.RemediationWrite}>
                  <DropdownMenuItem onClick={() => handleTaskAction('edit', task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <DropdownMenuItem onClick={() => handleTaskAction('reassign', task)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reassign
                </DropdownMenuItem>
                {actions.length > 0 && <DropdownMenuSeparator />}
                {actions.map(({ action, label, icon: Icon }) => (
                  <DropdownMenuItem key={action} onClick={() => handleTaskAction(action, task)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCopyId(task.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <Can permission={Permission.RemediationWrite}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={() => handleTaskAction('delete', task)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [handleTaskAction, handleCopyId]
  )

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <Main>
        {/* Header */}
        <PageHeader
          title="Remediation Tasks"
          description={`${filteredData.length} of ${tasks.length} tasks`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => toast.success(`Exporting ${filteredData.length} tasks as CSV...`)}
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toast.success(`Exporting ${filteredData.length} tasks as JSON...`)}
                >
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters Popover */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 rounded-full px-1 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={clearFilters}
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                        <Badge
                          key={p}
                          variant={filters.priorities.includes(p) ? 'default' : 'outline'}
                          className={`cursor-pointer text-xs ${filters.priorities.includes(p) ? priorityColors[p] : ''}`}
                          onClick={() => togglePriorityFilter(p)}
                        >
                          {TASK_PRIORITY_LABELS[p]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        ['open', 'in_progress', 'review', 'completed', 'blocked'] as TaskStatus[]
                      ).map((s) => (
                        <Badge
                          key={s}
                          variant={filters.statuses.includes(s) ? 'default' : 'outline'}
                          className={`cursor-pointer text-xs ${filters.statuses.includes(s) ? statusColors[s] : ''}`}
                          onClick={() => toggleStatusFilter(s)}
                        >
                          {TASK_STATUS_LABELS[s]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {assignees.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Assignee</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {assignees.map((name) => (
                          <Badge
                            key={name}
                            variant={filters.assignees.includes(name) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                assignees: prev.assignees.includes(name)
                                  ? prev.assignees.filter((a) => a !== name)
                                  : [...prev.assignees, name],
                              }))
                            }
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {filteredData.length} results
                    </span>
                    <Button size="sm" className="h-7" onClick={() => setIsFilterOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              onClick={() => {
                setFormData(emptyFormData)
                setIsCreateOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </PageHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {fetchError && !isLoading && (
          <Card className="mt-6 border-red-500/20 bg-red-500/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Failed to load tasks. Please try again.</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main content — hide when loading */}
        {!isLoading && !fetchError && (
          <>
            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <Card className="mt-4 border-primary/50 bg-primary/5">
                <CardContent className="flex items-center justify-between py-2.5 px-4">
                  <span className="text-sm font-medium">{selectedIds.length} selected</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => handleBulkAction('Reassigned')}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Reassign
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7">
                          <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                          Move to
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'In Progress')}>
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'Review')}>
                          Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('Moved', 'Completed')}>
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => setSelectedIds([])}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status filter bar — compact inline */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'all', label: 'All', value: stats.total, dotColor: 'bg-foreground' },
                  {
                    key: 'open',
                    label: 'Open',
                    value: stats.byStatus.open,
                    dotColor: statusDotColors.open,
                  },
                  {
                    key: 'in_progress',
                    label: 'In Progress',
                    value: stats.byStatus.in_progress,
                    dotColor: statusDotColors.in_progress,
                  },
                  {
                    key: 'review',
                    label: 'In Review',
                    value: stats.byStatus.review,
                    dotColor: statusDotColors.review,
                  },
                  {
                    key: 'blocked',
                    label: 'Blocked',
                    value: stats.byStatus.blocked,
                    dotColor: statusDotColors.blocked,
                  },
                  {
                    key: 'overdue',
                    label: 'Overdue',
                    value: stats.overdue,
                    dotColor: 'bg-red-500',
                  },
                ] as const
              ).map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => setQuickFilter(quickFilter === stat.key ? 'all' : stat.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                    quickFilter === stat.key
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${stat.dotColor}`} />
                  {stat.label}
                  <span className="font-semibold tabular-nums text-foreground">{stat.value}</span>
                </button>
              ))}
            </div>

            {/* Table / Kanban */}
            <Tabs defaultValue="table" className="mt-4">
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="kanban">Kanban View</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-2">
                <DataTable
                  columns={columns}
                  data={filteredData}
                  onRowClick={(task) => setViewTask(task)}
                  searchPlaceholder="Search tasks..."
                  pageSize={10}
                  emptyMessage="No tasks found"
                  emptyDescription={
                    activeFilterCount > 0 || quickFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first task to get started'
                  }
                />
              </TabsContent>

              <TabsContent value="kanban">
                <div className="mt-4 grid gap-4 lg:grid-cols-5">
                  {(['open', 'in_progress', 'review', 'blocked', 'completed'] as TaskStatus[]).map(
                    (status) => (
                      <div key={status} className="space-y-3">
                        {/* Column header */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${statusDotColors[status]}`}
                            />
                            <span className="text-sm font-medium">
                              {TASK_STATUS_LABELS[status]}
                            </span>
                          </div>
                          <Badge variant="outline" className="h-5 text-xs px-1.5">
                            {tasksByStatus[status].length}
                          </Badge>
                        </div>
                        {/* Cards */}
                        <div className="space-y-2 max-h-[520px] overflow-y-auto rounded-lg bg-muted/30 p-2">
                          {tasksByStatus[status].map((task) => {
                            const overdue = checkOverdue(task)
                            return (
                              <Card
                                key={task.id}
                                className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-2"
                                style={{
                                  borderLeftColor:
                                    task.priority === 'urgent'
                                      ? 'rgb(239 68 68)'
                                      : task.priority === 'high'
                                        ? 'rgb(249 115 22)'
                                        : task.priority === 'medium'
                                          ? 'rgb(234 179 8)'
                                          : 'rgb(59 130 246)',
                                }}
                                onClick={() => setViewTask(task)}
                              >
                                <p className="text-sm font-medium line-clamp-2 leading-snug">
                                  {task.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                  {task.findingTitle}
                                </p>
                                <div className="mt-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[9px]">
                                        {getInitials(task.assigneeName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[11px] text-muted-foreground">
                                      {task.assigneeName
                                        ? task.assigneeName.split(' ')[0]
                                        : 'Unassigned'}
                                    </span>
                                  </div>
                                  {task.dueDate && (
                                    <div
                                      className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {safeFormatDate(task.dueDate, {
                                        month: 'short',
                                        day: 'numeric',
                                      }) ?? '--'}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <SeverityBadge severity={task.severity} />
                                  {overdue && (
                                    <Badge
                                      variant="outline"
                                      className="border-red-500/40 text-red-500 text-[10px] h-5 px-1"
                                    >
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                              </Card>
                            )
                          })}
                          {tasksByStatus[status].length === 0 && (
                            <p className="text-muted-foreground text-center text-xs py-8">
                              No tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>

      {/* ─── View Task Sheet ─────────────────────────────────────────── */}
      <TaskDetailSheet
        task={viewTask}
        onClose={() => setViewTask(null)}
        onEdit={(task) => {
          setViewTask(null)
          handleTaskAction('edit', task)
        }}
        onDelete={(task) => {
          setViewTask(null)
          setDeleteTask(task)
        }}
        onAction={handleTaskAction}
        onCopyId={handleCopyId}
        onCopyLink={handleCopyLink}
        onOpenCampaign={(task) => router.push(`/remediation/${task.id}`)}
      />

      {/* ─── Task Form Dialog ─────────────────────────────────────────── */}
      <TaskFormDialog
        open={isCreateOpen || !!editTask}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditTask(null)
          }
        }}
        mode={editTask ? 'edit' : 'create'}
        formData={formData}
        setFormData={setFormData}
        dueDateOpen={dueDateOpen}
        setDueDateOpen={setDueDateOpen}
        assignees={assignees}
        findings={findings}
        onSubmit={editTask ? handleEditTask : handleCreateTask}
        onCancel={() => {
          setIsCreateOpen(false)
          setEditTask(null)
        }}
      />

      {/* ─── Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTask?.title}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

// ─── Task Detail Sheet ───────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: RemediationTask | null
  onClose: () => void
  onEdit: (task: RemediationTask) => void
  onDelete: (task: RemediationTask) => void
  onAction: (action: string, task: RemediationTask) => void
  onCopyId: (id: string) => void
  onCopyLink: (id: string) => void
  onOpenCampaign: (task: RemediationTask) => void
}

function TaskDetailSheet({
  task,
  onClose,
  onEdit,
  onDelete,
  onAction,
  onCopyId,
  onCopyLink,
  onOpenCampaign,
}: TaskDetailSheetProps) {
  if (!task) {
    return (
      <Sheet open={false}>
        <SheetContent>
          <VisuallyHidden>
            <SheetTitle>Task</SheetTitle>
          </VisuallyHidden>
        </SheetContent>
      </Sheet>
    )
  }

  const overdue = checkOverdue(task)
  const due = daysUntil(task.dueDate)
  const actions = getAvailableActions(task.status)

  // Get progress from API data or estimate from status
  const taskProgress =
    (task as unknown as Record<string, unknown>).progress != null
      ? Number((task as unknown as Record<string, unknown>).progress)
      : task.status === 'completed'
        ? 100
        : task.status === 'review'
          ? 75
          : task.status === 'in_progress'
            ? 50
            : 0

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent
        className="sm:max-w-lg p-0 overflow-y-auto [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Task Details</SheetTitle>
        </VisuallyHidden>

        {/* ── Header ── */}
        <div
          className={`p-5 border-b ${
            task.status === 'completed'
              ? 'bg-green-500/5'
              : task.status === 'blocked' || overdue
                ? 'bg-red-500/5'
                : 'bg-muted/30'
          }`}
        >
          {/* Toolbar: title left, actions right */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Task Details</p>
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onCopyId(task.id)}
                  >
                    <Hash className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Copy ID</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onCopyLink(task.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Copy link</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onOpenCampaign(task)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Open campaign</TooltipContent>
              </Tooltip>
              <Can permission={Permission.RemediationWrite}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Edit</TooltipContent>
                </Tooltip>
              </Can>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold leading-tight">{task.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{task.findingTitle}</p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Badge className={`${priorityColors[task.priority]} text-xs h-5`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge className={`${statusColors[task.status]} text-xs h-5`}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            <SeverityBadge severity={task.severity} />
            {overdue && (
              <Badge variant="outline" className="border-red-500/50 text-red-500 text-xs h-5">
                <AlertCircle className="mr-1 h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-5 space-y-4">
          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<UserPlus className="h-3.5 w-3.5 text-muted-foreground" />}
              label="Assignee"
            >
              {task.assigneeName ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">
                      {getInitials(task.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{task.assigneeName}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </InfoCard>

            <InfoCard
              icon={
                <Calendar
                  className={`h-3.5 w-3.5 ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}
                />
              }
              label="Due Date"
            >
              <span className={`text-sm font-medium ${overdue ? 'text-red-500' : ''}`}>
                {safeFormatDate(task.dueDate, { month: 'short', day: 'numeric' }) ?? 'Not set'}
              </span>
              {due && task.status !== 'completed' && (
                <span
                  className={`text-[11px] block ${due.overdue ? 'text-red-400' : 'text-muted-foreground'}`}
                >
                  {due.overdue ? `${due.days}d overdue` : `${due.days}d remaining`}
                </span>
              )}
            </InfoCard>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p className="text-sm leading-relaxed bg-muted/30 rounded-lg p-3">
                {task.description}
              </p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Progress</p>
              <span className="text-xs font-medium tabular-nums">{taskProgress}%</span>
            </div>
            <Progress value={taskProgress} className="h-1.5" />
          </div>

          <Separator />

          {/* Status Actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Actions</p>
            <div className="flex flex-wrap gap-2">
              {actions.map(({ action, label, icon: Icon, variant }) => (
                <Button
                  key={action}
                  variant={variant}
                  size="sm"
                  className="h-8"
                  onClick={() => onAction(action, task)}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onAction('reassign', task)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Reassign
              </Button>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Hash className="h-3.5 w-3.5 text-muted-foreground" />} label="Task ID">
              <p className="font-mono text-[11px] truncate">{task.id}</p>
            </InfoCard>
            <InfoCard
              icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              label="Created"
            >
              <p className="text-sm">
                {safeFormatDate(task.createdAt, { month: 'short', day: 'numeric' }) ?? '--'}
              </p>
              {task.createdAt && (
                <p className="text-[11px] text-muted-foreground">{timeAgo(task.createdAt)}</p>
              )}
            </InfoCard>
          </div>

          {/* Danger Zone */}
          <Can permission={Permission.RemediationWrite}>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border border-red-500/15 bg-red-500/5 p-3">
              <div>
                <p className="text-sm font-medium text-red-500">Delete task</p>
                <p className="text-xs text-muted-foreground">Permanently remove this task</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </Can>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Small info card used in detail sheet */
function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Task Form Dialog ────────────────────────────────────────────────

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  formData: TaskFormData
  setFormData: (data: TaskFormData) => void
  dueDateOpen: boolean
  setDueDateOpen: (open: boolean) => void
  assignees: string[]
  findings: Array<{ id: string; title?: string; message?: string; severity?: Severity }>
  onSubmit: () => void
  onCancel: () => void
}

function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  formData,
  setFormData,
  dueDateOpen,
  setDueDateOpen,
  assignees,
  findings,
  onSubmit,
  onCancel,
}: TaskFormDialogProps) {
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
            {isEdit ? 'Edit Task' : 'Create Task'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update task information' : 'Create a new remediation task'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs">
              Title *
            </Label>
            <Input
              id="task-title"
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="task-desc"
              placeholder="Task description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData({ ...formData, severity: v as Severity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assignee *</Label>
              <Select
                value={formData.assigneeName}
                onValueChange={(v) => setFormData({ ...formData, assigneeName: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date *</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-9"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => {
                      setFormData({ ...formData, dueDate: date })
                      setDueDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Link to Finding</Label>
              <Select
                value={formData.findingId}
                onValueChange={(v) => setFormData({ ...formData, findingId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select finding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {findings.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {(f.title || f.message || f.id).substring(0, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Hours</Label>
              <Input
                type="number"
                placeholder="e.g., 8"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            {isEdit ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

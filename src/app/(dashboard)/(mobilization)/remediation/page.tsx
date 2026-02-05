'use client'

import { useState, useMemo } from 'react'
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
  AlertTriangle,
  ArrowRight,
  X,
  ListTodo,
  Calendar,
  Copy,
  Link,
  Play,
  Eye,
  CalendarIcon,
  Save,
} from 'lucide-react'
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
import { Can, Permission } from '@/lib/permissions'
import {
  mockRemediationTasks,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/features/remediation'
import { mockFindings } from '@/features/findings'
import type { TaskStatus, TaskPriority, RemediationTask } from '@/features/remediation/types'
import type { Severity } from '@/features/shared/types'

// Form state type
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

export default function RemediationPage() {
  // Tasks state (local for demo)
  const [tasks, setTasks] = useState<RemediationTask[]>(mockRemediationTasks)

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      byStatus: {
        open: tasks.filter((t) => t.status === 'open').length,
        in_progress: tasks.filter((t) => t.status === 'in_progress').length,
        review: tasks.filter((t) => t.status === 'review').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      byPriority: {
        urgent: tasks.filter((t) => t.priority === 'urgent').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        low: tasks.filter((t) => t.priority === 'low').length,
      },
      overdue: tasks.filter((t) => new Date(t.dueDate) < new Date() && t.status !== 'completed')
        .length,
      completedThisWeek: tasks.filter((t) => t.status === 'completed').length,
      averageCompletionTime: 24,
    }
  }, [tasks])

  const tasksByStatus = useMemo(() => {
    return {
      open: tasks.filter((t) => t.status === 'open'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      completed: tasks.filter((t) => t.status === 'completed'),
      blocked: tasks.filter((t) => t.status === 'blocked'),
    }
  }, [tasks])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [quickFilter, setQuickFilter] = useState('all')
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Dialog states
  const [viewTask, setViewTask] = useState<RemediationTask | null>(null)
  const [editTask, setEditTask] = useState<RemediationTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<RemediationTask | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData)
  const [dueDateOpen, setDueDateOpen] = useState(false)

  // Get unique assignees
  const assignees = useMemo(() => {
    const names = [...new Set(tasks.map((t) => t.assigneeName))]
    return names
  }, [tasks])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.priorities.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.assignees.length > 0) count++
    return count
  }, [filters])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...tasks]

    // Quick filter
    if (quickFilter === 'open') {
      data = data.filter((t) => t.status === 'open')
    } else if (quickFilter === 'in_progress') {
      data = data.filter((t) => t.status === 'in_progress')
    } else if (quickFilter === 'blocked') {
      data = data.filter((t) => t.status === 'blocked')
    } else if (quickFilter === 'overdue') {
      data = data.filter((t) => new Date(t.dueDate) < new Date())
    }

    // Advanced filters
    if (filters.priorities.length > 0) {
      data = data.filter((t) => filters.priorities.includes(t.priority))
    }
    if (filters.statuses.length > 0) {
      data = data.filter((t) => filters.statuses.includes(t.status))
    }
    if (filters.assignees.length > 0) {
      data = data.filter((t) => filters.assignees.includes(t.assigneeName))
    }

    return data
  }, [tasks, quickFilter, filters])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success('Tasks refreshed')
    }, 1000)
  }

  const handleExport = (format: string) => {
    toast.success(`Exporting ${filteredData.length} tasks as ${format}...`)
  }

  const handleTaskAction = (action: string, task: RemediationTask) => {
    if (action === 'view') {
      setViewTask(task)
    } else if (action === 'edit') {
      setEditTask(task)
    } else if (action === 'delete') {
      setDeleteTask(task)
    } else {
      toast.info(`${action}: ${task.title}`)
    }
  }

  const handleBulkAction = (action: string, value?: string) => {
    toast.success(`${action} ${selectedIds.length} tasks${value ? ` to ${value}` : ''}`)
    setSelectedIds([])
  }

  const handleDelete = () => {
    if (!deleteTask) return
    setTasks(tasks.filter((t) => t.id !== deleteTask.id))
    toast.success('Task deleted', { description: deleteTask.title })
    setDeleteTask(null)
  }

  const handleOpenCreate = () => {
    setFormData(emptyFormData)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (task: RemediationTask) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      severity: task.severity,
      assigneeName: task.assigneeName,
      dueDate: new Date(task.dueDate),
      findingId: task.findingId || '',
      estimatedHours: task.estimatedHours?.toString() || '',
    })
    setEditTask(task)
  }

  const handleCreateTask = () => {
    if (!formData.title || !formData.assigneeName || !formData.dueDate) {
      toast.error('Please fill in required fields (Title, Assignee, Due Date)')
      return
    }

    const finding = mockFindings.find((f) => f.id === formData.findingId)
    const newTask: RemediationTask = {
      id: `task-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      status: 'open',
      priority: formData.priority,
      findingId: formData.findingId || '',
      findingTitle: finding?.title || 'Manual Task',
      severity: finding?.severity || formData.severity,
      assigneeId: formData.assigneeName.toLowerCase().replace(/\s/g, '-'),
      assigneeName: formData.assigneeName,
      dueDate: formData.dueDate.toISOString(),
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTasks([newTask, ...tasks])
    setFormData(emptyFormData)
    setIsCreateOpen(false)
    toast.success('Task created successfully')
  }

  const handleEditTask = () => {
    if (!editTask || !formData.title || !formData.assigneeName || !formData.dueDate) {
      toast.error('Please fill in required fields')
      return
    }

    const finding = mockFindings.find((f) => f.id === formData.findingId)
    const updatedTasks = tasks.map((t) =>
      t.id === editTask.id
        ? {
            ...t,
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            severity: finding?.severity || formData.severity,
            assigneeName: formData.assigneeName,
            assigneeId: formData.assigneeName.toLowerCase().replace(/\s/g, '-'),
            dueDate: formData.dueDate!.toISOString(),
            findingId: formData.findingId,
            findingTitle: finding?.title || t.findingTitle,
            estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
            updatedAt: new Date().toISOString(),
          }
        : t
    )

    setTasks(updatedTasks)
    setFormData(emptyFormData)
    setEditTask(null)
    toast.success('Task updated successfully')
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Task ID copied')
  }

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/remediation/${id}`)
    toast.success('Link copied')
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setQuickFilter('all')
    toast.success('Filters cleared')
  }

  const togglePriorityFilter = (priority: TaskPriority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }))
  }

  const toggleStatusFilter = (status: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }

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
          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed'
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  task.status === 'completed'
                    ? 'bg-green-500/10'
                    : task.status === 'blocked'
                      ? 'bg-red-500/10'
                      : isOverdue
                        ? 'bg-red-500/10'
                        : 'bg-primary/10'
                }`}
              >
                <ListTodo
                  className={`h-5 w-5 ${
                    task.status === 'completed'
                      ? 'text-green-500'
                      : task.status === 'blocked'
                        ? 'text-red-500'
                        : isOverdue
                          ? 'text-red-500'
                          : 'text-primary'
                  }`}
                />
              </div>
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{task.findingTitle}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => (
          <Badge className={priorityColors[row.original.priority]}>
            {TASK_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge className={statusColors[row.original.status]}>
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
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {row.original.assigneeName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.assigneeName}</span>
          </div>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => {
          const dueDate = new Date(row.original.dueDate)
          const isOverdue = dueDate < new Date() && row.original.status !== 'completed'
          return (
            <span className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              {dueDate.toLocaleDateString()}
            </span>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const task = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTaskAction('view', task)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.RemediationWrite}>
                  <DropdownMenuItem onClick={() => handleOpenEdit(task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <DropdownMenuItem onClick={() => handleTaskAction('reassign', task)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reassign
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleTaskAction('start', task)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTaskAction('complete', task)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTaskAction('block', task)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Mark Blocked
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCopyId(task.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyLink(task.id)}>
                  <Link className="mr-2 h-4 w-4" />
                  Copy Link
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
    []
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Remediation Tasks"
          description={`${filteredData.length} of ${tasks.length} tasks`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('CSV')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('JSON')}>
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
                    <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => (
                        <Badge
                          key={priority}
                          variant={filters.priorities.includes(priority) ? 'default' : 'outline'}
                          className={`cursor-pointer ${
                            filters.priorities.includes(priority) ? priorityColors[priority] : ''
                          }`}
                          onClick={() => togglePriorityFilter(priority)}
                        >
                          {TASK_PRIORITY_LABELS[priority]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        ['open', 'in_progress', 'review', 'completed', 'blocked'] as TaskStatus[]
                      ).map((status) => (
                        <Badge
                          key={status}
                          variant={filters.statuses.includes(status) ? 'default' : 'outline'}
                          className={`cursor-pointer ${
                            filters.statuses.includes(status) ? statusColors[status] : ''
                          }`}
                          onClick={() => toggleStatusFilter(status)}
                        >
                          {TASK_STATUS_LABELS[status]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Assignee Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Assignee</Label>
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((name) => (
                        <Badge
                          key={name}
                          variant={filters.assignees.includes(name) ? 'default' : 'outline'}
                          className="cursor-pointer"
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

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {filteredData.length} results
                    </span>
                    <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </PageHeader>

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || quickFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {quickFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {quickFilter === 'open' && 'Open Only'}
                {quickFilter === 'in_progress' && 'In Progress'}
                {quickFilter === 'blocked' && 'Blocked'}
                {quickFilter === 'overdue' && 'Overdue'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setQuickFilter('all')} />
              </Badge>
            )}
            {filters.priorities.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1">
                {TASK_PRIORITY_LABELS[p]}
                <X className="h-3 w-3 cursor-pointer" onClick={() => togglePriorityFilter(p)} />
              </Badge>
            ))}
            {filters.statuses.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {TASK_STATUS_LABELS[s]}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleStatusFilter(s)} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <Card className="mt-4 border-primary">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{selectedIds.length} task(s) selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('Reassigned')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reassign
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowRight className="mr-2 h-4 w-4" />
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
                <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - Clickable */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card
            className={`cursor-pointer transition-colors hover:border-primary ${
              quickFilter === 'open' ? 'border-primary' : ''
            }`}
            onClick={() => setQuickFilter(quickFilter === 'open' ? 'all' : 'open')}
          >
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-3xl">{stats.byStatus.open}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-blue-500 ${
              quickFilter === 'in_progress' ? 'border-blue-500' : ''
            }`}
            onClick={() => setQuickFilter(quickFilter === 'in_progress' ? 'all' : 'in_progress')}
          >
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.byStatus.in_progress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Review</CardDescription>
              <CardTitle className="text-3xl text-purple-500">{stats.byStatus.review}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-red-500 ${
              quickFilter === 'blocked' ? 'border-red-500' : ''
            }`}
            onClick={() => setQuickFilter(quickFilter === 'blocked' ? 'all' : 'blocked')}
          >
            <CardHeader className="pb-2">
              <CardDescription>Blocked</CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.byStatus.blocked}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-red-500 ${
              quickFilter === 'overdue' ? 'border-red-500' : ''
            }`}
            onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
          >
            <CardHeader className="pb-2">
              <CardDescription>Overdue</CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.overdue}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="table" className="mt-6">
          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <Card className="mt-4">
              <CardContent className="pt-6">
                <DataTable
                  columns={columns}
                  data={filteredData}
                  searchPlaceholder="Search tasks..."
                  pageSize={10}
                  emptyMessage="No tasks found"
                  emptyDescription={
                    activeFilterCount > 0 || quickFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first task to get started'
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban">
            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              {(['open', 'in_progress', 'review', 'completed'] as TaskStatus[]).map((status) => (
                <Card key={status} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${statusColors[status].split(' ')[0]}`}
                        />
                        <span>{TASK_STATUS_LABELS[status]}</span>
                      </div>
                      <Badge variant="outline">{tasksByStatus[status].length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                    {tasksByStatus[status].map((task) => {
                      const isOverdue =
                        new Date(task.dueDate) < new Date() && status !== 'completed'
                      return (
                        <Card
                          key={task.id}
                          className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setViewTask(task)}
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                            <Badge className={`${priorityColors[task.priority]} ml-2 shrink-0`}>
                              {task.priority[0].toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {task.findingTitle}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {task.assigneeName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {task.assigneeName.split(' ')[0]}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}
                            >
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                          <SeverityBadge severity={task.severity} className="mt-2" />
                        </Card>
                      )
                    })}
                    {tasksByStatus[status].length === 0 && (
                      <p className="text-muted-foreground text-center text-sm py-8">No tasks</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Main>

      {/* View Task Sheet */}
      <Sheet open={!!viewTask} onOpenChange={() => setViewTask(null)}>
        <SheetContent className="sm:max-w-xl p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Task Details</SheetTitle>
          </VisuallyHidden>
          {viewTask && (
            <>
              {/* Header */}
              <div
                className={`relative p-6 ${
                  viewTask.status === 'completed'
                    ? 'bg-gradient-to-br from-green-500/20 to-green-600/5'
                    : viewTask.status === 'blocked'
                      ? 'bg-gradient-to-br from-red-500/20 to-red-600/5'
                      : viewTask.priority === 'urgent'
                        ? 'bg-gradient-to-br from-red-500/20 to-red-600/5'
                        : 'bg-gradient-to-br from-blue-500/20 to-blue-600/5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      viewTask.status === 'completed'
                        ? 'bg-green-500/20'
                        : viewTask.status === 'blocked'
                          ? 'bg-red-500/20'
                          : 'bg-blue-500/20'
                    }`}
                  >
                    <ListTodo
                      className={`h-6 w-6 ${
                        viewTask.status === 'completed'
                          ? 'text-green-500'
                          : viewTask.status === 'blocked'
                            ? 'text-red-500'
                            : 'text-blue-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{viewTask.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{viewTask.findingTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Badge className={priorityColors[viewTask.priority]}>
                    {TASK_PRIORITY_LABELS[viewTask.priority]}
                  </Badge>
                  <Badge className={statusColors[viewTask.status]}>
                    {TASK_STATUS_LABELS[viewTask.status]}
                  </Badge>
                  <SeverityBadge severity={viewTask.severity} />
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyId(viewTask.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setViewTask(null)
                      setEditTask(viewTask)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Assignee & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-2">Assignee</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {viewTask.assigneeName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{viewTask.assigneeName}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-2">Due Date</p>
                    <div
                      className={`flex items-center gap-2 ${
                        new Date(viewTask.dueDate) < new Date() && viewTask.status !== 'completed'
                          ? 'text-red-500'
                          : ''
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {new Date(viewTask.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {viewTask.description || 'No description provided'}
                  </p>
                </div>

                {/* Progress */}
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Progress</p>
                    <span className="text-sm text-muted-foreground">
                      {viewTask.status === 'completed'
                        ? '100'
                        : viewTask.status === 'review'
                          ? '75'
                          : viewTask.status === 'in_progress'
                            ? '50'
                            : viewTask.status === 'blocked'
                              ? '25'
                              : '0'}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      viewTask.status === 'completed'
                        ? 100
                        : viewTask.status === 'review'
                          ? 75
                          : viewTask.status === 'in_progress'
                            ? 50
                            : viewTask.status === 'blocked'
                              ? 25
                              : 0
                    }
                    className="h-2"
                  />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => handleTaskAction('start', viewTask)}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Task
                  </Button>
                  <Button variant="outline" onClick={() => handleTaskAction('complete', viewTask)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                  <Button variant="outline" onClick={() => handleTaskAction('block', viewTask)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Block
                  </Button>
                  <Button variant="outline" onClick={() => handleTaskAction('reassign', viewTask)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Reassign
                  </Button>
                </div>

                {/* Metadata */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-medium">Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Task ID</p>
                      <p className="font-mono text-xs mt-0.5">{viewTask.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p className="mt-0.5">{new Date(viewTask.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <Can permission={Permission.RemediationWrite}>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-500">Danger Zone</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Delete this task permanently
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setViewTask(null)
                          setDeleteTask(viewTask)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Can>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Task Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Create Task
            </DialogTitle>
            <DialogDescription>Create a new remediation task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
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
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as Severity })
                  }
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee *</Label>
                <Select
                  value={formData.assigneeName}
                  onValueChange={(value) => setFormData({ ...formData, assigneeName: value })}
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
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to Finding</Label>
                <Select
                  value={formData.findingId}
                  onValueChange={(value) => setFormData({ ...formData, findingId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {mockFindings.slice(0, 10).map((finding) => (
                      <SelectItem key={finding.id} value={finding.id}>
                        {finding.title.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Hours</Label>
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
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Task
            </DialogTitle>
            <DialogDescription>Update task information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
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
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as Severity })
                  }
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee *</Label>
                <Select
                  value={formData.assigneeName}
                  onValueChange={(value) => setFormData({ ...formData, assigneeName: value })}
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
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to Finding</Label>
                <Select
                  value={formData.findingId}
                  onValueChange={(value) => setFormData({ ...formData, findingId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {mockFindings.slice(0, 10).map((finding) => (
                      <SelectItem key={finding.id} value={finding.id}>
                        {finding.title.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Hours</Label>
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
            <Button variant="outline" onClick={() => setEditTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditTask}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
    </>
  )
}

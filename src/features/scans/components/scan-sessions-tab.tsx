'use client'

import { useState, useMemo } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  SearchIcon,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Radar,
  CheckCircle,
  AlertTriangle,
  Activity,
  Clock,
  Eye,
} from 'lucide-react'
import {
  useScanSessions,
  useScanSessionStats,
  type ScanSession,
  SCAN_RUN_STATUS_LABELS,
} from '@/lib/api'
import { Separator } from '@/components/ui/separator'

// Status filter type - matches ScanSessionStatus
type StatusFilter =
  | 'all'
  | 'queued'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'timeout'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timed Out' },
]

const statusConfig: Record<string, { color: string; bgColor: string; icon?: string }> = {
  queued: { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  pending: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  running: { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  completed: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  failed: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  canceled: { color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  timeout: { color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms?: number): string {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function ScanSessionsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 20

  // Fetch real data
  const {
    data: sessionsData,
    isLoading: loadingSessions,
    error,
  } = useScanSessions({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: perPage,
  })
  const { data: stats, isLoading: loadingStats } = useScanSessionStats()

  // Computed values
  const sessions = sessionsData?.data || []
  const totalSessions = sessionsData?.total || 0
  const totalPages = sessionsData?.total_pages || 1

  // Stats computation
  const statusCounts = useMemo(() => {
    const counts = {
      all: stats?.total || 0,
      queued: stats?.by_status?.queued || 0,
      pending: stats?.by_status?.pending || 0,
      running: stats?.by_status?.running || 0,
      completed: stats?.by_status?.completed || 0,
      failed: stats?.by_status?.failed || 0,
      canceled: stats?.by_status?.canceled || 0,
      timeout: stats?.by_status?.timeout || 0,
    }
    return counts
  }, [stats])

  // Table columns
  const columns: ColumnDef<ScanSession>[] = useMemo(
    () => [
      {
        accessorKey: 'scanner_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Scanner
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.scanner_name}
            {row.original.scanner_version && (
              <span className="text-xs text-muted-foreground ml-1">
                v{row.original.scanner_version}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'asset_value',
        header: 'Target',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            <span className="text-sm">{row.original.asset_value}</span>
            <div className="text-xs text-muted-foreground">{row.original.asset_type}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status
          const config = statusConfig[status] || statusConfig.pending
          return (
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {SCAN_RUN_STATUS_LABELS[status] || status}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'findings_total',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Findings
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const session = row.original
          const bySev = session.findings_by_severity || {}
          if (session.findings_total === 0) {
            return <span className="text-muted-foreground">-</span>
          }
          return (
            <div className="flex items-center gap-1">
              {(bySev.critical || 0) > 0 && (
                <Badge className="bg-red-600 px-1.5 text-xs">C {bySev.critical}</Badge>
              )}
              {(bySev.high || 0) > 0 && (
                <Badge className="bg-orange-500 px-1.5 text-xs">H {bySev.high}</Badge>
              )}
              {(bySev.medium || 0) + (bySev.low || 0) > 0 && (
                <Badge variant="secondary" className="px-1.5 text-xs">
                  +{(bySev.medium || 0) + (bySev.low || 0)}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'duration_ms',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDuration(row.original.duration_ms)}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Started
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.started_at || row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedSession(row.original)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: sessions,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  if (error) {
    return (
      <Card className="mt-4">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Failed to load scan sessions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Radar className="h-4 w-4" />
              Total Sessions
            </CardDescription>
            {loadingStats ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card
          className={`cursor-pointer hover:border-blue-500 transition-colors ${statusFilter === 'running' ? 'border-blue-500' : ''}`}
          onClick={() => setStatusFilter('running')}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Running
            </CardDescription>
            {loadingStats ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <CardTitle className="text-3xl text-blue-500">{statusCounts.running}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card
          className={`cursor-pointer hover:border-green-500 transition-colors ${statusFilter === 'completed' ? 'border-green-500' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </CardDescription>
            {loadingStats ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <CardTitle className="text-3xl text-green-500">{statusCounts.completed}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card
          className={`cursor-pointer hover:border-red-500 transition-colors ${statusFilter === 'failed' ? 'border-red-500' : ''}`}
          onClick={() => setStatusFilter('failed')}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Failed
            </CardDescription>
            {loadingStats ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <CardTitle className="text-3xl text-red-500">{statusCounts.failed}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardDescription>
            {loadingStats ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <CardTitle className="text-3xl">{statusCounts.pending}</CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scan Sessions</CardTitle>
          <CardDescription>Real-time view of scan executions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Quick Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter)
              setPage(1)
            }}
            className="mb-4"
          >
            <TabsList>
              {statusFilters.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                  {filter.label}
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {statusCounts[filter.value as keyof typeof statusCounts]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loadingSessions ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSession(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No scan sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalSessions)} of{' '}
              {totalSessions} sessions
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5" />
              Scan Session Details
            </SheetTitle>
            <SheetDescription>
              {selectedSession?.scanner_name} - {selectedSession?.asset_value}
            </SheetDescription>
          </SheetHeader>
          {selectedSession && <SessionDetailView session={selectedSession} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

// Session Detail View Component
function SessionDetailView({ session }: { session: ScanSession }) {
  const config = statusConfig[session.status] || statusConfig.pending
  const bySev = session.findings_by_severity || {}

  return (
    <div className="mt-6 space-y-6">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge className={`${config.bgColor} ${config.color} border-0`}>
          {SCAN_RUN_STATUS_LABELS[session.status] || session.status}
        </Badge>
        {session.scanner_version && <Badge variant="outline">v{session.scanner_version}</Badge>}
      </div>

      <Separator />

      {/* Target Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Target</h4>
        <div className="p-3 rounded-lg border">
          <p className="font-medium">{session.asset_value}</p>
          <p className="text-sm text-muted-foreground">{session.asset_type}</p>
          {session.branch && (
            <p className="text-sm text-muted-foreground mt-1">Branch: {session.branch}</p>
          )}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Findings</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border text-center">
            <p className="text-2xl font-bold">{session.findings_total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 rounded-lg border text-center">
            <p className="text-2xl font-bold text-green-500">{session.findings_new}</p>
            <p className="text-xs text-muted-foreground">New</p>
          </div>
        </div>
        {session.findings_total > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {(bySev.critical || 0) > 0 && (
              <Badge className="bg-red-600">Critical: {bySev.critical}</Badge>
            )}
            {(bySev.high || 0) > 0 && <Badge className="bg-orange-500">High: {bySev.high}</Badge>}
            {(bySev.medium || 0) > 0 && (
              <Badge className="bg-yellow-500">Medium: {bySev.medium}</Badge>
            )}
            {(bySev.low || 0) > 0 && <Badge variant="secondary">Low: {bySev.low}</Badge>}
          </div>
        )}
      </div>

      {/* Timing */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Timing</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="text-sm font-medium">
              {session.started_at ? formatDate(session.started_at) : '-'}
            </p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-sm font-medium">
              {session.completed_at ? formatDate(session.completed_at) : '-'}
            </p>
          </div>
          <div className="p-3 rounded-lg border col-span-2">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium">{formatDuration(session.duration_ms)}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {session.error_message && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-500">Error</h4>
          <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
            <p className="text-sm text-red-400">{session.error_message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

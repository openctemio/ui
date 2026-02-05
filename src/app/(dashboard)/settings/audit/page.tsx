'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  History,
  Search as SearchIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ShieldX,
  User,
  Users,
  Settings,
  Key,
  Mail,
  Building,
  Calendar,
  Activity,
  Loader2,
  Copy,
  ScrollText,
  ArrowUpDown,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  useAuditLogs,
  useAuditStats,
  type AuditLog,
  type AuditLogFilters,
  type AuditResult,
  type AuditSeverity,
  RESULT_DISPLAY,
  SEVERITY_DISPLAY,
  formatAction,
  getActionCategory,
} from '@/features/organization'
import { Permission, useHasPermission } from '@/lib/permissions'

// Helper functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

const getActionIcon = (action: string) => {
  const category = getActionCategory(action)
  switch (category) {
    case 'user':
      return User
    case 'member':
      return Users
    case 'invitation':
      return Mail
    case 'tenant':
      return Building
    case 'settings':
      return Settings
    case 'auth':
      return Key
    case 'permission':
      return ShieldAlert
    default:
      return Activity
  }
}

const getResultIcon = (result: AuditResult) => {
  switch (result) {
    case 'success':
      return CheckCircle
    case 'failure':
      return XCircle
    case 'denied':
      return ShieldAlert
    default:
      return AlertCircle
  }
}

export default function AuditLogPage() {
  // Permission check
  const hasAuditPermission = useHasPermission(Permission.AuditRead)

  // Filters state
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 0,
    per_page: 20,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Build filters with search
  const activeFilters = useMemo(
    () => ({
      ...filters,
      search: searchTerm || undefined,
    }),
    [filters, searchTerm]
  )

  // Fetch data (tenant is extracted from JWT token by backend)
  // Only fetch if user has permission
  const { logs, total, page, totalPages, isLoading, isError, mutate } = useAuditLogs(
    hasAuditPermission ? activeFilters : undefined
  )
  const { stats, isLoading: statsLoading } = useAuditStats()

  // Access denied page
  if (!hasAuditPermission) {
    return (
      <>
        <Main>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
              <ShieldX className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don&apos;t have permission to view audit logs. Please contact your administrator
              to request access.
            </p>
          </div>
        </Main>
      </>
    )
  }

  // Filter options
  const resultOptions: AuditResult[] = ['success', 'failure', 'denied']
  const severityOptions: AuditSeverity[] = ['info', 'low', 'medium', 'high', 'critical']

  // Active filters count
  const activeFiltersCount = [
    filters.result?.length,
    filters.severity?.length,
    filters.action?.length,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilters({ page: 0, per_page: 20 })
    setSearchTerm('')
  }

  // Pagination
  const goToPage = (newPage: number) => {
    setFilters({ ...filters, page: newPage })
  }

  return (
    <>
      <Main>
        <PageHeader title="Audit Log" description="View activity history and security events">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Total Events (7 days)
              </CardDescription>
              <CardTitle className="text-3xl">
                {statsLoading ? <Skeleton className="h-9 w-16" /> : (stats?.total_logs ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Successful
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  (stats?.logs_by_result?.success ?? 0)
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  (stats?.logs_by_result?.failure ?? 0)
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                Denied
              </CardDescription>
              <CardTitle className="text-3xl text-orange-500">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  (stats?.logs_by_result?.denied ?? 0)
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Audit Log Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Activity History</CardTitle>
                <CardDescription>{total} events found</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by actor, action, resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* System Event Filter */}
                <div className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-background">
                  <Switch
                    id="exclude-system"
                    checked={filters.exclude_system}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, exclude_system: checked, page: 0 })
                    }
                  />
                  <Label htmlFor="exclude-system" className="text-sm font-normal cursor-pointer">
                    Exclude System
                  </Label>
                </div>

                {/* Result Filter */}
                <Select
                  value={filters.result?.[0] || 'all'}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      result: value === 'all' ? undefined : [value as AuditResult],
                      page: 0,
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    {resultOptions.map((result) => (
                      <SelectItem key={result} value={result}>
                        {RESULT_DISPLAY[result].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Severity Filter */}
                <Select
                  value={filters.severity?.[0] || 'all'}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      severity: value === 'all' ? undefined : [value as AuditSeverity],
                      page: 0,
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    {severityOptions.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {SEVERITY_DISPLAY[severity].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error State */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-muted-foreground">Failed to load audit logs</p>
                <Button variant="outline" onClick={() => mutate()}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Table */}
            {!isLoading && !isError && (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="w-[180px] cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const isAsc = filters.sort_by === 'logged_at' && filters.sort_order === 'asc'
                            setFilters({
                              ...filters,
                              sort_by: 'logged_at',
                              sort_order: isAsc ? 'desc' : 'asc',
                            })
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Time
                            {filters.sort_by === 'logged_at' && (
                              <ArrowUpDown className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                            {!filters.sort_by && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">Actor</div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const isAsc = filters.sort_by === 'action' && filters.sort_order === 'asc'
                            setFilters({
                              ...filters,
                              sort_by: 'action',
                              sort_order: isAsc ? 'desc' : 'asc',
                            })
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Action
                            {filters.sort_by === 'action' && (
                              <ArrowUpDown className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const isAsc = filters.sort_by === 'resource_type' && filters.sort_order === 'asc'
                            setFilters({
                              ...filters,
                              sort_by: 'resource_type',
                              sort_order: isAsc ? 'desc' : 'asc',
                            })
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Resource
                            {filters.sort_by === 'resource_type' && (
                              <ArrowUpDown className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const isAsc = filters.sort_by === 'result' && filters.sort_order === 'asc'
                            setFilters({
                              ...filters,
                              sort_by: 'result',
                              sort_order: isAsc ? 'desc' : 'asc',
                            })
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Result
                            {filters.sort_by === 'result' && (
                              <ArrowUpDown className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const isAsc = filters.sort_by === 'severity' && filters.sort_order === 'asc'
                            setFilters({
                              ...filters,
                              sort_by: 'severity',
                              sort_order: isAsc ? 'desc' : 'asc',
                            })
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Severity
                            {filters.sort_by === 'severity' && (
                              <ArrowUpDown className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => {
                          const ActionIcon = getActionIcon(log.action)
                          const ResultIcon = getResultIcon(log.result)
                          const resultDisplay = RESULT_DISPLAY[log.result]
                          const severityDisplay = SEVERITY_DISPLAY[log.severity]

                          return (
                            <TableRow
                              key={log.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedLog(log)}
                            >
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {formatRelativeTime(log.timestamp)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(log.timestamp)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-xs">
                                      {log.actor_email?.substring(0, 2).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate max-w-[150px]">
                                    {log.actor_email || 'System'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  <ActionIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{formatAction(log.action)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    {log.resource_name || log.resource_id}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {log.resource_type}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${resultDisplay.bgColor} ${resultDisplay.color} border-0 gap-1`}
                                >
                                  <ResultIcon className="h-3 w-3" />
                                  {resultDisplay.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${severityDisplay.bgColor} ${severityDisplay.color} border-0`}
                                >
                                  {severityDisplay.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {logs.length} of {total} events
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(0)}
                      disabled={page === 0}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages - 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Audit Log Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto p-0 gap-0">
          <VisuallyHidden>
            <SheetTitle>Audit Log Details</SheetTitle>
          </VisuallyHidden>
          {selectedLog && (
            <div className="flex flex-col h-full">
              {/* Header - Clean Design */}
              <div className="pl-6 pr-16 py-6 border-b bg-muted/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = getResultIcon(selectedLog.result)
                        return (
                          <Icon
                            className={`h-5 w-5 ${RESULT_DISPLAY[selectedLog.result].color.replace(
                              'text-',
                              'text-opacity-90 text-'
                            )}`}
                          />
                        )
                      })()}
                      <h2 className="text-xl font-semibold leading-none">{formatAction(selectedLog.action)}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedLog.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className={`${RESULT_DISPLAY[selectedLog.result].color} border-current/20 bg-transparent`}
                    >
                      {RESULT_DISPLAY[selectedLog.result].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${SEVERITY_DISPLAY[selectedLog.severity].color} border-current/20 bg-transparent`}
                    >
                      {SEVERITY_DISPLAY[selectedLog.severity].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* 2-Column Grid for High-Level Info */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Actor */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> Actor
                    </h4>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-muted">
                          {selectedLog.actor_email?.substring(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={selectedLog.actor_email || 'System'}>
                          {selectedLog.actor_email || 'System'}
                        </p>
                        {selectedLog.actor_ip && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                              {selectedLog.actor_ip}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> Timestamp
                    </h4>
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">
                        {new Date(selectedLog.timestamp).toLocaleString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(selectedLog.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resource Info */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5" /> Resource
                  </h4>
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col divide-y">
                      <div className="flex items-center justify-between p-3 text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{selectedLog.resource_type}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{selectedLog.resource_name || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 text-sm">
                        <span className="text-muted-foreground">ID</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {selectedLog.resource_id}
                          </code>
                          <CopyButton value={selectedLog.resource_id} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changes (Diff View) */}
                {selectedLog.changes?.field_changes &&
                  Object.keys(selectedLog.changes.field_changes).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" /> Changes
                      </h4>
                      <div className="rounded-lg border divide-y">
                        {Object.entries(selectedLog.changes.field_changes).map(
                          ([field, change]) => (
                            <div key={field} className="p-3 text-sm grid grid-cols-[1fr,2fr] gap-4 items-center">
                              <span className="font-medium text-muted-foreground break-all">{field}</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 mb-1 sm:mb-0">
                                  {String(change.old)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/10 dark:bg-green-400/10 dark:text-green-400">
                                  {String(change.new)}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <ScrollText className="h-3.5 w-3.5" /> Metadata
                    </h4>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        {Object.entries(selectedLog.metadata).map(([key, value]) => (
                          <div key={key} className="sm:col-span-1">
                            <dt className="text-xs font-medium text-muted-foreground mb-1">{key}</dt>
                            <dd className="text-sm font-mono break-all">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}

                {/* Request ID Footer */}
                {selectedLog.request_id && (
                  <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>Request ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{selectedLog.request_id}</span>
                      <CopyButton value={selectedLog.request_id} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
      {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  )
}

'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { StatusBadge, RunStatusBadge, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  Target,
  Calendar,
  Layers,
  Copy,
  Tag,
  AlertTriangle,
  XCircle,
  Radar,
  Settings,
  Activity,
} from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard'
import { triggerErrorHint } from '@/features/scan-zones'
import { RunDetailSheet } from '@/features/scans/components/run-detail-sheet'
import { Can, Permission } from '@/lib/permissions'
import { useScanConfig, useScanRuns, invalidateScanConfigsCache } from '@/lib/api/scan-hooks'
import { post, del } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { scanEndpoints, pipelineRunEndpoints } from '@/lib/api/endpoints'
import {
  SCAN_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  SENSOR_PREFERENCE_LABELS,
  type PipelineRun,
} from '@/lib/api/scan-types'
import { PIPELINE_TRIGGER_LABELS, type PipelineTriggerType } from '@/lib/api/pipeline-types'
import {
  isRunInProgress,
  runTriggeredByLabel,
  scanRunCounts,
} from '@/features/scans/lib/run-display'

// Format date helper
function formatDate(dateString: string | undefined) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

// Format duration helper
function formatDuration(ms: number | undefined) {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

// A pipeline run reports timestamps, not a duration_ms, so derive it. A run
// that has started but not finished shows elapsed time so far.
function formatRunDuration(run: PipelineRun) {
  if (!run.started_at) return '-'
  const end = run.completed_at ? new Date(run.completed_at) : new Date()
  return formatDuration(end.getTime() - new Date(run.started_at).getTime())
}

export default function ScanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string

  const [isTriggering, setIsTriggering] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null)
  // Run detail sheet (dispatch: routing, targets not scanned and why).
  const [openRunId, setOpenRunId] = useState<string | null>(null)

  // Fetch scan config
  const { data: config, isLoading, error } = useScanConfig(scanId)

  // Runs of THIS scan. This used to list scan sessions, which are a sensor's
  // execution records and carry no scan_id — so the list showed the tenant's
  // last 10 sessions no matter which scan you opened. Pipeline runs carry
  // scan_id, so this endpoint answers the question the page is asking.
  const {
    data: runsResponse,
    isLoading: isLoadingRuns,
    mutate: refetchRuns,
  } = useScanRuns(scanId, 10, { refreshInterval: 10000 })

  const recentRuns = useMemo(() => runsResponse?.data || [], [runsResponse])

  // Run counts. The scan's counters only move when a run finishes, so the
  // total adds the runs still in progress (see scanRunCounts).
  const counts = useMemo(
    () => (config ? scanRunCounts(config, recentRuns) : null),
    [config, recentRuns]
  )
  const progress = counts?.successRate ?? 0

  // Action handlers
  const handleTriggerScan = async () => {
    if (!config) return
    setIsTriggering(true)
    try {
      await post(scanEndpoints.trigger(config.id), {})
      toast.success(`Scan "${config.name}" triggered successfully`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to trigger scan:', error)
      toast.error(getErrorMessage(error, `Failed to trigger scan "${config.name}"`), {
        description: triggerErrorHint(error),
      })
    } finally {
      setIsTriggering(false)
    }
  }

  // Cancel an active run. Backend cascade-cancels all in-flight commands.
  // This posted to /scan-sessions/{id}/stop, a route that does not exist —
  // the scan-sessions group has no /stop. Pipeline runs do have /cancel.
  const handleStopRun = async (run: PipelineRun) => {
    setStoppingRunId(run.id)
    try {
      await post(pipelineRunEndpoints.cancel(run.id), {})
      toast.success('Run cancelled. In-flight commands will stop shortly.')
      await refetchRuns()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel run'))
    } finally {
      setStoppingRunId(null)
    }
  }

  const handlePauseConfig = async () => {
    if (!config) return
    setIsPausing(true)
    try {
      await post(scanEndpoints.pause(config.id), {})
      toast.success(`Scan "${config.name}" paused`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to pause scan:', error)
      toast.error(getErrorMessage(error, `Failed to pause scan "${config.name}"`))
    } finally {
      setIsPausing(false)
    }
  }

  const handleActivateConfig = async () => {
    if (!config) return
    setIsActivating(true)
    try {
      await post(scanEndpoints.activate(config.id), {})
      toast.success(`Scan "${config.name}" activated`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to activate scan:', error)
      toast.error(getErrorMessage(error, `Failed to activate scan "${config.name}"`))
    } finally {
      setIsActivating(false)
    }
  }

  const handleDeleteConfig = async () => {
    if (!config) return
    setIsDeleting(true)
    try {
      await del(scanEndpoints.delete(config.id))
      toast.success(`Scan "${config.name}" deleted`)
      router.push('/scans')
    } catch (error) {
      console.error('Failed to delete scan:', error)
      toast.error(getErrorMessage(error, `Failed to delete scan "${config.name}"`))
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  // All ten recent runs are on the client, so the headers sort them. Rebuilt
  // each render: the cancel action reads the in-flight run id.
  const runColumns: ColumnDef<PipelineRun>[] = [
    {
      id: 'started',
      accessorFn: (run) => (run.started_at ? new Date(run.started_at).getTime() : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Started" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.original.started_at)}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const run = row.original
        return (
          <div className="flex items-center gap-1">
            <RunStatusBadge status={run.status} />
            {run.failed_steps > 0 && (
              <Badge
                variant="outline"
                className="text-xs text-destructive"
                title={run.error_message || `${run.failed_steps} step(s) failed`}
              >
                <AlertTriangle className="h-3 w-3 me-0.5" />
                {run.failed_steps}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'trigger_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trigger" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>
            {PIPELINE_TRIGGER_LABELS[row.original.trigger_type as PipelineTriggerType] ??
              row.original.trigger_type}
          </span>
          {runTriggeredByLabel(row.original) && (
            <span className="text-xs text-muted-foreground">
              {runTriggeredByLabel(row.original)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'steps',
      header: 'Steps',
      cell: ({ row }) => (
        <>
          <span className="tabular-nums">
            {row.original.completed_steps}/{row.original.total_steps}
          </span>
          {row.original.skipped_steps > 0 && (
            <span className="ms-1 text-xs text-muted-foreground">
              ({row.original.skipped_steps} skipped)
            </span>
          )}
        </>
      ),
    },
    {
      accessorKey: 'total_findings',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
      cell: ({ row }) =>
        row.original.total_findings > 0 ? (
          <Badge variant="secondary" className="tabular-nums">
            {row.original.total_findings}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => <span className="tabular-nums">{formatRunDuration(row.original)}</span>,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const run = row.original
        if (!isRunInProgress(run)) return null
        return (
          // PipelinesWrite, not ScansWrite. Cancel posts to
          // POST /pipeline-runs/{id}/cancel, and that route
          // requires pipelines:write. Gating on scans:write
          // showed an enabled button to users the API would
          // reject with a 403 — the button changed endpoint
          // in #335 and the permission gate did not follow.
          <Can permission={Permission.PipelinesWrite}>
            <Button
              size="sm"
              variant="ghost"
              disabled={stoppingRunId === run.id}
              onClick={() => handleStopRun(run)}
              aria-label={`Cancel run ${run.id}`}
            >
              {stoppingRunId === run.id ? (
                <RefreshCw className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="me-1 h-4 w-4" />
              )}
              Cancel
            </Button>
          </Can>
        )
      },
    },
  ]

  // Loading state
  if (isLoading) {
    return (
      <Main>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </Main>
    )
  }

  // Error state
  if (error || !config) {
    return (
      <Main>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Scan Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The scan configuration you&apos;re looking for doesn&apos;t exist or you don&apos;t have
            access to it.
          </p>
          <Button asChild>
            <Link href="/scans">
              <ArrowLeft className="me-2 h-4 w-4" />
              Back to Scans
            </Link>
          </Button>
        </div>
      </Main>
    )
  }

  return (
    <Main>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/scans">
            <ArrowLeft className="me-2 h-4 w-4" />
            Back to Scans
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                config.status === 'active'
                  ? 'bg-blue-500/10'
                  : config.status === 'paused'
                    ? 'bg-yellow-500/10'
                    : 'bg-gray-500/10'
              }`}
            >
              <Radar
                className={`h-6 w-6 ${
                  config.status === 'active'
                    ? 'text-blue-500'
                    : config.status === 'paused'
                      ? 'text-yellow-500'
                      : 'text-gray-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{config.name}</h1>
                <StatusBadge
                  status={
                    config.status === 'active'
                      ? 'active'
                      : config.status === 'paused'
                        ? 'pending'
                        : 'inactive'
                  }
                />
              </div>
              {config.description && <p className="text-muted-foreground">{config.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{SCAN_TYPE_LABELS[config.scan_type]}</Badge>
                <Badge variant="outline">{SCHEDULE_TYPE_LABELS[config.schedule_type]}</Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {config.status === 'active' && (
              <>
                <Button onClick={handleTriggerScan} disabled={isTriggering || isPausing}>
                  {isTriggering ? (
                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="me-2 h-4 w-4" />
                  )}
                  Trigger
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePauseConfig}
                  disabled={isPausing || isTriggering}
                >
                  {isPausing ? (
                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="me-2 h-4 w-4" />
                  )}
                  Pause
                </Button>
              </>
            )}
            {config.status === 'paused' && (
              <>
                <Button onClick={handleActivateConfig} disabled={isActivating || isTriggering}>
                  {isActivating ? (
                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="me-2 h-4 w-4" />
                  )}
                  Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTriggerScan}
                  disabled={isTriggering || isActivating}
                >
                  {isTriggering ? (
                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="me-2 h-4 w-4" />
                  )}
                  Trigger Once
                </Button>
              </>
            )}
            {config.status === 'disabled' && (
              <Button onClick={handleActivateConfig} disabled={isActivating}>
                {isActivating ? (
                  <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                Enable
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts?.total ?? config.total_runs}</p>
                <p className="text-xs text-muted-foreground">
                  Total Runs
                  {counts && counts.inProgress > 0 && <> · {counts.inProgress} in progress</>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.successful_runs}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.failed_runs}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${
                    progress >= 80
                      ? 'text-green-500'
                      : progress >= 50
                        ? 'text-yellow-500'
                        : progress === 0
                          ? 'text-muted-foreground'
                          : 'text-red-500'
                  }`}
                >
                  {progress}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The ten most recent executions of this scan
          </p>
          <DataTable
            columns={runColumns}
            data={recentRuns}
            getRowId={(run) => run.id}
            isLoading={isLoadingRuns}
            showSearch={false}
            onRowClick={(run) => setOpenRunId(run.id)}
            emptyMessage="No runs yet"
            emptyDescription="Trigger this scan to see run history"
          />
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Frequency</span>
                  </div>
                  <span className="text-sm font-medium">
                    {SCHEDULE_TYPE_LABELS[config.schedule_type]}
                  </span>
                </div>
                {config.schedule_time && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Time</span>
                    </div>
                    <span className="text-sm font-medium">{config.schedule_time}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Timezone</span>
                  </div>
                  <span className="text-sm font-medium">{config.schedule_timezone}</span>
                </div>
                {config.next_run_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Next Run</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(config.next_run_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sensor Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Sensor Preference</span>
                  </div>
                  <span className="text-sm font-medium">
                    {SENSOR_PREFERENCE_LABELS[config.sensor_preference]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Targets per Job</span>
                  </div>
                  <span className="text-sm font-medium">{config.targets_per_job}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {config.tags && config.tags.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {config.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Targets - show asset groups and/or direct targets */}
            {((config.asset_group_ids && config.asset_group_ids.length > 0) ||
              config.asset_group_id ||
              (config.targets && config.targets.length > 0)) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Targets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Asset Groups */}
                  {config.asset_group_ids && config.asset_group_ids.length > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Asset Groups</p>
                      <div className="flex flex-wrap gap-2">
                        {config.asset_group_ids.map((id) => (
                          <Badge key={id} variant="outline">
                            {id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : config.asset_group_id ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Asset Group</p>
                      <Badge variant="outline">{config.asset_group_id}</Badge>
                    </div>
                  ) : null}
                  {/* Direct Targets */}
                  {config.targets && config.targets.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Direct Targets ({config.targets.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {config.targets.map((target, i) => (
                          <Badge key={i} variant="secondary">
                            {target}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(config.created_at)}</p>
                  </div>
                </div>
                {config.last_run_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                      <Play className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last Run</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(config.last_run_at)}
                      </p>
                    </div>
                  </div>
                )}
                {config.next_run_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Next Scheduled</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(config.next_run_at)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Config ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[180px]">
                      {config.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        copyToClipboard(config.id)
                        toast.success('ID copied to clipboard')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {config.pipeline_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pipeline</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[180px]">
                      {config.pipeline_id}
                    </code>
                  </div>
                )}
                {(config.created_by_name || config.created_by) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created By</span>
                    <span className="text-sm font-medium">
                      {config.created_by_name || config.created_by}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Can permission={Permission.ScansDelete}>
              <Card className="md:col-span-2 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-base text-red-500">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete this configuration and all associated data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    Delete Configuration
                  </Button>
                </CardContent>
              </Card>
            </Can>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Scan Configuration"
        desc={
          <>
            Are you sure you want to delete &quot;{config.name}&quot;? This action cannot be undone
            and will remove all associated run history.
          </>
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfig}
      />
      <RunDetailSheet runId={openRunId} onOpenChange={(o) => !o && setOpenRunId(null)} />
    </Main>
  )
}

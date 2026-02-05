'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatusBadge } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  ExternalLink,
} from 'lucide-react'
import { Can, Permission } from '@/lib/permissions'
import { useScanConfig, useScanSessions, invalidateScanConfigsCache } from '@/lib/api/scan-hooks'
import { post, del } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { scanEndpoints } from '@/lib/api/endpoints'
import {
  SCAN_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  SCAN_CONFIG_STATUS_LABELS,
  AGENT_PREFERENCE_LABELS,
  SCAN_RUN_STATUS_LABELS,
  type ScanSession,
  type ScanRunStatus,
} from '@/lib/api/scan-types'

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

// Run status badge component
function RunStatusBadge({ status }: { status: ScanRunStatus }) {
  const variants: Record<ScanRunStatus, { className: string; icon: React.ReactNode }> = {
    queued: {
      className: 'bg-purple-500/10 text-purple-500',
      icon: <Layers className="h-3 w-3" />,
    },
    pending: { className: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="h-3 w-3" /> },
    running: {
      className: 'bg-blue-500/10 text-blue-500',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    },
    completed: {
      className: 'bg-green-500/10 text-green-500',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    failed: { className: 'bg-red-500/10 text-red-500', icon: <XCircle className="h-3 w-3" /> },
    canceled: {
      className: 'bg-gray-500/10 text-gray-500',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    timeout: {
      className: 'bg-orange-500/10 text-orange-500',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  }
  const variant = variants[status] || variants.pending
  return (
    <Badge variant="outline" className={`gap-1 ${variant.className}`}>
      {variant.icon}
      {SCAN_RUN_STATUS_LABELS[status]}
    </Badge>
  )
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

  // Fetch scan config
  const { data: config, isLoading, error } = useScanConfig(scanId)

  // Fetch recent runs for this scan
  const { data: sessionsResponse, isLoading: isLoadingRuns } = useScanSessions(
    { per_page: 10 },
    { refreshInterval: 10000 } // Refresh every 10s
  )

  // Filter sessions for this scan config (if API supports it in future)
  const recentRuns = useMemo(() => {
    return sessionsResponse?.data || []
  }, [sessionsResponse])

  // Calculate progress
  const progress = useMemo(() => {
    if (!config || config.total_runs === 0) return 0
    return Math.round((config.successful_runs / config.total_runs) * 100)
  }, [config])

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
      toast.error(getErrorMessage(error, `Failed to trigger scan "${config.name}"`))
    } finally {
      setIsTriggering(false)
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
              <ArrowLeft className="mr-2 h-4 w-4" />
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
            <ArrowLeft className="mr-2 h-4 w-4" />
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
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Trigger
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePauseConfig}
                  disabled={isPausing || isTriggering}
                >
                  {isPausing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  Pause
                </Button>
              </>
            )}
            {config.status === 'paused' && (
              <>
                <Button onClick={handleActivateConfig} disabled={isActivating || isTriggering}>
                  {isActivating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTriggerScan}
                  disabled={isTriggering || isActivating}
                >
                  {isTriggering ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Trigger Once
                </Button>
              </>
            )}
            {config.status === 'disabled' && (
              <Button onClick={handleActivateConfig} disabled={isActivating}>
                {isActivating ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
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
                <p className="text-2xl font-bold">{config.total_runs}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
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
        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>History of scan executions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRuns ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No runs yet</p>
                  <p className="text-sm">Trigger this scan to see run history</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Scanner</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Findings</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRuns.map((run: ScanSession) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <RunStatusBadge status={run.status} />
                        </TableCell>
                        <TableCell className="font-medium">{run.scanner_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{run.asset_value}</TableCell>
                        <TableCell>
                          {run.findings_total > 0 ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary">{run.findings_total}</Badge>
                              {run.findings_new > 0 && (
                                <Badge className="bg-red-500">{run.findings_new} new</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(run.duration_ms)}</TableCell>
                        <TableCell>{formatDate(run.started_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
                <CardTitle className="text-base">Agent Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Agent Preference</span>
                  </div>
                  <span className="text-sm font-medium">
                    {AGENT_PREFERENCE_LABELS[config.agent_preference]}
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
                        navigator.clipboard.writeText(config.id)
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
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Configuration
                  </Button>
                </CardContent>
              </Card>
            </Can>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{config.name}&quot;? This action cannot be
              undone and will remove all associated run history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}

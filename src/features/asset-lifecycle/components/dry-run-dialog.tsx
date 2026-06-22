'use client'

import React from 'react'
import { PlayCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { runAssetLifecycleDryRun } from '../api'
import type { LifecycleRunReport } from '../types'

interface DryRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called with the unix-second timestamp the backend stamped onto
   * the tenant's settings after a successful dry-run. The form uses
   * this to unlock the enabled toggle without re-fetching.
   */
  onSuccess?: (completedAt: number) => void
}

export function DryRunDialog({ open, onOpenChange, onSuccess }: DryRunDialogProps) {
  const { currentTenant } = useTenant()
  const [report, setReport] = React.useState<LifecycleRunReport | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      // Reset state when the dialog closes so next open starts fresh.
      setReport(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  const handleRun = React.useCallback(async () => {
    if (!currentTenant) return
    setLoading(true)
    setError(null)
    try {
      const result = await runAssetLifecycleDryRun(currentTenant.id)
      setReport(result)
      // Backend stamps dry_run_completed_at server-side on success;
      // surface the completion timestamp upward immediately.
      const completedAt = Math.floor(new Date(result.completed_at).getTime() / 1000)
      onSuccess?.(completedAt)
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [currentTenant, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Lifecycle dry-run
          </DialogTitle>
          <DialogDescription>
            Evaluates the current thresholds against live data without writing any status changes.
            Use this to preview impact before enabling the feature or after changing thresholds.
          </DialogDescription>
        </DialogHeader>

        {!report && !loading && !error && (
          <div className="py-4 text-sm text-muted-foreground">
            Click <span className="font-medium">Run now</span> to preview how many assets would
            transition with your current settings.
          </div>
        )}

        {loading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Dry-run failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Dry-run complete</AlertTitle>
              <AlertDescription>
                Finished in {durationSeconds(report)}s. Nothing was written. Review the counts below
                before enabling the feature.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Would be flagged stale"
                value={report.transitioned_to_stale.toLocaleString()}
                emphasize={report.transitioned_to_stale > 0}
              />
              <StatBox label="Stale threshold" value={`${report.stale_threshold_days}d`} />
              <StatBox label="Grace period" value={`${report.grace_period_days}d`} />
              <StatBox
                label="Excluded source types"
                value={report.excluded_source_types.join(', ') || '—'}
              />
            </div>

            {report.skipped && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tenant skipped</AlertTitle>
                <AlertDescription>
                  Reason: <span className="font-mono">{report.skip_reason}</span>. When the worker
                  runs live the same condition will cause it to no-op.
                </AlertDescription>
              </Alert>
            )}

            {report.affected_asset_ids && report.affected_asset_ids.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Sample affected assets ({report.affected_asset_ids.length} of up to 100):
                </p>
                <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded border bg-muted/30 p-2">
                  {report.affected_asset_ids.map((id) => (
                    <Badge key={id} variant="outline" className="font-mono text-xs">
                      {id.slice(0, 8)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void handleRun()} disabled={loading}>
            {report ? 'Run again' : 'Run now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="space-y-1 rounded-md border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? 'text-lg font-semibold text-amber-600' : 'text-lg font-medium'}>
        {value}
      </p>
    </div>
  )
}

function durationSeconds(report: LifecycleRunReport): string {
  try {
    const start = new Date(report.started_at).getTime()
    const end = new Date(report.completed_at).getTime()
    return ((end - start) / 1000).toFixed(1)
  } catch {
    return '—'
  }
}

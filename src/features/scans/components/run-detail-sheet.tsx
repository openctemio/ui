'use client'

import useSWR from 'swr'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { RunDispatchPanel } from '@/features/scan-zones'
import { ErrorState, RunStatusBadge } from '@/features/shared'
import { get } from '@/lib/api/client'
import { pipelineRunEndpoints } from '@/lib/api/endpoints'
import type { PipelineRun } from '@/lib/api/scan-types'

interface RunDetailSheetProps {
  runId: string | null
  onOpenChange: (open: boolean) => void
}

function formatTime(ts?: string) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

/**
 * One scan run: status, timing and what its trigger dispatched (resolved and
 * excluded targets, zone routing, targets not scanned and why).
 */
export function RunDetailSheet({ runId, onOpenChange }: RunDetailSheetProps) {
  const {
    data: run,
    error,
    isLoading,
    mutate,
  } = useSWR<PipelineRun>(
    runId ? pipelineRunEndpoints.get(runId) : null,
    (url: string) => get<PipelineRun>(url),
    { revalidateOnFocus: false }
  )

  return (
    <Sheet open={!!runId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Scan run</SheetTitle>
          <SheetDescription className="break-all font-mono text-xs">{runId}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {error ? (
            <ErrorState title="run" error={error} onRetry={() => void mutate()} />
          ) : isLoading || !run ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="mt-0.5">
                    <RunStatusBadge status={run.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Findings</dt>
                  <dd className="mt-0.5 tabular-nums">{run.total_findings}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Started</dt>
                  <dd className="mt-0.5">{formatTime(run.started_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Completed</dt>
                  <dd className="mt-0.5">{formatTime(run.completed_at)}</dd>
                </div>
              </dl>

              {run.error_message && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {run.error_message}
                </p>
              )}

              <section aria-labelledby="run-dispatch-heading" className="space-y-3">
                <h3 id="run-dispatch-heading" className="text-base font-semibold">
                  Dispatch
                </h3>
                {run.dispatch ? (
                  <RunDispatchPanel dispatch={run.dispatch} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This run recorded no dispatch details (runs from before target routing).
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { coverageState, STATE_BAR, STATE_TEXT } from '../../lib/ctem-colors'
import type { CtemMaturityPoint } from '../../hooks/use-ctem-dashboard'

interface CtemMaturityCardProps {
  data?: CtemMaturityPoint[]
  isLoading?: boolean
}

/**
 * CTEM maturity gauge — module-gated (`ctem_cycles`). Only rendered when the
 * module is enabled; the fetch is skipped otherwise, so this never sees a 403.
 * Shape is read defensively (either `maturity_score` or `score`).
 */
export function CtemMaturityCard({ data, isLoading }: CtemMaturityCardProps) {
  const latest = data && data.length > 0 ? data[data.length - 1] : undefined
  const score = latest?.maturity_score ?? latest?.score ?? 0
  const state = coverageState(score)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">CTEM maturity</span>
        <span className="font-mono text-[11px] text-muted-foreground">ctem-cycles · trend</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span
                className={cn('font-mono text-3xl font-semibold tabular-nums', STATE_TEXT[state])}
              >
                {score.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">maturity score</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted">
              <div
                className={cn('h-full rounded', STATE_BAR[state])}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

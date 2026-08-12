'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/features/shared'
import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { coverageState, STATE_BAR, STATE_TEXT } from '../../lib/ctem-colors'
import type { CtemMaturityTrend } from '../../hooks/use-ctem-dashboard'

interface CtemMaturityCardProps {
  data?: CtemMaturityTrend
  isLoading?: boolean
}

/**
 * CTEM maturity gauge — module-gated (`ctem_cycles`). Only rendered when the
 * module is enabled; the fetch is skipped otherwise, so this never sees a 403.
 * The endpoint returns an object; the score lives at `data.maturity.score`
 * (0-100), with stage coverage and cycle count read from the same sub-object.
 */
export function CtemMaturityCard({ data, isLoading }: CtemMaturityCardProps) {
  const score = data?.maturity?.score ?? 0
  const covered = data?.maturity?.ctem_stage_coverage?.covered_count
  const cycles = data?.maturity?.cycles_analyzed ?? data?.cycles_analyzed ?? 0
  const state = coverageState(score)

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">CTEM maturity</span>
        <span className="text-[11px] text-muted-foreground">ctem-cycles · trend</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : cycles === 0 || !data?.maturity ? (
          <EmptyState
            icon={Gauge}
            title="No closed cycles yet"
            description="Maturity appears after your first CTEM cycle closes."
            card={false}
          />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-semibold tabular-nums', STATE_TEXT[state])}>
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
            <p className="mt-2 text-[11px] text-muted-foreground">
              {covered !== undefined && `${covered} of 5 CTEM stages`}
              {covered !== undefined && ' · '}
              {`${cycles} cycle${cycles === 1 ? '' : 's'} analyzed`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

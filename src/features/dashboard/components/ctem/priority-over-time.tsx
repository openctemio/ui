'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import type { PriorityClass } from '@/features/findings/types/finding.types'
import { cn } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from '@/components/charts'
import { PRIORITY_CHART_COLORS, PRIORITY_ORDER } from '../../lib/ctem-colors'
import type { RiskTrendPoint } from '../../hooks/use-ctem-dashboard'

interface PriorityOverTimeProps {
  trend?: RiskTrendPoint[]
  isLoading?: boolean
}

export function PriorityOverTime({ trend, isLoading }: PriorityOverTimeProps) {
  const points = trend ?? []
  const latest = points[points.length - 1]

  const current: Record<PriorityClass, number> = {
    P0: latest?.p0_open ?? 0,
    P1: latest?.p1_open ?? 0,
    P2: latest?.p2_open ?? 0,
    P3: latest?.p3_open ?? 0,
  }
  const max = Math.max(1, ...PRIORITY_ORDER.map((p) => current[p]))

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">Priority classes over time</span>
        <span className="font-mono text-[11px] text-muted-foreground">P0–P3 open · 90d</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : points.length > 1 ? (
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                />
                {PRIORITY_ORDER.map((p) => (
                  <Area
                    key={p}
                    type="monotone"
                    dataKey={`${p.toLowerCase()}_open`}
                    name={p}
                    stackId="1"
                    stroke={PRIORITY_CHART_COLORS[p]}
                    fill={PRIORITY_CHART_COLORS[p]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
            No trend data yet
          </div>
        )}

        {/* Current distribution */}
        <div className="mt-3 flex flex-col gap-1.5">
          {PRIORITY_ORDER.map((p) => (
            <div key={p} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2.5">
              <PriorityClassBadge priorityClass={p} showTooltip={false} />
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className={cn('h-full rounded')}
                  style={{
                    width: `${(current[p] / max) * 100}%`,
                    backgroundColor: PRIORITY_CHART_COLORS[p],
                  }}
                />
              </div>
              <span className="text-right font-mono text-[13px] tabular-nums">{current[p]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

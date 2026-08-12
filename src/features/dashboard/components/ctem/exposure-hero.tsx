'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRiskScore } from '@/features/shared'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from '@/components/charts'
import type { ExecutiveSummary, RiskTrendPoint } from '../../hooks/use-ctem-dashboard'
import { PRIORITY_CHART_COLORS, STATE_TEXT } from '../../lib/ctem-colors'

interface ExposureHeroProps {
  summary?: ExecutiveSummary
  trend?: RiskTrendPoint[]
  /** Number of exposure chains that traverse a KEV vulnerability. */
  kevChainCount: number
  isLoading?: boolean
}

/** Card header, kept local so the "big number + tiny label" rhythm is consistent. */
function Head({ title, desc }: { title: string; desc: string }) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{desc}</span>
    </CardHeader>
  )
}

export function ExposureHero({ summary, trend, kevChainCount, isLoading }: ExposureHeroProps) {
  if (isLoading) {
    return (
      <Card className="gap-4">
        <Head title="Active exposure" desc="exploitable now" />
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const p0 = summary?.p0_open ?? 0
  const resolved = summary?.p0_resolved_period ?? 0
  const slaPct = summary?.sla_compliance_pct ?? 0
  const crownJewels = summary?.crown_jewels_at_risk ?? 0

  // Burn-down: P0 open across the window. Rising = losing ground.
  const series = (trend ?? []).map((p) => ({ date: p.date, p0: p.p0_open }))
  const first = series[0]?.p0 ?? 0
  const last = series[series.length - 1]?.p0 ?? 0
  const losing = last > first
  const TrendIcon = losing ? TrendingUp : TrendingDown

  return (
    <Card className="gap-4">
      <Head title="Active exposure" desc="exploitable now" />
      <CardContent>
        {/* Hero number + tiny label */}
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'font-mono text-5xl font-semibold leading-none tracking-tight tabular-nums',
              STATE_TEXT.crit
            )}
          >
            {p0}
          </span>
          <div className="flex flex-col leading-tight">
            <span className={cn('font-mono text-sm font-bold', STATE_TEXT.crit)}>P0</span>
            <span className="text-xs text-muted-foreground">exploitable now</span>
          </div>
        </div>

        {/* Compact sub-stats */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>
            Risk{' '}
            <span className="font-mono font-semibold text-foreground">
              {summary ? formatRiskScore(summary.risk_score_current) : '—'}
            </span>
          </span>
          <span>
            KEV chains{' '}
            <span className="font-mono font-semibold text-foreground">{kevChainCount}</span>
          </span>
          <span>
            Crown jewels{' '}
            <span
              className={cn(
                'font-mono font-semibold',
                crownJewels > 0 ? STATE_TEXT.crit : 'text-foreground'
              )}
            >
              {crownJewels}
            </span>
          </span>
          <span>
            SLA{' '}
            <span
              className={cn(
                'font-mono font-semibold',
                slaPct >= 90 ? STATE_TEXT.good : 'text-foreground'
              )}
            >
              {slaPct.toFixed(0)}%
            </span>
          </span>
        </div>

        {/* Burn-down */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>P0 open · 90d · {resolved} resolved this period</span>
            <span
              className={cn('flex items-center gap-1', losing ? STATE_TEXT.crit : STATE_TEXT.good)}
            >
              <TrendIcon className="h-3 w-3" />
              {losing ? 'losing ground' : 'gaining ground'}
            </span>
          </div>
          {series.length > 1 ? (
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    formatter={(value) => [value as number, 'P0 open']}
                  />
                  <Line
                    type="monotone"
                    dataKey="p0"
                    stroke={PRIORITY_CHART_COLORS.P0}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
              No trend data yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

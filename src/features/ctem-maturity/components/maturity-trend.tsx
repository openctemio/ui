'use client'

import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'
import { METRIC_KEYS, type CtemMaturityTrend, type MetricKey } from '../api/use-ctem-maturity'

const METRIC_LABEL: Record<MetricKey, string> = {
  mttr_hours: 'MTTR (hours)',
  findings_opened: 'Findings opened',
  findings_resolved: 'Findings resolved',
  p_class_churn: 'Priority churn',
  validation_coverage: 'Validation coverage (%)',
  scope_drift_size: 'Scope drift',
}

function formatValue(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

/**
 * MaturityTrendCard plots each of the six persisted metrics across the
 * tenant's closed cycles (ascending). One compact sparkline per metric
 * with its latest value — enough to read direction at a glance.
 */
export function MaturityTrendCard({
  trend,
  className,
}: {
  trend: CtemMaturityTrend
  className?: string
}) {
  const cycleCount = trend.cycles_analyzed

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-muted-foreground h-4 w-4" />
          Metric trends
        </CardTitle>
        <CardDescription>
          Each metric across {cycleCount} closed cycle{cycleCount === 1 ? '' : 's'}, oldest to
          newest.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {METRIC_KEYS.map((key) => {
            const series = trend.series[key] ?? []
            const values = series.map((p) => p.value)
            const latest = values.length > 0 ? values[values.length - 1] : undefined
            return (
              <li key={key} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm">{METRIC_LABEL[key]}</span>
                <div className="flex items-center gap-3">
                  <Sparkline values={values} label={METRIC_LABEL[key]} />
                  <span className="text-muted-foreground w-12 text-end text-sm font-medium tabular-nums">
                    {latest === undefined ? '—' : formatValue(latest)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

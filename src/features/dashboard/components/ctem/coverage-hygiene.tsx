'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { coverageState, STATE_BAR, STATE_TEXT } from '../../lib/ctem-colors'
import type { ScanCoverage, ValidationCoverage } from '../../hooks/use-ctem-dashboard'

interface CoverageHygieneProps {
  scan?: ScanCoverage
  validation?: ValidationCoverage
  slaPct?: number
  isLoading?: boolean
}

function Row({ label, pct }: { label: string; pct: number }) {
  const state = coverageState(pct)
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
        <div
          className={cn('h-full rounded', STATE_BAR[state])}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className={cn('w-9 text-right font-mono tabular-nums', STATE_TEXT[state])}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

export function CoverageHygiene({ scan, validation, slaPct, isLoading }: CoverageHygieneProps) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">Coverage &amp; hygiene</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          scans · validation · SLA
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Row label="Scan" pct={scan?.coverage_percent ?? 0} />
            <Row label="Validation" pct={validation?.overall_pct ?? 0} />
            <Row label="SLA met" pct={slaPct ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { StatsCard } from '@/features/shared'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ShieldAlert, ShieldCheck, ShieldQuestion, Layers } from 'lucide-react'
import type { ThreatModelDetail } from '../types'

interface CoverageStatsProps {
  model: ThreatModelDetail
}

/**
 * Coverage headline + open/mitigated/covered/total rollup for a threat model.
 * "Coverage" = share of threats that are mitigated or covered (not open /
 * theoretical), as reported by the backend `coverage_pct`.
 */
export function CoverageStats({ model }: CoverageStatsProps) {
  const coverage = Math.round(model.coverage_pct)
  const coverageTone =
    coverage >= 75 ? 'text-green-600' : coverage >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="lg:col-span-1">
        <CardContent className="flex h-full flex-col justify-center py-6">
          <p className="text-muted-foreground text-sm font-medium">Coverage</p>
          <p className={cn('text-4xl font-bold tabular-nums', coverageTone)}>{coverage}%</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {model.threats_mitigated + model.threats_covered} of {model.threats_total} threats
            addressed
          </p>
        </CardContent>
      </Card>
      <StatsCard
        title="Total Threats"
        value={model.threats_total}
        icon={Layers}
        description="derived attack techniques"
      />
      <StatsCard
        title="Open"
        value={model.threats_open}
        icon={ShieldAlert}
        valueClassName="text-red-600"
        iconClassName="text-red-500"
        description="confirmed, unmitigated"
      />
      <StatsCard
        title="Mitigated"
        value={model.threats_mitigated}
        icon={ShieldCheck}
        valueClassName="text-green-600"
        iconClassName="text-green-500"
        description="neutralised by a fix"
      />
      <StatsCard
        title="Covered"
        value={model.threats_covered}
        icon={ShieldQuestion}
        valueClassName="text-blue-600"
        iconClassName="text-blue-500"
        description="compensating control"
      />
    </div>
  )
}

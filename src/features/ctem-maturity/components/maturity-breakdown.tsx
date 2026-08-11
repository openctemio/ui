'use client'

import { Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { MaturityBreakdown, MaturityComponent } from '../api/use-ctem-maturity'

/** Human labels for the component names returned by ctemcycle.ComputeMaturity. */
const COMPONENT_LABEL: Record<string, string> = {
  validation_coverage: 'Validation coverage',
  resolution_throughput: 'Resolution throughput',
  mttr_trend: 'MTTR trend',
  priority_stability: 'Priority stability',
  scope_stability: 'Scope stability',
}

function componentLabel(name: string): string {
  return COMPONENT_LABEL[name] ?? name.replace(/_/g, ' ')
}

/** Score → traffic-light accent, dark-mode aware. */
export function scoreTone(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function ComponentRow({ c }: { c: MaturityComponent }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{componentLabel(c.name)}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{c.detail}</p>
        </div>
        <div className="text-end">
          <span className={cn('text-lg font-semibold tabular-nums', scoreTone(c.score))}>
            {Math.round(c.score)}
          </span>
          <span className="text-muted-foreground text-xs"> / 100</span>
        </div>
      </div>
      <div className="mt-2">
        <Progress value={c.score} />
      </div>
      <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs tabular-nums">
        <span>
          weight <span className="text-foreground font-medium">{Math.round(c.weight * 100)}%</span>
        </span>
        <span>
          raw <span className="text-foreground font-medium">{formatRaw(c.raw_value)}</span>
        </span>
        <span>
          contribution{' '}
          <span className="text-foreground font-medium">+{c.contribution.toFixed(1)}</span>
        </span>
      </div>
    </div>
  )
}

function formatRaw(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2)
}

/**
 * MaturityBreakdownCard renders the composite maturity score and, below
 * it, every weighted component that produces it — so the number is
 * explainable by hand: score = Σ(component.score × weight). Nothing is
 * a black box.
 */
export function MaturityBreakdownCard({
  maturity,
  className,
}: {
  maturity: MaturityBreakdown
  className?: string
}) {
  const components = maturity.components ?? []
  const score = Math.round(maturity.score)

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="text-muted-foreground h-4 w-4" />
          CTEM program maturity
        </CardTitle>
        <CardDescription>
          A transparent composite: score = Σ (component score × weight), across{' '}
          {maturity.cycles_analyzed} closed cycle{maturity.cycles_analyzed === 1 ? '' : 's'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground text-sm">Overall</span>
          <span className={cn('text-4xl font-bold tabular-nums', scoreTone(score))}>
            {score}
            <span className="text-muted-foreground ms-1 text-base font-normal">/ 100</span>
          </span>
        </div>
        <Progress value={score} />

        <div className="grid gap-2 sm:grid-cols-2">
          {components.map((c) => (
            <ComponentRow key={c.name} c={c} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

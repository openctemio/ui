'use client'

import { Check, Minus, Layers } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CTEMStageCoverage } from '../api/use-ctem-maturity'

// The five CTEM stages, in program order. Keys map to the boolean flags
// on ctemcycle.CTEMStageCoverage.
const STAGES: { key: keyof CTEMStageCoverage; label: string; hint: string }[] = [
  { key: 'scoping', label: 'Scoping', hint: 'a scope was frozen at activation' },
  { key: 'discovery', label: 'Discovery', hint: 'findings were opened' },
  { key: 'prioritization', label: 'Prioritization', hint: 'priority classes were applied' },
  { key: 'validation', label: 'Validation', hint: 'closed findings carried evidence' },
  { key: 'mobilization', label: 'Mobilization', hint: 'findings were resolved' },
]

/**
 * StageCoverageCard shows which of the five CTEM stages the latest
 * closed cycle exercised. Reported ALONGSIDE the maturity score for
 * explainability — deliberately not folded into the weighted number.
 */
export function StageCoverageCard({
  coverage,
  className,
}: {
  coverage: CTEMStageCoverage
  className?: string
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="text-muted-foreground h-4 w-4" />
          CTEM stage coverage
        </CardTitle>
        <CardDescription>
          Stages the latest closed cycle exercised — {coverage.covered_count} of {STAGES.length}.
          Reported alongside the score, not part of it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {STAGES.map((s) => {
            const covered = Boolean(coverage[s.key])
            return (
              <li key={s.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    covered
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden
                >
                  {covered ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm', covered ? 'font-medium' : 'text-muted-foreground')}>
                    {s.label}
                    <span className="sr-only">{covered ? ' covered' : ' not covered'}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">{s.hint}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

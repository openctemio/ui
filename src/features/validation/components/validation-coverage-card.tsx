'use client'

import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useValidationCoverage, type SeverityCoverage } from '../api/use-validation-coverage'

// Severity display order + accent (most-critical first).
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

function sortBands(bands: SeverityCoverage[]): SeverityCoverage[] {
  return [...bands].sort((a, b) => {
    const ia = SEVERITY_ORDER.indexOf(a.severity)
    const ib = SEVERITY_ORDER.indexOf(b.severity)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
}

function pctColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * ValidationCoverageCard shows how much of the tenant's exposure has actually
 * been re-checked (CTEM Validation KPI): overall % + per-severity breakdown.
 */
export function ValidationCoverageCard({ className }: { className?: string }) {
  const { data, isLoading } = useValidationCoverage()

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="text-muted-foreground h-4 w-4" />
          Validation Coverage
        </CardTitle>
        <CardDescription>
          Share of findings re-checked by an agent (has validation evidence).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.total === 0 ? (
          <p className="text-muted-foreground text-sm">
            No findings to validate yet. Run a validation from a finding to start building coverage.
          </p>
        ) : (
          <>
            <div>
              <div className="mb-1 flex items-end justify-between">
                <span className="text-muted-foreground text-sm">Overall</span>
                <span className={cn('text-2xl font-semibold', pctColor(data.overall_pct))}>
                  {Math.round(data.overall_pct)}%
                </span>
              </div>
              <Progress value={data.overall_pct} />
              <p className="text-muted-foreground mt-1 text-xs">
                {data.validated} of {data.total} findings validated
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {sortBands(data.by_severity).map((b) => (
                <div
                  key={b.severity}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{SEVERITY_LABEL[b.severity] ?? b.severity}</span>
                  <span className="text-muted-foreground text-xs">
                    <span className={cn('font-medium', pctColor(b.pct))}>{Math.round(b.pct)}%</span>{' '}
                    ({b.validated}/{b.total})
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

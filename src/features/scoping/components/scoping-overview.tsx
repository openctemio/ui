'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle, Plus, RotateCcw } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, PageHeader } from '@/features/shared'
import { CycleStatusBadge } from '@/features/cycles/components/cycle-status-badge'
import { useNavItemAccess } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useScopingSummary, type ScopingSummary } from '../api'
import { readinessRows, readinessScore, visibleReadiness, type ReadinessRow } from '../readiness'

const DAY = 86_400_000

function cycleWhen(c: NonNullable<ScopingSummary['active_cycle']>): string {
  if (!c.start_date || !c.end_date) return 'no dates'
  const start = new Date(c.start_date).getTime()
  const end = new Date(c.end_date).getTime()
  const total = Math.max(1, Math.round((end - start) / DAY))
  if (c.status !== 'active') {
    return `${new Date(c.start_date).toLocaleDateString()} – ${new Date(c.end_date).toLocaleDateString()}`
  }
  const day = Math.min(total, Math.max(0, Math.round((Date.now() - start) / DAY)))
  return `day ${day} of ${total}`
}

function CycleCard({ summary }: { summary: ScopingSummary }) {
  const c = summary.active_cycle
  if (!c) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No cycle yet</CardTitle>
          <CardDescription>
            A cycle binds the charter, the scope it freezes and the outcome it is judged by.
            Everything below fills it in.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  const parts = [
    `${c.objectives} objective${c.objectives === 1 ? '' : 's'}`,
    `${c.success_criteria} success criteri${c.success_criteria === 1 ? 'on' : 'a'}`,
    `${c.in_scope_services} service${c.in_scope_services === 1 ? '' : 's'}`,
    `${c.exclusions} exclusion${c.exclusions === 1 ? '' : 's'}`,
  ]
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            {c.status === 'active' ? 'Active cycle' : 'Current cycle'}
          </p>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Link href={`/cycles/${c.id}`} className="hover:underline">
              {c.name}
            </Link>
            <CycleStatusBadge status={c.status} />
          </CardTitle>
          <CardDescription>
            {cycleWhen(c)}
            {c.status !== 'planning' &&
              ` · ${c.scope_assets} asset${c.scope_assets === 1 ? '' : 's'} in scope`}
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/cycles/${c.id}`}>
            Open <ArrowRight className="ms-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Charter: {parts.join(' · ')}</p>
      </CardContent>
    </Card>
  )
}

function ReadinessList({ rows }: { rows: ReadinessRow[] }) {
  const score = readinessScore(rows)
  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Readiness</CardTitle>
          <CardDescription>What a cycle needs written down before it starts.</CardDescription>
        </div>
        <span className="text-sm font-medium tabular-nums whitespace-nowrap">
          {score.ready} of {score.total} ready
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="divide-y border-t">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center gap-3 px-4 py-3 sm:px-6"
              data-ready={r.ready}
            >
              {r.ready ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Ready" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Not ready" />
              )}
              {/* Label over value on a phone, side by side from sm up. */}
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <p className={cn('text-sm', !r.ready && 'font-medium')}>{r.label}</p>
                <p className="text-sm text-muted-foreground tabular-nums sm:text-end">{r.value}</p>
              </div>
              <Button asChild size="sm" variant={r.ready ? 'ghost' : 'outline'} className="h-7">
                <Link href={r.href} aria-label={`${r.action}: ${r.label}`}>
                  {r.action}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/**
 * Scoping overview: is the program's scope ready for this cycle? The current
 * cycle, then one readiness row per scoping artifact with the page that fixes
 * it. One API call (GET /scoping/summary); rows about a module that is off are
 * left out.
 */
export function ScopingOverview() {
  const { data, error, isLoading, mutate } = useScopingSummary()
  const allowed = useNavItemAccess()
  const rows = useMemo(
    () => (data ? visibleReadiness(readinessRows(data), (module) => allowed({ module })) : []),
    [data, allowed]
  )
  const cycle = data?.active_cycle ?? null
  const cyclesOn = allowed({ module: 'ctem_cycles' })

  return (
    <Main>
      <PageHeader
        title="Scoping"
        description="What the program protects this cycle, and whether that is written down."
      >
        {cyclesOn && !isLoading && data && (
          <Button asChild size="sm">
            {cycle ? (
              <Link href={`/cycles/${cycle.id}`}>
                <RotateCcw className="me-2 h-4 w-4" />
                Open cycle
              </Link>
            ) : (
              <Link href="/cycles">
                <Plus className="me-2 h-4 w-4" />
                Start a cycle
              </Link>
            )}
          </Button>
        )}
      </PageHeader>

      {error ? (
        <div className="mt-5">
          <ErrorState title="the scoping summary" error={error} onRetry={() => mutate()} />
        </div>
      ) : isLoading || !data ? (
        <div className="mt-5 space-y-5">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {cyclesOn && <CycleCard summary={data} />}
          <ReadinessList rows={rows} />
          <p className="text-sm text-muted-foreground">
            Feeds Discovery:{' '}
            {cycle && cycle.status !== 'planning'
              ? `${cycle.scope_assets} asset${cycle.scope_assets === 1 ? '' : 's'} snapshotted`
              : 'no scope snapshot yet'}{' '}
            · {data.boundary.exclusions} exclusion{data.boundary.exclusions === 1 ? '' : 's'}{' '}
            enforced on scans
          </p>
        </div>
      )}
    </Main>
  )
}

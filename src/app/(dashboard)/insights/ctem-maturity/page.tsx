'use client'

/**
 * CTEM maturity dashboard.
 *
 * Renders the REAL, backend-computed maturity aggregate from
 *   GET /api/v1/ctem-cycles/metrics/trend
 * (api PR #436, ctemcycle.ComputeMaturity). The maturity number is
 * never a black box: the page shows the overall 0–100 score AND every
 * weighted component that produces it (score × weight = contribution),
 * the per-metric trend across the tenant's closed cycles, and CTEM
 * stage coverage reported alongside.
 *
 * States handled without throwing:
 *   - loading  → skeletons
 *   - 403      → the ctem_cycles module is disabled → "module not
 *                enabled" state (module gating, see routes/ctem.go)
 *   - empty    → no closed cycles yet → "measured once you complete a
 *                cycle" state
 */

import Link from 'next/link'
import { ArrowLeft, ShieldOff, GaugeCircle } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/features/shared/components/empty-state'
import { useCtemMaturity } from '@/features/ctem-maturity/api/use-ctem-maturity'
import { MaturityBreakdownCard } from '@/features/ctem-maturity/components/maturity-breakdown'
import { MaturityTrendCard } from '@/features/ctem-maturity/components/maturity-trend'
import { StageCoverageCard } from '@/features/ctem-maturity/components/stage-coverage'

function LoadingState() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-2 w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}

function ModuleDisabledState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-muted rounded-full p-4">
        <ShieldOff className="text-muted-foreground h-8 w-8" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Module not enabled</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        The CTEM cycles module is not enabled for your organization, so program maturity is not
        available.
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        Contact your administrator to enable this module.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="outline">
          <ArrowLeft className="me-2 h-4 w-4" />
          Back to dashboard
        </Button>
      </Link>
    </div>
  )
}

export default function CTEMMaturityPage() {
  const { data, error, isLoading } = useCtemMaturity()

  const status = (error as { statusCode?: number } | undefined)?.statusCode

  const body = (() => {
    // 403 → the ctem_cycles module is disabled for this tenant.
    if (status === 403) return <ModuleDisabledState />

    if (isLoading || (!data && !error)) return <LoadingState />

    // Any other error: surface a non-crashing message.
    if (error && !data) {
      return (
        <EmptyState
          icon={GaugeCircle}
          title="Couldn't load maturity"
          description="The maturity aggregator is temporarily unavailable. Try again shortly."
        />
      )
    }

    // Empty: no closed cycles yet → maturity is not yet measurable.
    if (!data || data.cycles_analyzed === 0) {
      return (
        <EmptyState
          icon={GaugeCircle}
          title="No maturity data yet"
          description="Program maturity is measured once you complete (close) a CTEM cycle. Activate a cycle, work it, and close it — this page fills in from the cycle's metrics."
        />
      )
    }

    return (
      <div className="space-y-6">
        <MaturityBreakdownCard maturity={data.maturity} />
        <div className="grid gap-6 lg:grid-cols-2">
          <MaturityTrendCard trend={data} />
          <StageCoverageCard coverage={data.maturity.ctem_stage_coverage} />
        </div>
      </div>
    )
  })()

  return (
    <Main>
      <PageHeader
        title="CTEM maturity"
        description="Backend-computed program maturity — a transparent, weighted composite across your closed CTEM cycles."
      />
      {body}
    </Main>
  )
}

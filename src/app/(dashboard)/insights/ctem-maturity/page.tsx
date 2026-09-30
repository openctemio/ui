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
import { AlertCircle, ArrowLeft, RefreshCw, ShieldOff, GaugeCircle } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
    <div className="space-y-5">
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}

function ModuleDisabledState() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="Module not enabled"
      description="The CTEM cycles module is not enabled for your organization, so program maturity is not available. Contact your administrator to enable it."
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="me-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      }
    />
  )
}

export default function CTEMMaturityPage() {
  const { data, error, isLoading, mutate } = useCtemMaturity()

  const status = (error as { statusCode?: number } | undefined)?.statusCode

  const body = (() => {
    // 403 → the ctem_cycles module is disabled for this tenant.
    if (status === 403) return <ModuleDisabledState />

    if (isLoading || (!data && !error)) return <LoadingState />

    // Any other error: surface a non-crashing message.
    if (error && !data) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load maturity</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>The maturity aggregator is temporarily unavailable.</span>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="me-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
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
      <div className="space-y-5">
        <MaturityBreakdownCard maturity={data.maturity} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
        description="Program maturity as a transparent, weighted composite across your closed CTEM cycles."
      />
      <div className="mt-5">{body}</div>
    </Main>
  )
}

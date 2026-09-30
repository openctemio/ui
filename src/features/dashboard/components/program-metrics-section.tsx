/**
 * CTEM program metrics: the ctem.org program KPIs that can be computed
 * honestly from stored data (GET /api/v1/dashboard/program-metrics).
 *
 * The exact definitions are owned by the API (openctemio/api
 * internal/app/module/dashboard.go, docs/architecture/program-metrics.md); the
 * tooltips below restate them in plain words. A metric with no qualifying
 * sample comes back null and renders "—" — never 0 or 100%. No value is ever
 * coloured: ctem.org sets no universal target for these, so any red/green
 * would be an invented threshold.
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard, ErrorState } from '@/features/shared'
import { Radar, Wrench, UserCheck, Route } from 'lucide-react'
import { useProgramMetrics } from '../hooks/use-ctem-dashboard'
import { formatDurationHours, formatRatePct, countCaption } from '../lib/program-health'

const NOT_MEASURED = '—'

const DEFINITIONS = {
  mttd: 'Assets first seen in this period that are internet-facing now. Measured from when the asset was first seen to the earliest sign it was known to be internet-facing: its exposure being set to public, an internet-exposure change in its history, its first exposure event, or its first finding. Known at discovery counts as 0 h. Assets with no such sign are not averaged.',
  mttr: 'Findings a validation run reproduced (outcome "detected" — still exploitable) and that were then resolved or verified in this period. Measured from the first reproducing validation to resolution. False positives, accepted risk and fixes made before validation are excluded.',
  acceptance:
    'Findings assigned in this period to a named owner. Accepted when that owner changed status, triaged, commented, updated remediation or resolved it before the finding’s SLA deadline. Missed when the deadline passed without that. Assignments still inside their SLA window, without an SLA, or handed to someone else first are left out of the rate.',
  timeToBreak:
    'Not computed. Attack paths are calculated on demand from the current asset graph and never stored, and exposure and relationship changes keep no history — so there is no record of when a path opened or when one of its links was fixed. Any number here would be invented.',
}

function valueClass(display: string | null): string | undefined {
  return display === null ? 'text-muted-foreground' : 'tabular-nums'
}

export function ProgramMetricsSection({
  tenantId,
  days,
}: {
  tenantId: string | null
  days: number
}) {
  const { data, error, isLoading, mutate } = useProgramMetrics(tenantId, days)

  const mttd = data?.mttd_internet_facing
  const mttr = data?.mttr_validated
  const oa = data?.owner_acceptance

  const mttdDisplay = formatDurationHours(mttd?.mean_hours)
  const mttrDisplay = formatDurationHours(mttr?.mean_hours)
  const oaDisplay = formatRatePct(oa?.rate_pct)

  const mttdCaption =
    mttdDisplay !== null
      ? `Median ${formatDurationHours(mttd?.median_hours) ?? NOT_MEASURED} · ${countCaption(mttd?.sample_size, 'asset')}${
          mttd?.unmeasured ? ` (+${mttd.unmeasured} without a signal)` : ''
        }`
      : mttd?.unmeasured
        ? `${countCaption(mttd.unmeasured, 'asset')} with no detection signal yet`
        : 'No new internet-facing assets in this period'

  const mttrCaption =
    mttrDisplay !== null
      ? `Median ${formatDurationHours(mttr?.median_hours) ?? NOT_MEASURED} · ${countCaption(mttr?.sample_size, 'finding')}`
      : 'No validated exposures resolved in this period'

  const decided = (oa?.accepted ?? 0) + (oa?.missed ?? 0)
  const oaCaption =
    oaDisplay !== null
      ? `${(oa?.accepted ?? 0).toLocaleString()} of ${countCaption(decided, 'assignment')} in SLA${
          oa?.pending ? ` · ${oa.pending} pending` : ''
        }`
      : oa?.pending
        ? `${countCaption(oa.pending, 'assignment')} still inside the SLA window`
        : 'No assignments with an SLA in this period'

  return (
    <section className="mt-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold">CTEM program metrics</h2>
        <p className="text-sm text-muted-foreground">
          How fast the program detects, fixes and takes ownership. “—” means there is not enough
          data to measure it yet.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="Couldn’t load program metrics"
          error={error}
          onRetry={() => void mutate()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-8 w-20" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Time to detect internet-facing assets"
            value={mttdDisplay ?? NOT_MEASURED}
            valueClassName={valueClass(mttdDisplay)}
            description={mttdCaption}
            icon={Radar}
            info={DEFINITIONS.mttd}
          />
          <StatsCard
            title="Time to remediate validated exposures"
            value={mttrDisplay ?? NOT_MEASURED}
            valueClassName={valueClass(mttrDisplay)}
            description={mttrCaption}
            icon={Wrench}
            info={DEFINITIONS.mttr}
          />
          <StatsCard
            title="Owner acceptance rate"
            value={oaDisplay ?? NOT_MEASURED}
            valueClassName={valueClass(oaDisplay)}
            description={oaCaption}
            icon={UserCheck}
            info={DEFINITIONS.acceptance}
          />
          <StatsCard
            title="Time to break attack paths"
            value={NOT_MEASURED}
            valueClassName={valueClass(null)}
            description="Not measured: attack-path history isn’t stored"
            icon={Route}
            info={DEFINITIONS.timeToBreak}
          />
        </div>
      )}
    </section>
  )
}

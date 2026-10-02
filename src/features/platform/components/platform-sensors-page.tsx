'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Cloud } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EmptyState,
  ErrorState,
  Meter,
  MetricStrip,
  PageHeader,
  type MetricStripItem,
} from '@/features/shared'
import { usePlatformUsage } from '@/lib/api/platform-hooks'
import { SENSOR_REFRESH_MS } from '@/lib/api/sensor-hooks'

import {
  PLATFORM_QUEUE_LIMIT,
  summarizePlatformPool,
  type PlatformPool,
  type PoolTier,
} from '../lib/pool'
import { PoolCallout, PoolStatePill } from './pool-state'

/**
 * The headline numbers. Only what the API measures: there is no per-tenant
 * quota, reset time or wait estimate to show (API follow-ups), so those tiles
 * are left out rather than faked.
 */
export function poolMetrics(pool: PlatformPool): MetricStripItem[] {
  const blocked = pool.state === 'down' || pool.state === 'full'
  return [
    {
      key: 'queued',
      label: 'Your queued jobs',
      value: pool.queued,
      // Waiting is only a problem while nothing can pick the jobs up.
      tone: blocked ? 'warning' : 'default',
      detail:
        pool.queued === 0
          ? 'nothing waiting'
          : pool.state === 'down'
            ? 'waiting for a sensor to come online'
            : 'waiting for a free slot',
    },
    {
      key: 'online',
      label: 'Sensors online',
      value: pool.online,
      hint: `of ${pool.total}`,
      detail:
        pool.offline > 0 ? (
          <span className="text-destructive">{pool.offline} offline</span>
        ) : (
          'all online'
        ),
    },
    {
      key: 'slots',
      label: 'Job slots in use',
      value: pool.inUse,
      hint: `/ ${pool.slots}`,
      detail: (
        <>
          <Meter
            className="mt-1 max-w-40"
            value={pool.inUse}
            max={pool.slots}
            label={`${pool.inUse} of ${pool.slots} job slots in use across all organizations`}
            tone={pool.slots > 0 && pool.inUse >= pool.slots ? 'warning' : 'default'}
          />
          <span className="mt-1 block">all organizations</span>
        </>
      ),
    },
    {
      key: 'free',
      label: 'Free slots',
      value: pool.free,
      detail:
        pool.online === 0
          ? 'no sensor online'
          : pool.free === 0
            ? 'new jobs wait in the queue'
            : 'ready for new jobs',
    },
  ]
}

function TierRow({ tier }: { tier: PoolTier }) {
  return (
    <li
      data-tier={tier.key}
      className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center"
    >
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 sm:col-span-1 sm:justify-start">
        <span className="truncate text-sm font-medium">{tier.label}</span>
        <PoolStatePill state={tier.state} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Sensors online</div>
        <div className="text-sm tabular-nums">
          <span className="font-medium">{tier.online}</span>
          <span className="text-muted-foreground"> of {tier.total}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Job slots in use</div>
        <div className="text-sm tabular-nums">
          <span className="font-medium">{tier.inUse}</span>
          <span className="text-muted-foreground"> / {tier.slots}</span>
        </div>
        <Meter
          className="mt-1"
          value={tier.inUse}
          max={tier.slots}
          label={`${tier.label}: ${tier.inUse} of ${tier.slots} job slots in use`}
          tone={tier.state === 'full' ? 'warning' : 'default'}
        />
      </div>
    </li>
  )
}

/**
 * The pool by tier, aggregate only (no sensor names, no other organization's
 * jobs). Only with two or more tiers: with one, the strip above already says
 * all of it. A tier is a label the operator puts on a sensor; the API does not
 * dispatch by tier or tie tiers to a plan, so there is no "included / upgrade"
 * comparison to make.
 */
function TiersCard({ pool, className }: { pool: PlatformPool; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>By tier</CardTitle>
        <CardDescription>
          Tiers group the platform sensors. Totals for all organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y" aria-label="Platform sensors by tier">
          {pool.tiers.map((t) => (
            <TierRow key={t.key} tier={t} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const ROUTING: { term: string; text: string }[] = [
  {
    term: 'Auto',
    text: 'Your own sensors first. A scan goes to platform sensors only when none of your sensors can run its scanner and your organization may use platform sensors.',
  },
  {
    term: 'Platform sensor',
    text: 'Always platform sensors. The scan is refused, with the reason, when a target is internal, in a scan zone or in an asset group, or when your organization may not use platform sensors.',
  },
  { term: 'Your sensor', text: 'Never platform sensors.' },
]

/**
 * Which scans can land here, from the API's routing rules (api:
 * internal/app/scan/trigger.go decideSensorRouting / shouldUsePlatformSensor).
 * Keep in step with them.
 */
function RoutingCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>When your scans run here</CardTitle>
        <CardDescription>Each scan&apos;s Sensor setting decides.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ROUTING.map((r) => (
            <div key={r.term} className="min-w-0 space-y-0.5">
              <dt className="text-sm font-medium">{r.term}</dt>
              <dd className="text-sm text-muted-foreground">{r.text}</dd>
            </div>
          ))}
        </dl>
        <ul className="list-disc space-y-1 border-t ps-5 pt-4 text-sm text-muted-foreground">
          <li>
            Platform sensors scan public targets only. Internal addresses, asset groups and targets
            in a scan zone stay on your own sensors.
          </li>
          <li>A platform job that waits {PLATFORM_QUEUE_LIMIT} for a free slot fails.</li>
          <li>Each run shows where it went in its dispatch details.</li>
        </ul>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="mt-5 space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[5.5rem] w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}

/**
 * Platform sensors: the shared pool the platform operator runs, seen from one
 * organization. Answers, in order: can it take my scans now (callout), what do
 * I have waiting and how busy is it (strip), how each tier is doing, and which
 * of my scans go there at all.
 */
export function PlatformSensorsPage() {
  const { data, isLoading, error } = usePlatformUsage({ refreshInterval: SENSOR_REFRESH_MS })
  const pool = useMemo(() => summarizePlatformPool(data), [data])

  const header = (
    <PageHeader
      title="Platform sensors"
      description="Shared sensors the platform operator runs for every organization: whether they can take your scans and what you have waiting."
    >
      <Button variant="outline" size="sm" asChild>
        <Link href="/sensors">
          <ArrowLeft className="h-4 w-4" />
          Your sensors
        </Link>
      </Button>
    </PageHeader>
  )

  if (isLoading && !data) {
    return (
      <>
        {header}
        <LoadingState />
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        {header}
        <div className="mt-5">
          <ErrorState title="platform sensors" error={error} />
        </div>
      </>
    )
  }

  if (!pool) {
    return (
      <>
        {header}
        <div className="mt-5">
          <EmptyState
            icon={Cloud}
            title="No platform sensors"
            description="The platform operator runs no shared sensors here, so your scans run on your own sensors."
            action={
              <Button size="sm" variant="outline" asChild>
                <Link href="/sensors">Go to your sensors</Link>
              </Button>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <PoolCallout pool={pool} className="mt-5" />
      <MetricStrip className="mt-5" items={poolMetrics(pool)} />
      {pool.tiers.length > 1 && <TiersCard pool={pool} className="mt-5" />}
      <RoutingCard className="mt-5" />
    </>
  )
}

/**
 * The header link to the platform sensors page: shown only when the
 * installation has platform sensors. Without them there is nothing to link
 * to, and no upsell.
 */
export function PlatformSensorsLink() {
  const { isEnabled } = usePlatformUsage()
  if (!isEnabled) return null
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/sensors/platform">
        <Cloud className="h-4 w-4" />
        Platform sensors
      </Link>
    </Button>
  )
}

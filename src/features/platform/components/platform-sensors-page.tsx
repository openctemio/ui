'use client'

import Link from 'next/link'
import { ArrowLeft, Cloud, Crown, Server, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, MetricStrip, PageHeader } from '@/features/shared'
import { usePlatformUsage } from '@/lib/api/platform-hooks'
import { SENSOR_REFRESH_MS } from '@/lib/api/sensor-hooks'
import {
  PLATFORM_SENSOR_TIERS,
  PLATFORM_TIER_DESCRIPTIONS,
  PLATFORM_TIER_LABELS,
  type PlatformSensorTier,
  type TierStats,
} from '@/lib/api/platform-types'
import { cn } from '@/lib/utils'

const TIER_ICONS: Record<PlatformSensorTier, LucideIcon> = {
  shared: Server,
  dedicated: Cloud,
  premium: Crown,
}

/** A share of capacity as a small bar (theme tokens). */
function UsageBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <span
      role="img"
      aria-label={label}
      className="mt-1 block h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted"
    >
      <span
        className={cn('block h-full', pct > 90 ? 'bg-destructive' : 'bg-info')}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

function TierCard({
  tier,
  stats,
  accessible,
  maxTier,
}: {
  tier: PlatformSensorTier
  stats?: TierStats
  accessible: boolean
  maxTier?: PlatformSensorTier
}) {
  const Icon = TIER_ICONS[tier]
  const online = stats?.online_sensors ?? 0
  const total = stats?.total_sensors ?? 0
  return (
    <Card className={cn(!accessible && 'opacity-60')} data-tier={tier}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">{PLATFORM_TIER_LABELS[tier]}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <CardDescription>{PLATFORM_TIER_DESCRIPTIONS[tier]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">
          {online}
          <span className="ms-1 text-sm font-normal text-muted-foreground">of {total} online</span>
        </p>
        {accessible ? (
          stats ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {stats.current_load} of {stats.total_capacity} job slots in use
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No sensors in this tier yet</p>
          )
        ) : (
          // A reason, not an upsell: the tier is outside this organization's access.
          <p className="text-xs text-muted-foreground">
            Above your organization&apos;s tier
            {maxTier ? ` (${PLATFORM_TIER_LABELS[maxTier]})` : ''}, so its sensors do not run your
            scans.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Platform sensors: shared scanning capacity the platform operator runs, which
 * your organization's scans can use in addition to your own sensors. A page of
 * its own (the owner's request) instead of a card under the tenant's fleet.
 */
export function PlatformSensorsPage() {
  const {
    data,
    isEnabled,
    maxTier,
    accessibleTiers,
    maxConcurrent,
    maxQueued,
    currentActive,
    currentQueued,
    availableSlots,
    tierStats,
    isLoading,
    error,
  } = usePlatformUsage({ refreshInterval: SENSOR_REFRESH_MS })

  const header = (
    <PageHeader
      title="Platform sensors"
      description="Shared sensors run by the platform operator. Your scans can use them in addition to your own sensors."
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
        <div className="mt-5 space-y-5" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PLATFORM_SENSOR_TIERS.map((t) => (
              <Skeleton key={t} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        {header}
        <div className="mt-5">
          <ErrorState title="platform sensors" error={error} />
        </div>
      </>
    )
  }

  if (!isEnabled) {
    return (
      <>
        {header}
        <div className="mt-5">
          <EmptyState
            icon={Cloud}
            title="No platform sensors here"
            description="This installation has no shared platform sensors. Your scans run on your own sensors."
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

  const onlineTotal = PLATFORM_SENSOR_TIERS.reduce(
    (n, t) => n + (tierStats?.[t]?.online_sensors ?? 0),
    0
  )
  const sensorTotal = PLATFORM_SENSOR_TIERS.reduce(
    (n, t) => n + (tierStats?.[t]?.total_sensors ?? 0),
    0
  )

  return (
    <>
      {header}

      {maxTier && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          Your tier
          <Badge variant="outline">{PLATFORM_TIER_LABELS[maxTier]}</Badge>
        </p>
      )}

      <MetricStrip
        className="mt-4"
        items={[
          {
            key: 'active',
            label: 'Active jobs',
            value: currentActive,
            hint: `/ ${maxConcurrent}`,
            detail: (
              <UsageBar
                value={currentActive}
                max={maxConcurrent}
                label={`${currentActive} of ${maxConcurrent} concurrent jobs in use`}
              />
            ),
          },
          {
            key: 'queued',
            label: 'Queued',
            value: currentQueued,
            hint: maxQueued > 0 ? `/ ${maxQueued}` : undefined,
            tone: 'warning',
            detail: 'your platform jobs waiting for a slot',
          },
          {
            key: 'available',
            label: 'Available slots',
            value: availableSlots,
            detail: 'for your next platform scans',
          },
          {
            key: 'online',
            label: 'Online platform sensors',
            value: onlineTotal,
            hint: `of ${sensorTotal}`,
          },
        ]}
      />

      <h2 className="mt-5 text-base font-semibold">Tiers</h2>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLATFORM_SENSOR_TIERS.map((t) => (
          <TierCard
            key={t}
            tier={t}
            stats={tierStats?.[t]}
            accessible={accessibleTiers.includes(t)}
            maxTier={maxTier}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Updates every 15 seconds.</p>
    </>
  )
}

/**
 * The header link to the platform sensors page: shown only when the tenant has
 * platform sensors (GET /platform/stats says enabled), the condition the old
 * card used. Without them there is nothing to link to, and no upsell.
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

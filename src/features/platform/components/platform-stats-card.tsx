/**
 * Platform sensors on the classic dashboard: the shared pool's state, its job
 * slots (all organizations) and this organization's queued platform jobs,
 * with a link to the page. Renders nothing when the installation has no
 * platform sensors or the stats cannot be read.
 */

'use client'

import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Cloud } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Meter } from '@/features/shared'
import { usePlatformUsage } from '@/lib/api/platform-hooks'

import { summarizePlatformPool } from '../lib/pool'
import { PoolStatePill } from './pool-state'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  )
}

export function PlatformStatsCard({ className }: { className?: string }) {
  const { data, isLoading, error } = usePlatformUsage()
  const pool = useMemo(() => summarizePlatformPool(data), [data])

  if (isLoading && !data) {
    return (
      <Card className={className} aria-busy="true" aria-label="Loading platform sensors">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  // No platform sensors here (or no stats): nothing to show, and no upsell.
  if (error || !pool) return null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Cloud className="h-4 w-4 text-muted-foreground" aria-hidden />
          Platform sensors
        </CardTitle>
        <CardDescription>Shared pool run by the platform operator</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" className="h-7" asChild>
            <Link href="/sensors/platform">View</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">State</dt>
            <dd>
              <PoolStatePill state={pool.state} />
            </dd>
          </div>
          <Row label="Sensors online">
            {pool.online}
            <span className="font-normal text-muted-foreground"> of {pool.total}</span>
          </Row>
          <div className="space-y-1.5">
            <Row label="Job slots in use (all organizations)">
              {pool.inUse}
              <span className="font-normal text-muted-foreground"> / {pool.slots}</span>
            </Row>
            <Meter
              value={pool.inUse}
              max={pool.slots}
              label={`${pool.inUse} of ${pool.slots} job slots in use across all organizations`}
            />
          </div>
          <Row label="Your queued jobs">{pool.queued}</Row>
        </dl>
      </CardContent>
    </Card>
  )
}

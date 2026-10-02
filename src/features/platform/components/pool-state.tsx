'use client'

import { CloudOff, Hourglass, TriangleAlert } from 'lucide-react'

import { DetailCallout } from '@/features/shared'
import { cn } from '@/lib/utils'

import { PLATFORM_QUEUE_LIMIT, type PlatformPool, type PoolState } from '../lib/pool'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Theme tokens only (style contract §6): a tint and a dot per state. */
const STATE_META: Record<PoolState, { label: string; pill: string; dot: string }> = {
  healthy: { label: 'Healthy', pill: 'bg-success/15 text-success', dot: 'bg-success' },
  degraded: { label: 'Some offline', pill: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  full: { label: 'All slots busy', pill: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  down: { label: 'Offline', pill: 'bg-destructive/15 text-destructive', dot: 'bg-destructive' },
}

/** The pool's (or a tier's) state as a small tinted pill with a dot; the word carries the meaning. */
export function PoolStatePill({ state, className }: { state: PoolState; className?: string }) {
  const m = STATE_META[state]
  return (
    <span
      data-state={state}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        m.pill,
        className
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

/**
 * The answer to "can platform sensors take my scans right now?" when the
 * answer is no or not fully: the worst problem first, in plain words, with what
 * it means for this organization's queued jobs. Nothing when the pool is
 * healthy. A tenant cannot fix the pool, so there is no fix button.
 */
export function PoolCallout({ pool, className }: { pool: PlatformPool; className?: string }) {
  const waiting =
    pool.queued > 0
      ? `You have ${plural(pool.queued, 'job')} waiting${pool.state === 'down' ? '' : ' for a slot'}.`
      : ''
  if (pool.state === 'down') {
    return (
      <DetailCallout
        tone="destructive"
        icon={CloudOff}
        className={className}
        title={pool.total === 1 ? 'The platform sensor is offline' : 'No platform sensor is online'}
      >
        Platform jobs wait in the queue until a sensor comes back, and fail after{' '}
        {PLATFORM_QUEUE_LIMIT} of waiting. {waiting} Scans set to Auto keep running on your own
        sensors when they can.
      </DetailCallout>
    )
  }
  if (pool.state === 'full') {
    return (
      <DetailCallout
        tone="warning"
        icon={Hourglass}
        className={className}
        title="Every platform job slot is in use"
      >
        {pool.inUse} of {pool.slots} slots are running jobs across all organizations. New platform
        jobs wait for a free slot. {waiting}
      </DetailCallout>
    )
  }
  if (pool.state === 'degraded') {
    return (
      <DetailCallout
        tone="warning"
        icon={TriangleAlert}
        className={className}
        title={`${pool.offline} of ${plural(pool.total, 'platform sensor')} ${pool.offline === 1 ? 'is' : 'are'} offline`}
      >
        Platform jobs run on the {pool.online} still online, so they may wait longer. {waiting}
      </DetailCallout>
    )
  }
  return null
}

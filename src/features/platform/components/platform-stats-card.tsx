/**
 * Platform Stats Card Component
 *
 * Displays platform sensor usage statistics and tier information.
 * Shows:
 * - Current usage vs max concurrent slots
 * - Queued jobs
 * - Tier-specific stats (online sensors per tier)
 * Renders nothing when the tenant has no platform sensors (the open-source build).
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Server, Cloud, Crown, Zap, CheckCircle, Clock } from 'lucide-react'
import { usePlatformUsage } from '@/lib/api/platform-hooks'
import { TierBadge, MaxTierBadge } from './tier-badge'
import type { PlatformSensorTier, TierStats } from '@/lib/api/platform-types'
import { PLATFORM_SENSOR_TIERS, PLATFORM_TIER_LABELS } from '@/lib/api/platform-types'

// Tier icons
const TIER_ICONS = {
  shared: Server,
  dedicated: Cloud,
  premium: Crown,
}

interface PlatformStatsCardProps {
  className?: string
}

export function PlatformStatsCard({ className }: PlatformStatsCardProps) {
  const {
    isEnabled,
    maxTier,
    maxConcurrent,
    maxQueued,
    currentActive,
    currentQueued,
    availableSlots,
    usagePercent,
    queuePercent: _queuePercent,
    tierStats,
    isLoading,
    error,
  } = usePlatformUsage()

  // Show "Coming Soon" when:
  // 1. API returns error (backend not implemented)
  // 2. Data is null/undefined and not loading (feature flag disabled)
  const isComingSoon = error || (!isLoading && !maxTier && !isEnabled)

  if (isLoading) {
    return <PlatformStatsCardSkeleton className={className} />
  }

  // No platform sensors here (the open-source build has none, or the API has
  // no stats): show nothing. A "coming soon" or "not on your plan" card told
  // people nothing they could act on.
  if (isComingSoon || !isEnabled) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Platform Sensors
          </CardTitle>
          {maxTier && <MaxTierBadge maxTier={maxTier} />}
        </div>
        <CardDescription>Cloud-hosted scanning infrastructure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Jobs</span>
            <span className="font-medium">
              {currentActive} / {maxConcurrent}
            </span>
          </div>
          <Progress
            value={usagePercent}
            className={cn(
              'h-2',
              usagePercent > 90 ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'
            )}
          />
        </div>

        {/* Queue Stats */}
        {maxQueued > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Queued
            </span>
            <span className={cn('font-medium', currentQueued > 0 && 'text-amber-500')}>
              {currentQueued} / {maxQueued}
            </span>
          </div>
        )}

        {/* Available Slots */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            Available
          </span>
          <span className="font-medium text-green-600 dark:text-green-400">{availableSlots}</span>
        </div>

        {/* Tier Stats Grid */}
        {tierStats && (
          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Sensors by Tier</p>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_SENSOR_TIERS.map((tier) => (
                <TierStatItem key={tier} tier={tier} stats={tierStats[tier]} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Tier stat item showing online/total sensors for a tier
 */
function TierStatItem({ tier, stats }: { tier: PlatformSensorTier; stats?: TierStats }) {
  const Icon = TIER_ICONS[tier]
  const online = stats?.online_sensors ?? 0
  const total = stats?.total_sensors ?? 0

  return (
    <div className="flex flex-col items-center rounded-md border bg-muted/30 p-2">
      <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium">{PLATFORM_TIER_LABELS[tier]}</span>
      <span className="text-xs text-muted-foreground">
        <span className={cn(online > 0 && 'text-green-500')}>{online}</span> / {total}
      </span>
    </div>
  )
}

/**
 * Loading skeleton for the platform stats card
 */
function PlatformStatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

/**
 * Compact inline stats display for headers/toolbars
 */
export function PlatformStatsInline({ className }: { className?: string }) {
  const { isEnabled, currentActive, maxConcurrent, availableSlots, maxTier, isLoading } =
    usePlatformUsage()

  if (isLoading) {
    return <Skeleton className={cn('h-5 w-40', className)} />
  }

  if (!isEnabled) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <span className="text-muted-foreground">
        Platform: {currentActive}/{maxConcurrent}
      </span>
      <span className="text-green-500">{availableSlots} available</span>
      {maxTier && <TierBadge tier={maxTier} size="sm" />}
    </div>
  )
}

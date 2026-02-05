/**
 * Platform Stats Card Component
 *
 * Displays platform agent usage statistics and tier information.
 * Shows:
 * - Current usage vs max concurrent slots
 * - Queued jobs
 * - Tier-specific stats (online agents per tier)
 * - Upgrade prompt when platform agents are disabled
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Server, Cloud, Crown, Zap, CheckCircle, Clock } from 'lucide-react'
import { usePlatformUsage } from '@/lib/api/platform-hooks'
import { TierBadge, MaxTierBadge } from './tier-badge'
import type { PlatformAgentTier, TierStats } from '@/lib/api/platform-types'
import { PLATFORM_AGENT_TIERS, PLATFORM_TIER_LABELS } from '@/lib/api/platform-types'

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

  if (isComingSoon) {
    return <PlatformAgentsComingSoonCard className={className} />
  }

  if (!isEnabled) {
    return <PlatformAgentsDisabledCard className={className} />
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Platform Agents
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
            <p className="mb-2 text-xs font-medium text-muted-foreground">Agents by Tier</p>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_AGENT_TIERS.map((tier) => (
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
 * Tier stat item showing online/total agents for a tier
 */
function TierStatItem({ tier, stats }: { tier: PlatformAgentTier; stats?: TierStats }) {
  const Icon = TIER_ICONS[tier]
  const online = stats?.online_agents ?? 0
  const total = stats?.total_agents ?? 0

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
 * Card shown when platform stats feature is coming soon (API not yet implemented)
 */
function PlatformAgentsComingSoonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-muted-foreground" />
          Platform Agents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-muted-foreground">Cloud-hosted scanning infrastructure</p>
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Coming soon
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Card shown when platform agents are disabled for the tenant
 */
function PlatformAgentsDisabledCard({ className }: { className?: string }) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-muted-foreground" />
          Platform Agents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Platform agents are not available on your current plan. Upgrade to access cloud-hosted
          scanning infrastructure.
        </p>
        <div className="flex gap-2">
          {PLATFORM_AGENT_TIERS.map((tier) => (
            <TierBadge key={tier} tier={tier} showIcon size="sm" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for the platform stats card
 */
function PlatformStatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="mt-1 h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="border-t pt-4">
          <Skeleton className="mb-2 h-3 w-24" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
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

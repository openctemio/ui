/**
 * Tier Badge Component
 *
 * Displays a badge showing the platform agent tier with icon and color
 * Tiers: shared (gray), dedicated (blue), premium (purple)
 */

'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Server, Cloud, Crown, type LucideIcon } from 'lucide-react'
import type { PlatformAgentTier } from '@/lib/api/platform-types'
import {
  PLATFORM_TIER_LABELS,
  PLATFORM_TIER_COLORS,
  PLATFORM_TIER_BG_COLORS,
  PLATFORM_TIER_BORDER_COLORS,
  PLATFORM_TIER_ICONS,
} from '@/lib/api/platform-types'

// Map icon names to Lucide components
const TIER_ICON_MAP: Record<string, LucideIcon> = {
  server: Server,
  cloud: Cloud,
  crown: Crown,
}

interface TierBadgeProps {
  /** The tier level */
  tier: PlatformAgentTier
  /** Whether to show the tier icon */
  showIcon?: boolean
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Additional class names */
  className?: string
}

function TierBadgeComponent({
  tier,
  showIcon = true,
  size = 'default',
  className,
}: TierBadgeProps) {
  const label = PLATFORM_TIER_LABELS[tier]
  const colorClass = PLATFORM_TIER_COLORS[tier]
  const bgClass = PLATFORM_TIER_BG_COLORS[tier]
  const borderClass = PLATFORM_TIER_BORDER_COLORS[tier]
  const iconName = PLATFORM_TIER_ICONS[tier]

  const IconComponent = showIcon ? TIER_ICON_MAP[iconName] : null

  // Size-specific classes
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0',
    default: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }
  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    default: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', sizeClasses[size], bgClass, colorClass, borderClass, className)}
    >
      {IconComponent && <IconComponent className={cn(iconSizes[size], 'shrink-0')} />}
      {label}
    </Badge>
  )
}

export const TierBadge = memo(TierBadgeComponent)

/**
 * Displays max tier accessible to the tenant
 */
export function MaxTierBadge({
  maxTier,
  className,
}: {
  maxTier: PlatformAgentTier
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-xs text-muted-foreground">Max tier:</span>
      <TierBadge tier={maxTier} size="sm" />
    </div>
  )
}

/**
 * Displays a list of accessible tiers
 */
export function AccessibleTiersList({
  tiers,
  className,
}: {
  tiers: PlatformAgentTier[]
  className?: string
}) {
  if (!tiers || tiers.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tiers.map((tier) => (
        <TierBadge key={tier} tier={tier} size="sm" />
      ))}
    </div>
  )
}

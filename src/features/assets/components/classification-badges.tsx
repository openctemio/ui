/**
 * Classification Badges
 *
 * Visual badges for Asset Scope and Exposure Level classification
 */

'use client'

import * as React from 'react'
import {
  Globe,
  Building2,
  Cloud,
  Users,
  Store,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertCircle,
  AlertTriangle,
  CircleDot,
  Minus,
  Network,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CRITICALITY_BADGE_SOFT } from '@/lib/criticality-colors'
import { IMPACT_RATING_BADGE_SOFT } from '@/lib/impact-colors'
import type { AssetScope, ExposureLevel, Criticality, ImpactRating } from '../types'
import {
  ASSET_SCOPE_LABELS,
  ASSET_SCOPE_DESCRIPTIONS,
  ASSET_SCOPE_COLORS,
  EXPOSURE_LEVEL_LABELS,
  EXPOSURE_LEVEL_DESCRIPTIONS,
  EXPOSURE_LEVEL_COLORS,
  CRITICALITY_LABELS,
  CRITICALITY_DESCRIPTIONS,
  IMPACT_RATING_LABELS,
} from '../types'

// Scope icons
const SCOPE_ICONS: Record<AssetScope, React.ElementType> = {
  internal: Building2,
  external: Globe,
  cloud: Cloud,
  partner: Users,
  vendor: Store,
  shadow: HelpCircle,
}

// Exposure icons
const EXPOSURE_ICONS: Record<ExposureLevel, React.ElementType> = {
  public: Eye,
  restricted: Lock,
  private: EyeOff,
  isolated: Shield,
  unknown: AlertCircle,
}

// Criticality icons
const CRITICALITY_ICONS: Record<Criticality, React.ElementType> = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: CircleDot,
  low: Minus,
}

interface AssetScopeBadgeProps {
  scope: AssetScope
  showIcon?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function AssetScopeBadge({
  scope,
  showIcon = true,
  showTooltip = true,
  size = 'md',
  className,
}: AssetScopeBadgeProps) {
  const colors = ASSET_SCOPE_COLORS[scope]
  const Icon = SCOPE_ICONS[scope]
  const label = ASSET_SCOPE_LABELS[scope]
  const description = ASSET_SCOPE_DESCRIPTIONS[scope]

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {label}
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ExposureBadgeProps {
  exposure: ExposureLevel
  showIcon?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ExposureBadge({
  exposure,
  showIcon = true,
  showTooltip = true,
  size = 'md',
  className,
}: ExposureBadgeProps) {
  const colors = EXPOSURE_LEVEL_COLORS[exposure]
  const Icon = EXPOSURE_ICONS[exposure]
  const label = EXPOSURE_LEVEL_LABELS[exposure]
  const description = EXPOSURE_LEVEL_DESCRIPTIONS[exposure]

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {label}
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface CriticalityBadgeProps {
  criticality: Criticality
  showIcon?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function CriticalityBadge({
  criticality,
  showIcon = true,
  showTooltip = true,
  size = 'md',
  className,
}: CriticalityBadgeProps) {
  const Icon = CRITICALITY_ICONS[criticality]
  const label = CRITICALITY_LABELS[criticality]
  const description = CRITICALITY_DESCRIPTIONS[criticality]

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        CRITICALITY_BADGE_SOFT[criticality],
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {label}
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ClassificationBadgesProps {
  scope: AssetScope
  exposure: ExposureLevel
  criticality?: Criticality
  showIcons?: boolean
  showTooltips?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Combined component showing scope, exposure, and optionally criticality badges.
 *
 * The exposure badge is hidden when the value is "unknown" (the default for
 * assets created without an explicit exposure level). Showing a row of grey
 * "Unknown" pills next to every asset adds noise without information — once a
 * real exposure level is set the badge will appear automatically.
 */
export function ClassificationBadges({
  scope,
  exposure,
  criticality,
  showIcons = true,
  showTooltips = true,
  size = 'md',
  className,
}: ClassificationBadgesProps) {
  const showExposure = exposure && exposure !== 'unknown'
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {criticality && (
        <CriticalityBadge
          criticality={criticality}
          showIcon={showIcons}
          showTooltip={showTooltips}
          size={size}
        />
      )}
      <AssetScopeBadge scope={scope} showIcon={showIcons} showTooltip={showTooltips} size={size} />
      {showExposure && (
        <ExposureBadge
          exposure={exposure}
          showIcon={showIcons}
          showTooltip={showTooltips}
          size={size}
        />
      )}
    </div>
  )
}

const CIA_DIMENSIONS = [
  {
    key: 'confidentiality',
    letter: 'C',
    label: 'Confidentiality',
    consequence: 'unauthorized disclosure',
  },
  { key: 'integrity', letter: 'I', label: 'Integrity', consequence: 'unauthorized modification' },
  {
    key: 'availability',
    letter: 'A',
    label: 'Availability',
    consequence: 'loss of access or uptime',
  },
] as const

interface CIABadgesProps {
  confidentiality?: ImpactRating
  integrity?: ImpactRating
  availability?: ImpactRating
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Compact read-only display of the CTEM Scoping CIA business-impact ratings
 * (api #467). Each set dimension renders as a small `C:High` style pill; unset
 * dimensions are omitted. Renders nothing when no dimension is rated, so it can
 * be dropped in unconditionally.
 */
export function CIABadges({
  confidentiality,
  integrity,
  availability,
  size = 'md',
  className,
}: CIABadgesProps) {
  const values: Record<string, ImpactRating | undefined> = {
    confidentiality,
    integrity,
    availability,
  }
  const rated = CIA_DIMENSIONS.filter((d) => values[d.key])
  if (rated.length === 0) return null

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1.5', className)}>
        {rated.map((d) => {
          const rating = values[d.key] as ImpactRating
          return (
            <Tooltip key={d.key} delayDuration={200}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1 font-medium border',
                    IMPACT_RATING_BADGE_SOFT[rating],
                    size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'
                  )}
                >
                  <span className="font-semibold">{d.letter}</span>
                  {IMPACT_RATING_LABELS[rating]}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="font-medium">
                  {d.label}: {IMPACT_RATING_LABELS[rating]} impact
                </p>
                <p className="text-xs text-muted-foreground">
                  Business impact if {d.consequence} occurred.
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

interface ControlPlaneBadgeProps {
  size?: 'sm' | 'md'
  showTooltip?: boolean
  className?: string
}

/**
 * Read-only badge marking an asset as part of the control plane
 * (assets.is_control_plane) — infrastructure that governs other assets
 * (identity providers, orchestrators, CI/CD, secret stores). Compromise here
 * has an outsized blast radius, so the CTEM register tracks it explicitly.
 * Render only when the flag is true.
 */
export function ControlPlaneBadge({
  size = 'md',
  showTooltip = true,
  className,
}: ControlPlaneBadgeProps) {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-900/30 dark:text-purple-400',
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <Network className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      Control Plane
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="font-medium">Control-plane asset</p>
          <p className="text-xs text-muted-foreground">
            Governs other assets (identity, orchestration, CI/CD, secrets). Elevated blast radius if
            compromised.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Severity } from '@/features/shared/types'
import { SEVERITY_BADGE_SOFT, type SeverityLevel } from '@/lib/severity-colors'

// Soft-tint severity badge — colors sourced from the single source of truth
// (severity-colors.ts SEVERITY_BADGE_SOFT) so they can't drift. "none" reuses the
// neutral (info) tint.
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
  none: 'None',
}

function softClass(severity: Severity): string {
  const key = (severity === 'none' ? 'info' : severity) as SeverityLevel
  return SEVERITY_BADGE_SOFT[key]
}

const severityConfig: Record<Severity, { label: string; className: string }> = {
  critical: { label: SEVERITY_LABELS.critical, className: softClass('critical') },
  high: { label: SEVERITY_LABELS.high, className: softClass('high') },
  medium: { label: SEVERITY_LABELS.medium, className: softClass('medium') },
  low: { label: SEVERITY_LABELS.low, className: softClass('low') },
  info: { label: SEVERITY_LABELS.info, className: softClass('info') },
  none: { label: SEVERITY_LABELS.none, className: softClass('none') },
}

interface SeverityBadgeProps {
  severity: Severity
  className?: string
  showLabel?: boolean
}

export function SeverityBadge({ severity, className, showLabel = true }: SeverityBadgeProps) {
  const config = severityConfig[severity]

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {showLabel ? config.label : severity.charAt(0).toUpperCase()}
    </Badge>
  )
}

interface VulnerabilityCountBadgeProps {
  counts: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  className?: string
}

export function VulnerabilityCountBadge({ counts, className }: VulnerabilityCountBadgeProps) {
  const total = counts.critical + counts.high + counts.medium + counts.low + counts.info

  if (total === 0) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
          className
        )}
      >
        0
      </Badge>
    )
  }

  // Show the highest severity
  if (counts.critical > 0) {
    return (
      <Badge variant="outline" className={cn(severityConfig.critical.className, className)}>
        {counts.critical}C{counts.high > 0 && ` ${counts.high}H`}
      </Badge>
    )
  }

  if (counts.high > 0) {
    return (
      <Badge variant="outline" className={cn(severityConfig.high.className, className)}>
        {counts.high}H{counts.medium > 0 && ` ${counts.medium}M`}
      </Badge>
    )
  }

  if (counts.medium > 0) {
    return (
      <Badge variant="outline" className={cn(severityConfig.medium.className, className)}>
        {counts.medium}M
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn(severityConfig.low.className, className)}>
      {counts.low}L
    </Badge>
  )
}

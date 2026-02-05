'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Severity } from '@/features/shared/types'

const severityConfig: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/25',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/25',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/25',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25',
  },
  info: {
    label: 'Info',
    className: 'bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/25',
  },
  none: {
    label: 'None',
    className: 'bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/25',
  },
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
        className={cn('bg-green-500/15 text-green-600 border-green-500/30', className)}
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

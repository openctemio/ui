'use client'

import { AlertTriangle, Archive, CheckCircle2, CircleSlash, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type AssetStatus = 'active' | 'stale' | 'inactive' | 'archived' | string

interface AssetStatusBadgeProps {
  status: AssetStatus
  /**
   * Days since the asset was last observed. When provided alongside
   * a stale/inactive status, the badge renders as "Stale 12d" so
   * operators can tell how old the signal is at a glance.
   */
  daysSinceLastSeen?: number
  /**
   * Snooze expiry timestamp. When set, the tooltip mentions the
   * active snooze so operators know the worker is paused on this
   * asset.
   */
  snoozedUntil?: string | null
  className?: string
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    Icon: React.ComponentType<{ className?: string }>
    className: string
    description: string
  }
> = {
  active: {
    label: 'Active',
    Icon: CheckCircle2,
    className:
      'border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400',
    description: 'Asset was recently observed by a scanner or integration.',
  },
  stale: {
    label: 'Stale',
    Icon: Clock,
    className:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400',
    description: 'No source has re-observed this asset within the configured threshold.',
  },
  inactive: {
    label: 'Inactive',
    Icon: CircleSlash,
    className:
      'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    description: 'The asset has been stale long enough to be marked inactive.',
  },
  archived: {
    label: 'Archived',
    Icon: Archive,
    className:
      'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    description: 'Archived — requires manual restore to return to active rotation.',
  },
}

const UNKNOWN_CONFIG = {
  label: 'Unknown',
  Icon: AlertTriangle,
  className:
    'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400',
  description: 'Unrecognised status value.',
}

export function AssetStatusBadge({
  status,
  daysSinceLastSeen,
  snoozedUntil,
  className,
}: AssetStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? UNKNOWN_CONFIG
  const Icon = config.Icon

  const showDays =
    typeof daysSinceLastSeen === 'number' &&
    daysSinceLastSeen > 0 &&
    (status === 'stale' || status === 'inactive')

  const snoozeActive = snoozedUntil && new Date(snoozedUntil) > new Date()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn('gap-1.5 font-medium', config.className, className)}>
          <Icon className="h-3 w-3" />
          <span>{config.label}</span>
          {showDays && <span className="opacity-75">· {daysSinceLastSeen}d</span>}
          {snoozeActive && <span className="opacity-75">· snoozed</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p>{config.description}</p>
        {showDays && (
          <p className="mt-1 text-muted-foreground">Last observed {daysSinceLastSeen} days ago.</p>
        )}
        {snoozeActive && (
          <p className="mt-1 text-muted-foreground">
            Lifecycle worker paused until {new Date(snoozedUntil).toLocaleDateString()}.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

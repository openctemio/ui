'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface RangeChipsProps {
  ranges: string[]
  /** How many chips to show before "+N". */
  max?: number
  /** Shown when the zone has no ranges (only the default zone may). */
  emptyLabel?: string
}

/** CIDR chips, truncated with a "+N" whose tooltip lists the rest. */
export function RangeChips({ ranges, max = 2, emptyLabel = 'No ranges' }: RangeChipsProps) {
  if (ranges.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>
  }
  const shown = ranges.slice(0, max)
  const rest = ranges.slice(max)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((r) => (
        <Badge key={r} variant="outline" className="font-mono text-xs font-normal">
          {r}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-default text-xs font-normal tabular-nums"
              tabIndex={0}
              aria-label={`${rest.length} more ranges: ${rest.join(', ')}`}
            >
              +{rest.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="break-words font-mono text-xs">{rest.join(', ')}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

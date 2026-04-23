'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PriorityClass } from '../types/finding.types'
import { PRIORITY_CLASS_CONFIG } from '../types/finding.types'

interface PriorityClassBadgeProps {
  priorityClass: PriorityClass
  showTooltip?: boolean
  className?: string
}

export function PriorityClassBadge({
  priorityClass,
  showTooltip = true,
  className,
}: PriorityClassBadgeProps) {
  const config = PRIORITY_CLASS_CONFIG[priorityClass]

  const badge = (
    <Badge className={cn(config.color, config.textColor, 'font-mono font-bold text-xs', className)}>
      {config.label}
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{config.description}</p>
        <p className="text-xs text-muted-foreground mt-1">SLA: {config.sla}</p>
      </TooltipContent>
    </Tooltip>
  )
}

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Severity } from '../types'
import { SEVERITY_CONFIG } from '../types'

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

// Neutral fallback for a severity value outside the known set (empty, null, an
// unexpected case like "High", or a not-yet-scored record). Rendering a plain
// badge is far better than crashing the whole page — a missing config used to
// throw `undefined is not an object (evaluating 'config.color')` and take out
// its error boundary.
const FALLBACK_SEVERITY = {
  label: 'Unknown',
  color: 'bg-muted',
  textColor: 'text-muted-foreground',
} as const

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config =
    (severity != null && SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG]) ||
    FALLBACK_SEVERITY

  return (
    <Badge className={cn(config.color, config.textColor, 'font-medium', className)}>
      {config.label}
    </Badge>
  )
}

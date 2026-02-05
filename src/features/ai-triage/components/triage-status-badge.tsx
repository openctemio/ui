'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { TriageStatus } from '../types'
import { TRIAGE_STATUS_CONFIG } from '../types'

interface TriageStatusBadgeProps {
  status: TriageStatus
  className?: string
}

const iconMap = {
  clock: Clock,
  loader: Loader2,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
} as const

export function TriageStatusBadge({ status, className }: TriageStatusBadgeProps) {
  const config = TRIAGE_STATUS_CONFIG[status]
  const Icon = iconMap[config.icon as keyof typeof iconMap]

  return (
    <Badge
      variant="outline"
      className={cn(config.bgColor, config.color, 'border-none gap-1.5', className)}
    >
      <Icon
        className={cn('h-3.5 w-3.5', status === 'processing' && 'animate-spin')}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  )
}

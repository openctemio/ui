'use client'

import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VerifiedDomainStatus } from '../types/verified-domain.types'

const CONFIG: Record<
  VerifiedDomainStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    className: 'border-0 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  verified: {
    label: 'Verified',
    className: 'border-0 bg-green-500/10 text-green-600 dark:text-green-400',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'border-0 bg-red-500/10 text-red-600 dark:text-red-400',
    icon: XCircle,
  },
}

export function VerifiedDomainStatusBadge({
  status,
  className,
}: {
  status: VerifiedDomainStatus
  className?: string
}) {
  const config = CONFIG[status] ?? CONFIG.pending
  const Icon = config.icon
  return (
    <Badge className={cn(config.className, className)}>
      <Icon />
      {config.label}
    </Badge>
  )
}

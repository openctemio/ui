'use client'

import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VerifiedDomainStatus } from '../types/verified-domain.types'

// Only a failure is coloured; pending and verified stay neutral.
const CONFIG: Record<
  VerifiedDomainStatus,
  { label: string; variant: 'default' | 'outline' | 'destructive'; icon: typeof Clock }
> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  verified: { label: 'Verified', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
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
    <Badge variant={config.variant} className={cn(className)}>
      <Icon />
      {config.label}
    </Badge>
  )
}

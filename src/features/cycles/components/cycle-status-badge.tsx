import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CtemCycleStatus } from '../types'

// Status meaning uses the theme's status tokens (dark-mode safe): planning is
// informational, active is running, review needs attention, closed is done.
const STATUS_CLASS: Record<CtemCycleStatus, string> = {
  planning: 'border-info/30 bg-info/10 text-info',
  active: 'border-success/30 bg-success/10 text-success',
  review: 'border-warning/30 bg-warning/10 text-warning',
  closed: 'bg-muted text-muted-foreground',
}

export function CycleStatusBadge({
  status,
  className,
}: {
  status: CtemCycleStatus
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('capitalize', STATUS_CLASS[status], className)}>
      {status}
    </Badge>
  )
}

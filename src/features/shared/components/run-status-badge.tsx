import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  CircleDashed,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

/**
 * Canonical badge for scan / pipeline RUN status. Replaces the per-page
 * status maps that each rendered a different color set and vocabulary, and
 * the shared StatusBadge which was label-only and collapsed running→active and
 * timeout/canceled→failed. Distinguishes every state with icon + color + label,
 * and animates the running spinner so live runs read at a glance.
 */
type RunStatusConfig = { label: string; icon: LucideIcon; className: string; spin?: boolean }

const RUN_STATUS: Record<string, RunStatusConfig> = {
  queued: { label: 'Queued', icon: CircleDashed, className: 'bg-muted text-muted-foreground' },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-warning/15 text-warning',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    className: 'bg-info/15 text-info',
    spin: true,
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-success/15 text-success',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-destructive/15 text-destructive',
  },
  timeout: {
    label: 'Timeout',
    icon: AlertTriangle,
    className: 'bg-warning/15 text-warning',
  },
  canceled: { label: 'Canceled', icon: Ban, className: 'bg-muted text-muted-foreground' },
}

export function RunStatusBadge({ status, className }: { status: string; className?: string }) {
  // Normalize the two spellings the backends use.
  const key = status === 'cancelled' ? 'canceled' : status
  const config = RUN_STATUS[key] ?? {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
  }
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-transparent font-medium', config.className, className)}
    >
      <Icon className={cn('h-3 w-3', config.spin && 'animate-spin')} />
      {config.label}
    </Badge>
  )
}

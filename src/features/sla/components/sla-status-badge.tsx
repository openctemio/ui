import { Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SLA_STATUS_LABELS,
  SLA_STATUS_COLORS,
  type SLAStatus,
} from '@/features/repositories/types/repository.types'

/**
 * SLA status pill. Colours come from the single-source SLA_STATUS_COLORS map
 * (defined in repository.types.ts) so no new hardcoded palette classes are
 * introduced here — see scripts/check-palette-drift.sh.
 *
 * Backend status values (vulnerability value_objects.go): on_track | warning |
 * overdue | exceeded | not_applicable.
 */
export function SlaStatusBadge({
  status,
  className,
}: {
  status?: string | null
  className?: string
}) {
  const key = (status as SLAStatus) || 'not_applicable'
  const colors = SLA_STATUS_COLORS[key] ?? SLA_STATUS_COLORS.not_applicable
  const label = SLA_STATUS_LABELS[key] ?? SLA_STATUS_LABELS.not_applicable

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      <Timer className="h-3 w-3" />
      {label}
    </span>
  )
}

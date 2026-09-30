import { cn } from '@/lib/utils'
import { SEVERITY_DOT_COLORS, SEVERITY_ORDER, type SeverityLevel } from '@/lib/severity-colors'

export type SeverityCounts = Partial<Record<SeverityLevel, number>>

interface SeverityStripProps {
  counts: SeverityCounts
  className?: string
}

const LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

/**
 * Compact severity breakdown: one stacked bar plus a count per severity.
 * Sized for drawers and cards, where a full chart would be too heavy. Colors
 * come from the single-source severity tokens.
 */
export function SeverityStrip({ counts, className }: SeverityStripProps) {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0)

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={SEVERITY_ORDER.map((s) => `${counts[s] ?? 0} ${LABELS[s]}`).join(', ')}
      >
        {total > 0 &&
          SEVERITY_ORDER.map((s) => {
            const n = counts[s] ?? 0
            if (n === 0) return null
            return (
              <div
                key={s}
                className={SEVERITY_DOT_COLORS[s]}
                style={{ width: `${(n / total) * 100}%` }}
              />
            )
          })}
      </div>
      <dl className="grid grid-cols-5 gap-1">
        {SEVERITY_ORDER.map((s) => {
          const n = counts[s] ?? 0
          return (
            <div key={s} className="min-w-0">
              <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SEVERITY_DOT_COLORS[s])} />
                <span className="truncate">{LABELS[s]}</span>
              </dt>
              <dd
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  n === 0 && 'font-normal text-muted-foreground'
                )}
              >
                {n}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

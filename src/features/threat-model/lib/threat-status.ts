import type { ThreatStatus } from '../types'

/**
 * Status visual language for derived threats. Colors follow the app's
 * severity/status conventions:
 *   open        → critical / red   (a confirmed, unmitigated exposure)
 *   mitigated   → positive / green (a control or fix neutralises it)
 *   covered     → info / blue      (covered by a compensating control)
 *   accepted    → muted            (risk-accepted by an owner)
 *   theoretical → neutral / slate  (applicable technique, no evidence yet)
 */
export interface ThreatStatusStyle {
  label: string
  /** Badge class bundle (bg/text/border), matching severity-colors soft style. */
  badgeClass: string
  /** Solid dot color for compact rollups. */
  dotClass: string
}

export const THREAT_STATUS_STYLES: Record<ThreatStatus, ThreatStatusStyle> = {
  open: {
    label: 'Open',
    badgeClass: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  mitigated: {
    label: 'Mitigated',
    badgeClass: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  covered: {
    label: 'Covered',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  accepted: {
    label: 'Accepted',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  },
  theoretical: {
    label: 'Theoretical',
    badgeClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
}

/**
 * Concrete hex for each status, keyed to the same Tailwind color families used
 * by the badge/dot classes above (red-500 / green-500 / blue-500 / gray-400 /
 * slate-400). Used where a literal color is required and Tailwind classes
 * cannot be — e.g. the ATT&CK Navigator layer export.
 */
export const THREAT_STATUS_HEX: Record<ThreatStatus, string> = {
  open: '#ef4444', // red-500
  mitigated: '#22c55e', // green-500
  covered: '#3b82f6', // blue-500
  accepted: '#9ca3af', // gray-400 (muted)
  theoretical: '#94a3b8', // slate-400
}

export function getThreatStatusHex(status: ThreatStatus): string {
  return THREAT_STATUS_HEX[status] ?? THREAT_STATUS_HEX.theoretical
}

/** All statuses in a sensible display/severity order. */
export const THREAT_STATUS_ORDER: ThreatStatus[] = [
  'open',
  'theoretical',
  'covered',
  'mitigated',
  'accepted',
]

export function getThreatStatusStyle(status: ThreatStatus): ThreatStatusStyle {
  return (
    THREAT_STATUS_STYLES[status] ?? {
      label: status,
      badgeClass: 'bg-muted text-muted-foreground border-border',
      dotClass: 'bg-muted-foreground',
    }
  )
}

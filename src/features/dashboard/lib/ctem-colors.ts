/**
 * CTEM dashboard color helpers.
 *
 * Single source of truth for the colors the CTEM story cards use, so nothing
 * hardcodes a Tailwind palette class or a raw hex. Priority classes reuse the
 * existing severity hue ramp; the one color the platform genuinely has no token
 * for — "good / on-track / resolved" green — is defined here once and annotated
 * for the palette-drift gate.
 */

import {
  SEVERITY_CHART_COLORS,
  SEVERITY_DOT_COLORS,
  SEVERITY_TEXT_COLORS,
} from '@/lib/severity-colors'
import type { PriorityClass } from '@/features/findings/types/finding.types'

/** Priority classes map onto the severity hue ramp: P0=crit, P1=high, P2=med, P3=low. */
export const PRIORITY_CHART_COLORS: Record<PriorityClass, string> = {
  P0: SEVERITY_CHART_COLORS.critical,
  P1: SEVERITY_CHART_COLORS.high,
  P2: SEVERITY_CHART_COLORS.medium,
  P3: SEVERITY_CHART_COLORS.low,
}

export const PRIORITY_ORDER: PriorityClass[] = ['P0', 'P1', 'P2', 'P3']

/** Chart hex for "resolved / good" — no severity or semantic token covers it. */
export const RESOLVED_CHART_COLOR = '#22c55e'

/** Health state used by the CTEM loop stage stripes and coverage bars. */
export type CtemState = 'good' | 'warn' | 'crit'

const GOOD_STRIPE = 'bg-emerald-500' // palette-ok: no semantic/severity token for "on-track" green
const GOOD_TEXT = 'text-emerald-600 dark:text-emerald-400' // palette-ok: no semantic/severity token for success
const GOOD_BAR = 'bg-emerald-500' // palette-ok: no semantic/severity token for success

export const STATE_STRIPE: Record<CtemState, string> = {
  good: GOOD_STRIPE,
  warn: SEVERITY_DOT_COLORS.medium,
  crit: SEVERITY_DOT_COLORS.critical,
}

export const STATE_TEXT: Record<CtemState, string> = {
  good: GOOD_TEXT,
  warn: SEVERITY_TEXT_COLORS.medium,
  crit: SEVERITY_TEXT_COLORS.critical,
}

export const STATE_BAR: Record<CtemState, string> = {
  good: GOOD_BAR,
  warn: SEVERITY_DOT_COLORS.medium,
  crit: SEVERITY_DOT_COLORS.critical,
}

/** A percentage-coverage value → health state (higher is better). */
export function coverageState(pct: number): CtemState {
  if (pct >= 80) return 'good'
  if (pct >= 40) return 'warn'
  return 'crit'
}

/** An open-count value → health state (lower is better; 0 is good). */
export function openCountState(count: number, warnAt = 1, critAt = 5): CtemState {
  if (count >= critAt) return 'crit'
  if (count >= warnAt) return 'warn'
  return 'good'
}

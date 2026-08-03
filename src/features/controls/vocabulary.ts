/**
 * Compensating-control vocabulary and unit conversion.
 *
 * These values are NOT free-form: each one mirrors a CHECK constraint on the
 * `compensating_controls` table. The create form previously offered
 * preventive/detective/corrective/compensating, which has zero overlap with
 * what the database accepts, so every create failed. Drive every <Select> from
 * these arrays rather than hand-writing <SelectItem> values, and the form
 * cannot drift from the backend again.
 *
 * Kept in sync with:
 *   api/migrations/000146_compensating_controls.up.sql
 *   api/pkg/domain/compensatingcontrol/entity.go
 */

export const CONTROL_TYPES = [
  {
    value: 'segmentation',
    label: 'Segmentation',
    hint: 'Network or trust-boundary isolation',
  },
  { value: 'identity', label: 'Identity', hint: 'Authentication or access restriction' },
  { value: 'runtime', label: 'Runtime', hint: 'Runtime protection such as a WAF or RASP' },
  { value: 'detection', label: 'Detection', hint: 'Monitoring or alerting coverage' },
  { value: 'other', label: 'Other', hint: 'Anything else' },
] as const

export type ControlType = (typeof CONTROL_TYPES)[number]['value']

export const CONTROL_STATUSES = ['active', 'inactive', 'expired', 'untested'] as const
export type ControlStatus = (typeof CONTROL_STATUSES)[number]

export const TEST_RESULTS = ['pass', 'fail', 'partial'] as const
export type TestResult = (typeof TEST_RESULTS)[number]

export const CONTROL_TYPE_VALUES: readonly string[] = CONTROL_TYPES.map((t) => t.value)

/** Title-case a vocabulary value for display. */
export function humanizeControlValue(value: string): string {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * reduction_factor is stored and transmitted as a FRACTION (DECIMAL(3,2),
 * CHECK >= 0 AND <= 1). Operators think in percent, so the form speaks percent
 * and converts at the API boundary — an integer percent maps exactly onto the
 * two-decimal storable set, so the round trip is lossless.
 *
 * The old form sent the percent straight through: "20" meant 20, which is 20x
 * the maximum the column allows, and the list then rendered a stored 0.30 as
 * "0.3%". Read and write now agree because both go through these two functions.
 */
export const MIN_REDUCTION_PERCENT = 1
export const MAX_REDUCTION_PERCENT = 100

/** Percent as entered in the form (1-100) -> fraction for the API (0.01-1). */
export function percentToFactor(percent: number): number {
  // Round to 2 decimals: the column is DECIMAL(3,2) and would silently round.
  return Math.round(percent) / 100
}

/** Fraction from the API (0-1) -> percent for display (0-100). */
export function factorToPercent(factor: number): number {
  return Math.round(factor * 100)
}

/**
 * The API rejects a factor of 0 (it would be a silent no-op: the classifier
 * only treats an asset as protected when the factor is > 0). Mirror that here
 * so the user finds out before a round trip.
 */
export function isValidReductionPercent(percent: number): boolean {
  return (
    Number.isFinite(percent) && percent >= MIN_REDUCTION_PERCENT && percent <= MAX_REDUCTION_PERCENT
  )
}

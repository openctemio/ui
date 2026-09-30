/**
 * EPSS display helpers — the ONE place EPSS numbers are turned into text.
 *
 * Scale contract (matches the API, which normalizes at ingestion):
 *   - score:      exploitation PROBABILITY, 0–1   (0.97565 → "97.6%")
 *   - percentile: RANK among all CVEs,     0–100 (99.9    → "99.9th", "Top 0.1%")
 *
 * Every `epss_percentile` / `percentile` field the API returns is 0–100. Do not
 * multiply it by 100 and do not guess its scale from its magnitude: a value
 * below 1 is a genuine bottom-1% CVE, not a fraction. Components that render
 * EPSS must go through these helpers so the scales cannot drift apart again
 * (they once did, and CVE-2021-44228 rendered as "Top -9890.0%").
 */

export const EPSS_PLACEHOLDER = '—'

type Maybe = number | null | undefined

function isNum(v: Maybe): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Floor to `digits` decimals, so 99.96 never rounds up to "100.0". */
function floorTo(v: number, digits: number): string {
  const f = 10 ** digits
  return (Math.floor(v * f + 1e-9) / f).toFixed(digits)
}

/** EPSS score (0–1 probability) as a percentage: 0.97565 → "97.6%". */
export function formatEpssScore(
  score: Maybe,
  digits = 1,
  placeholder: string = EPSS_PLACEHOLDER
): string {
  if (!isNum(score)) return placeholder
  return `${(clamp(score, 0, 1) * 100).toFixed(digits)}%`
}

/** EPSS score (0–1) as a 0–100 number, e.g. for a progress-bar width. */
export function epssScoreToPercent(score: Maybe): number {
  return isNum(score) ? clamp(score, 0, 1) * 100 : 0
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (n % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/**
 * EPSS percentile (0–100 rank) as an ordinal: 99.9 → "99.9th", 42 → "42nd"
 * with `digits = 0`. Floors rather than rounds, so the 99.95th percentile is
 * "99.9th", never "100.0th".
 */
export function formatEpssPercentile(
  percentile: Maybe,
  digits = 1,
  placeholder: string = EPSS_PLACEHOLDER
): string {
  if (!isNum(percentile)) return placeholder
  const text = floorTo(clamp(percentile, 0, 100), digits)
  const suffix = digits === 0 ? ordinalSuffix(Number(text)) : 'th'
  return `${text}${suffix}`
}

/** The share of CVEs at or above this percentile: 99.9 → 0.1 (top 0.1%). */
export function epssTopPercent(percentile: number): number {
  // Round away float noise: 100 - 99.9 is 0.09999999999999432 in IEEE-754.
  return Math.round((100 - clamp(percentile, 0, 100)) * 1e6) / 1e6
}

/**
 * "Top X%" for a 0–100 percentile: 99.9 → "Top 0.1%", 75 → "Top 25%".
 * One decimal below 10%, none above; below 0.1% reads "Top <0.1%".
 */
export function formatEpssTopPercent(
  percentile: Maybe,
  placeholder: string = EPSS_PLACEHOLDER
): string {
  if (!isNum(percentile)) return placeholder
  const top = epssTopPercent(percentile)
  if (top < 0.1) return 'Top <0.1%'
  // Round the share UP so a CVE is never shown in a smaller "top" bucket than
  // it is in (the 99.85th percentile is the top 0.2%, not 0.1%).
  if (top < 10) return `Top ${(Math.ceil(top * 10 - 1e-9) / 10).toFixed(1)}%`
  return `Top ${Math.ceil(top - 1e-9)}%`
}

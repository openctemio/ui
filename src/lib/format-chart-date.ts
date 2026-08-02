/**
 * Safe x-axis / tooltip label formatter for trend, area, bar and timeline
 * charts.
 *
 * Chart x values arrive in wildly different shapes: full ISO timestamps, plain
 * `YYYY-MM-DD` day strings, month-only strings (`"Jan"`, `"2026-01"`),
 * pre-formatted labels (`"Jan 5"`, `"Week 3"`), numbers, or `null`. Passing any
 * of the non-date shapes straight into `new Date(value).toLocaleDateString()`
 * yields the literal text "Invalid Date" on every tick.
 *
 * `formatChartDate` degrades gracefully instead:
 *  - nullish            → '' (empty tick)
 *  - already a label    → returned as-is (has a space, or is non-numeric and
 *                         not ISO-ish, e.g. "Jan", "Week 3")
 *  - parseable date     → short "Mon D" (e.g. "Jan 5")
 *  - unparseable        → the original string (never "Invalid Date")
 */
export function formatChartDate(value: unknown): string {
  if (value === null || value === undefined) return ''

  // Already a human label — pass through untouched.
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return ''
    // Contains a space → already formatted ("Jan 5", "Week 3", "2026 Q1").
    if (trimmed.includes(' ')) return trimmed
    // Non-numeric and not ISO-ish → a bare label like "Jan" or "Mon".
    // ISO-ish = starts with 4 digits (a year) so date parsing is meaningful.
    const isoish = /^\d{4}[-/]/.test(trimmed) || /^\d{4}$/.test(trimmed)
    const numericTimestamp = /^\d+$/.test(trimmed)
    if (!isoish && !numericTimestamp && Number.isNaN(Number(trimmed))) {
      return trimmed
    }
  }

  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

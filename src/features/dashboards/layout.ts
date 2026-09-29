/**
 * Shared layout constants for customizable dashboards (RFC-021).
 *
 * A dashboard renders as `columns` equal columns (1..4). Each widget stores its
 * width `w` on a 12-unit grid (so templates and older layouts keep working); at
 * render time that width is mapped to a column span of 1..columns. Rows have a
 * fixed pixel height so a short stat widget never balloons to fill space.
 */

/** Underlying grid the stored `w` is expressed in. */
export const BASE_GRID = 12

/** Default number of columns a dashboard is arranged in. */
export const DEFAULT_COLUMNS = 2

/** Fixed height (px) of one grid row. A widget of height `h` spans `h` rows. */
export const ROW_HEIGHT = 128

/** localStorage key the main dashboard uses to remember the selected view. */
export const DASHBOARD_VIEW_STORAGE_KEY = 'openctem:dashboard-view'

/** Clamp a raw columns value to the supported 1..4 range (default 2). */
export function normalizeColumns(columns: number | undefined): number {
  const c = Math.round(columns ?? DEFAULT_COLUMNS)
  return Math.max(1, Math.min(4, c || DEFAULT_COLUMNS))
}

/** Tailwind classes giving an N-column grid (stacked on mobile). */
export function columnsClass(columns: number | undefined): string {
  switch (normalizeColumns(columns)) {
    case 1:
      return 'grid-cols-1'
    case 3:
      return 'grid-cols-1 md:grid-cols-3'
    case 4:
      return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
    default:
      return 'grid-cols-1 md:grid-cols-2'
  }
}

/** Column span (1..columns) for a widget of stored width `w`. */
export function colSpanFor(w: number, columns: number | undefined): number {
  const cols = normalizeColumns(columns)
  const unit = BASE_GRID / cols
  return Math.max(1, Math.min(cols, Math.round((w || unit) / unit)))
}

/** Stored width (12-grid units) for a widget spanning `span` of `columns`. */
export function widthFromSpan(span: number, columns: number | undefined): number {
  const cols = normalizeColumns(columns)
  const s = Math.max(1, Math.min(cols, Math.round(span)))
  return Math.min(BASE_GRID, s * (BASE_GRID / cols))
}

/** CSS `grid-column` value for a widget of span `span`. */
export function gridColumnSpan(span: number): string {
  const s = Math.max(1, Math.min(4, span))
  return `span ${s} / span ${s}`
}

/** CSS `grid-row` value for a widget of height `h` (in row units). */
export function widgetRowSpan(h: number): string {
  const span = Math.max(1, Math.min(8, h || 1))
  return `span ${span} / span ${span}`
}

/** Legacy 12-grid column span — kept for the read-only helper still imported elsewhere. */
export function widgetColSpan(w: number): string {
  const span = Math.max(2, Math.min(BASE_GRID, w || BASE_GRID))
  return `span ${span} / span ${span}`
}

/** Width (in 12-grid units) of one column for an N-column layout. */
export function widthForColumns(columns: number): number {
  const cols = normalizeColumns(columns)
  return Math.max(1, Math.round(BASE_GRID / cols))
}

/**
 * Shared layout constants for customizable dashboards (RFC-021).
 *
 * Widgets are placed on a 12-unit grid (`w`/`h` are grid-unit spans). A
 * dashboard's `columns` (1..4) is a layout preset: picking it re-flows widget
 * widths to `12 / columns` so the grid reads as N equal columns. Rows have a
 * fixed pixel height so a short stat widget never balloons to fill space.
 */

/** Grid columns the widget canvas is measured in. */
export const GRID_COLUMNS = 12

/** Fixed height (px) of one grid row. A widget of height `h` spans `h` rows. */
export const ROW_HEIGHT = 128

/** localStorage key the main dashboard uses to remember the selected view. */
export const DASHBOARD_VIEW_STORAGE_KEY = 'openctem:dashboard-view'

/** Width (in 12-grid units) of one column for an N-column layout. */
export function widthForColumns(columns: number): number {
  const cols = Math.max(1, Math.min(4, Math.round(columns) || 2))
  return Math.max(1, Math.round(GRID_COLUMNS / cols))
}

/** CSS `grid-column` value for a widget of width `w` (clamped to the grid). */
export function widgetColSpan(w: number): string {
  const span = Math.max(2, Math.min(GRID_COLUMNS, w || GRID_COLUMNS))
  return `span ${span} / span ${span}`
}

/** CSS `grid-row` value for a widget of height `h` (in row units). */
export function widgetRowSpan(h: number): string {
  const span = Math.max(1, Math.min(8, h || 1))
  return `span ${span} / span ${span}`
}

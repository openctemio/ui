'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Dashboard, DashboardWidget } from '../api/dashboards.types'
import { WIDGET_REGISTRY } from '../widgets/registry'
import { ROW_HEIGHT, widgetColSpan, widgetRowSpan } from '../layout'

/** Re-exported for callers that used to import it from here. */
export { widgetColSpan } from '../layout'

/**
 * Read-only render of a saved dashboard's widgets on a fixed-row 12-col grid.
 * Shared by the main dashboard shell (as a switchable view) and the /dashboards
 * gallery. Each widget renders its own live data from WIDGET_REGISTRY — an
 * unknown type is shown as a small notice, never a crash. Row height is fixed so
 * a short stat widget occupies exactly its `h` rows instead of stretching to
 * fill the container.
 */
export function DashboardCanvas({
  layout,
  columns,
}: {
  layout: DashboardWidget[]
  columns?: Dashboard['columns']
}) {
  if (layout.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        This dashboard has no widgets yet. Open it in Dashboards to add some.
      </div>
    )
  }
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-12"
      style={{ gridAutoRows: `${ROW_HEIGHT}px` }}
      data-columns={columns ?? 2}
    >
      {layout.map((wg, i) => {
        const def = WIDGET_REGISTRY[wg.widget_type]
        return (
          <div
            key={`${wg.widget_type}-${i}`}
            style={{ gridColumn: widgetColSpan(wg.w), gridRow: widgetRowSpan(wg.h) }}
            className="min-w-0"
          >
            {def ? (
              <def.component />
            ) : (
              <Card className="h-full">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  Unknown widget: {wg.widget_type}
                </CardContent>
              </Card>
            )}
          </div>
        )
      })}
    </div>
  )
}

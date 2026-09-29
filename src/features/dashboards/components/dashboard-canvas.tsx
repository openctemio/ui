'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { DashboardWidget } from '../api/dashboards.types'
import { WIDGET_REGISTRY } from '../widgets/registry'

/** CSS grid column-span for a widget's width (2..12 in a 12-col grid). */
export function widgetColSpan(w: number): string {
  const clamped = Math.max(2, Math.min(12, w))
  return `span ${clamped} / span ${clamped}`
}

/**
 * Read-only render of a saved dashboard's widgets in a 12-col grid. Shared by the
 * main dashboard shell (as a switchable view) and the /dashboards page (view mode).
 * Each widget renders its own live data from WIDGET_REGISTRY — an unknown type is
 * shown as a small notice, never a crash.
 */
export function DashboardCanvas({ layout }: { layout: DashboardWidget[] }) {
  if (layout.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        This dashboard has no widgets yet. Open it in Dashboards to add some.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {layout.map((wg, i) => {
        const def = WIDGET_REGISTRY[wg.widget_type]
        return (
          <div
            key={`${wg.widget_type}-${i}`}
            style={{ gridColumn: widgetColSpan(wg.w) }}
            className="min-w-0"
          >
            {def ? (
              def.component()
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

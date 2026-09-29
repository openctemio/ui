'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreVertical, Plus, Trash2, Check, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  ROW_HEIGHT,
  colSpanFor,
  columnsClass,
  gridColumnSpan,
  normalizeColumns,
  widgetRowSpan,
  widthFromSpan,
} from '../layout'
import { WIDGET_REGISTRY } from '../widgets/registry'
import { updateDashboard, useRevalidateDashboards } from '../api/use-dashboards-api'
import type { Dashboard, DashboardWidget } from '../api/dashboards.types'

type DraftWidget = DashboardWidget & { uid: string }

let uidSeq = 0
const nextUid = () => `w${Date.now().toString(36)}${(uidSeq++).toString(36)}`

/** Size options for a dashboard of `cols` columns: span 1 … cols (Full width). */
function sizeOptions(cols: number): Array<{ label: string; span: number }> {
  return Array.from({ length: cols }, (_, i) => {
    const span = i + 1
    return { span, label: span === cols ? 'Full width' : `${span} column${span > 1 ? 's' : ''}` }
  })
}

/**
 * In-place editor for a custom dashboard's widgets. Rendered on the live
 * dashboard view (not the manage page): the viewer drags widgets to reorder,
 * resizes or removes each via its ⋮ menu, and adds new ones from the catalog.
 * Save persists the layout; the dashboard's identity (name/description/columns)
 * is edited on the manage page and passed through untouched.
 */
export function DashboardCanvasEditor({
  dashboard,
  onExit,
}: {
  dashboard: Dashboard
  onExit: () => void
}) {
  const revalidate = useRevalidateDashboards()
  const { can } = usePermissions()
  const cols = normalizeColumns(dashboard.columns)
  const [draft, setDraft] = useState<DraftWidget[]>(() =>
    dashboard.layout.map((w) => ({ ...w, uid: nextUid() }))
  )
  const [saving, setSaving] = useState(false)

  const catalog = useMemo(
    () =>
      Object.entries(WIDGET_REGISTRY).filter(
        ([, def]) => !def.requiredPermission || can(def.requiredPermission)
      ),
    [can]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const addWidget = (wt: string) => {
    const def = WIDGET_REGISTRY[wt]
    if (!def) return
    setDraft((d) => [
      ...d,
      {
        widget_type: wt,
        x: 0,
        y: d.length,
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        uid: nextUid(),
      },
    ])
  }
  const removeUid = (uid: string) => setDraft((d) => d.filter((w) => w.uid !== uid))
  const resize = (uid: string, span: number) =>
    setDraft((d) => d.map((w0) => (w0.uid === uid ? { ...w0, w: widthFromSpan(span, cols) } : w0)))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setDraft((d) => {
      const from = d.findIndex((w) => w.uid === active.id)
      const to = d.findIndex((w) => w.uid === over.id)
      return from < 0 || to < 0 ? d : arrayMove(d, from, to)
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const layout: DashboardWidget[] = draft.map(({ uid: _uid, ...w }, i) => ({ ...w, y: i }))
      await updateDashboard(dashboard.id, {
        name: dashboard.name,
        description: dashboard.description,
        columns: dashboard.columns,
        layout,
      })
      await revalidate()
      toast.success('Dashboard saved')
      onExit()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Customize toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Customizing</span>
          <span className="text-muted-foreground">— drag to reorder, ⋮ to resize or remove.</span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="me-2 h-4 w-4" /> Add component
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
              <DropdownMenuLabel>Add a component</DropdownMenuLabel>
              {catalog.length === 0 ? (
                <DropdownMenuItem disabled>No components available</DropdownMenuItem>
              ) : (
                catalog.map(([wt, def]) => (
                  <DropdownMenuItem
                    key={wt}
                    onClick={() => addWidget(wt)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{def.title}</span>
                    <span className="text-xs text-muted-foreground">{def.description}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={onExit} disabled={saving}>
            <X className="me-2 h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="me-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {draft.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No components yet. Use <span className="font-medium text-foreground">Add component</span>{' '}
          to place your first one.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={draft.map((w) => w.uid)} strategy={rectSortingStrategy}>
            <div
              className={cn('grid gap-4', columnsClass(cols))}
              style={{ gridAutoRows: `${ROW_HEIGHT}px` }}
            >
              {draft.map((wg) => (
                <EditableWidget
                  key={wg.uid}
                  widget={wg}
                  columns={cols}
                  onResize={(span) => resize(wg.uid, span)}
                  onRemove={() => removeUid(wg.uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function EditableWidget({
  widget,
  columns,
  onResize,
  onRemove,
}: {
  widget: DraftWidget
  columns: number
  onResize: (span: number) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.uid,
  })
  const def = WIDGET_REGISTRY[widget.widget_type]
  const currentSpan = colSpanFor(widget.w, columns)
  const style: React.CSSProperties = {
    gridColumn: gridColumnSpan(currentSpan),
    gridRow: widgetRowSpan(widget.h),
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative min-w-0 rounded-xl',
        isDragging && 'opacity-80 ring-2 ring-primary'
      )}
    >
      {/* hover toolbar — no layout shift */}
      <div className="absolute end-2 top-2 z-20 flex items-center gap-0.5 rounded-md border bg-background/95 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              title="Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Size</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {sizeOptions(columns).map((s) => (
                  <DropdownMenuItem key={s.span} onClick={() => onResize(s.span)}>
                    <span className="flex-1">{s.label}</span>
                    {currentSpan === s.span && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="me-2 h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {def ? (
        <def.component />
      ) : (
        <Card className="h-full">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Unknown widget: {widget.widget_type}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

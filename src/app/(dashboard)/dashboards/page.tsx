'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Plus,
  Star,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Pencil,
} from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import { WIDGET_REGISTRY } from '@/features/dashboards/widgets/registry'
import { DASHBOARD_TEMPLATES, templateLayout } from '@/features/dashboards/templates'
import {
  useMyDashboards,
  useMyDashboard,
  useRevalidateDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  setDefaultDashboard,
} from '@/features/dashboards/api/use-dashboards-api'
import type { DashboardWidget } from '@/features/dashboards/api/dashboards.types'

const SIZE_OPTIONS: Array<{ label: string; w: number }> = [
  { label: 'S', w: 3 },
  { label: 'M', w: 4 },
  { label: 'L', w: 6 },
  { label: 'Full', w: 12 },
]

function colSpan(w: number): string {
  const clamped = Math.max(2, Math.min(12, w))
  return `span ${clamped} / span ${clamped}`
}

export default function DashboardsPage() {
  const [openId, setOpenId] = useState<string | null>(null)

  if (openId) {
    return <DashboardDetail id={openId} onBack={() => setOpenId(null)} />
  }
  return <DashboardsList onOpen={setOpenId} />
}

// ── List + gallery ────────────────────────────────────────────────────────────

function DashboardsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useMyDashboards()
  const revalidate = useRevalidateDashboards()
  const [busy, setBusy] = useState(false)
  const saved = data?.data ?? []

  const createFrom = async (name: string, layout: DashboardWidget[]) => {
    setBusy(true)
    try {
      const d = await createDashboard({ name, layout })
      await revalidate()
      toast.success(`Created "${name}"`)
      onOpen(d.id)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string, name: string) => {
    try {
      await deleteDashboard(id)
      await revalidate()
      toast.success(`Deleted "${name}"`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const makeDefault = async (id: string) => {
    try {
      await setDefaultDashboard(id)
      await revalidate()
      toast.success('Default dashboard set')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Main>
      <PageHeader
        title="Dashboards"
        description="Start from a template or build your own — a personal view of what matters to you."
      >
        <Button variant="outline" disabled={busy} onClick={() => createFrom('My dashboard', [])}>
          <Plus className="me-2 h-4 w-4" /> New blank
        </Button>
      </PageHeader>

      {/* Templates */}
      <section className="mt-2">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Start from a template</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_TEMPLATES.map((tpl) => (
            <Card key={tpl.key} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  {tpl.name}
                </CardTitle>
                <CardDescription>{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {tpl.widgetTypes.length} widgets
                </span>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => createFrom(tpl.name, templateLayout(tpl))}
                >
                  Use template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Saved */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your dashboards</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            No saved dashboards yet. Copy a template above to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((d) => (
              <Card key={d.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <button
                      className="truncate text-start hover:underline"
                      onClick={() => onOpen(d.id)}
                    >
                      {d.name}
                    </button>
                    {d.is_default && (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{d.layout.length} widgets</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => onOpen(d.id)}>
                      Open
                    </Button>
                    {!d.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Set as default"
                        onClick={() => makeDefault(d.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() => remove(d.id, d.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Main>
  )
}

// ── Detail + edit ─────────────────────────────────────────────────────────────

function DashboardDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useMyDashboard(id)
  const revalidate = useRevalidateDashboards()
  const { can } = usePermissions()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DashboardWidget[] | null>(null)
  const [saving, setSaving] = useState(false)

  const widgets = editing && draft ? draft : (data?.layout ?? [])

  // Catalog of widgets the viewer is allowed to add.
  const catalog = useMemo(
    () =>
      Object.entries(WIDGET_REGISTRY).filter(
        ([, def]) => !def.requiredPermission || can(def.requiredPermission)
      ),
    [can]
  )

  const startEdit = () => {
    setDraft(data?.layout ? [...data.layout] : [])
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
  }
  const save = async () => {
    if (!data || !draft) return
    setSaving(true)
    try {
      await updateDashboard(id, { name: data.name, layout: draft })
      await revalidate()
      setEditing(false)
      setDraft(null)
      toast.success('Dashboard saved')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const addWidget = (wt: string) => {
    const def = WIDGET_REGISTRY[wt].defaultSize
    setDraft((d) => [
      ...(d ?? []),
      { widget_type: wt, x: 0, y: d?.length ?? 0, w: def.w, h: def.h },
    ])
  }
  const removeAt = (i: number) => setDraft((d) => (d ?? []).filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d
      const j = i + dir
      if (j < 0 || j >= d.length) return d
      const next = [...d]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const resize = (i: number, w: number) =>
    setDraft((d) => (d ?? []).map((wg, idx) => (idx === i ? { ...wg, w } : wg)))

  if (isLoading) {
    return (
      <Main>
        <Skeleton className="h-9 w-48" />
        <div className="mt-6 grid grid-cols-12 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="col-span-3 h-28" />
          ))}
        </div>
      </Main>
    )
  }

  if (!data) {
    return (
      <Main>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="me-2 h-4 w-4" /> Back
        </Button>
        <div className="mt-6 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Dashboard not found.
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader
        title={data.name}
        description={editing ? 'Editing — add, remove, reorder and resize widgets.' : undefined}
      >
        <div className="flex gap-2">
          <Button variant="ghost" onClick={editing ? cancelEdit : onBack}>
            <ArrowLeft className="me-2 h-4 w-4" /> {editing ? 'Cancel' : 'Back'}
          </Button>
          {editing ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="me-2 h-4 w-4" /> Add widget
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {catalog.length === 0 ? (
                    <DropdownMenuItem disabled>No widgets available</DropdownMenuItem>
                  ) : (
                    catalog.map(([wt, def]) => (
                      <DropdownMenuItem key={wt} onClick={() => addWidget(wt)}>
                        {def.title}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={save} disabled={saving}>
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={startEdit}>
              <Pencil className="me-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </PageHeader>

      {widgets.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {editing
            ? 'Add your first widget with “Add widget” above.'
            : 'This dashboard is empty. Click Edit to add widgets.'}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
          {widgets.map((wg, i) => {
            const def = WIDGET_REGISTRY[wg.widget_type]
            return (
              <div
                key={`${wg.widget_type}-${i}`}
                style={{ gridColumn: colSpan(wg.w) }}
                className="min-w-0"
              >
                {editing && (
                  <div className="mb-1 flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title="Move up"
                      onClick={() => move(i, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title="Move down"
                      onClick={() => move(i, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex gap-0.5">
                      {SIZE_OPTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => resize(i, s.w)}
                          className={
                            'rounded px-1.5 text-[11px] ' +
                            (wg.w === s.w
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted')
                          }
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ms-auto h-6 w-6"
                      title="Remove"
                      onClick={() => removeAt(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
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
      )}
    </Main>
  )
}

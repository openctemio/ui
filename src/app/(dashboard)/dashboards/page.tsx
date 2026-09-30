'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Star, Trash2, Pencil, LayoutGrid, ExternalLink } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { DASHBOARD_TEMPLATES, templateLayout } from '@/features/dashboards/templates'
import { widthForColumns, DASHBOARD_VIEW_STORAGE_KEY } from '@/features/dashboards/layout'
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

/**
 * Dashboards manage surface (RFC-021). A dashboard here is a *container* — its
 * name, description and column layout. Editing the actual widgets (add / remove /
 * drag / resize) happens on the live dashboard view, not on this page. Users pick
 * a template or a blank, then shape each dashboard's identity + layout here and
 * open it to populate it.
 */
export default function DashboardsPage() {
  const [editId, setEditId] = useState<string | null>(null)

  if (editId) {
    return <DashboardEditForm id={editId} onBack={() => setEditId(null)} />
  }
  return <DashboardsList onEdit={setEditId} />
}

// ── Column-layout picker options ─────────────────────────────────────────────

const LAYOUT_OPTIONS: Array<{ cols: number; label: string }> = [
  { cols: 1, label: '1 column' },
  { cols: 2, label: '2 columns' },
  { cols: 3, label: '3 columns' },
  { cols: 4, label: '4 columns' },
]

function LayoutPreview({ cols, active }: { cols: number; active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-16 w-24 items-stretch gap-1 rounded-md border-2 p-1.5 transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:border-primary/40'
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-sm', active ? 'bg-primary/70' : 'bg-muted-foreground/30')}
        />
      ))}
    </div>
  )
}

// ── List + template gallery ──────────────────────────────────────────────────

function DashboardsList({ onEdit }: { onEdit: (id: string) => void }) {
  const router = useRouter()
  const { data, isLoading } = useMyDashboards()
  const revalidate = useRevalidateDashboards()
  const [busy, setBusy] = useState(false)
  const saved = data?.data ?? []

  const createFrom = async (name: string, layout: DashboardWidget[], columns = 2) => {
    setBusy(true)
    try {
      const d = await createDashboard({ name, layout, columns })
      await revalidate()
      toast.success(`Created "${name}"`)
      onEdit(d.id)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const openView = (id: string) => {
    try {
      window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, id)
    } catch {
      // best-effort — the view falls back to its own resolution
    }
    router.push('/')
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
              <Skeleton key={i} className="h-28 w-full" />
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
                      onClick={() => openView(d.id)}
                    >
                      {d.name}
                    </button>
                    {d.is_default && (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </CardTitle>
                  {d.description ? (
                    <CardDescription className="line-clamp-2">{d.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {d.layout.length} widgets · {d.columns ?? 2} cols
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => openView(d.id)}>
                      <ExternalLink className="me-2 h-4 w-4" /> Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(d.id)}>
                      <Pencil className="me-2 h-4 w-4" /> Edit
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

// ── Edit form: name + description + layout only ──────────────────────────────

function DashboardEditForm({ id, onBack }: { id: string; onBack: () => void }) {
  const router = useRouter()
  const { data, isLoading } = useMyDashboard(id)
  const revalidate = useRevalidateDashboards()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState(2)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ready || isLoading || !data) return
    setName(data.name)
    setDescription(data.description ?? '')
    setColumns(data.columns ?? 2)
    setReady(true)
  }, [ready, isLoading, data])

  const currentColumns = data?.columns ?? 2
  const widgetCount = data?.layout.length ?? 0

  const submit = async (thenOpen: boolean) => {
    if (!data) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      // Re-pick a layout only restructures widget widths; leave the widgets
      // untouched when the column count is unchanged so any view-side sizing
      // survives an edit of just the name or description.
      const layout: DashboardWidget[] =
        columns !== currentColumns
          ? data.layout.map((wg) => ({ ...wg, w: widthForColumns(columns) }))
          : data.layout
      await updateDashboard(id, { name: trimmed, description: description.trim(), columns, layout })
      await revalidate()
      toast.success('Dashboard saved')
      if (thenOpen) {
        try {
          window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, id)
        } catch {
          // best-effort
        }
        router.push('/')
      } else {
        onBack()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !ready) {
    return (
      <Main>
        <Skeleton className="h-9 w-48" />
        <div className="mx-auto mt-6 w-full max-w-3xl space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
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
        title="Edit dashboard"
        description="Set the name, description and column layout. Add and arrange widgets on the dashboard itself."
      >
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="me-2 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => submit(true)}>
            <ExternalLink className="me-2 h-4 w-4" /> Save &amp; open
          </Button>
          <Button disabled={saving} onClick={() => submit(false)}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </PageHeader>

      <div className="mx-auto mt-2 w-full max-w-3xl space-y-6">
        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="dash-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="dash-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Executive overview"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dash-desc" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="dash-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What is this dashboard for? (optional)"
              />
              <p className="text-xs text-muted-foreground">{description.length}/500</p>
            </div>
          </CardContent>
        </Card>

        {/* Layout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layout</CardTitle>
            <CardDescription>
              How many columns the dashboard is arranged in. Changing this re-flows the existing
              widgets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.cols}
                  type="button"
                  onClick={() => setColumns(opt.cols)}
                  className="flex flex-col items-center gap-1.5"
                  aria-pressed={columns === opt.cols}
                  title={opt.label}
                >
                  <LayoutPreview cols={opt.cols} active={columns === opt.cols} />
                  <span
                    className={cn(
                      'text-xs',
                      columns === opt.cols ? 'font-medium text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {opt.cols}
                  </span>
                </button>
              ))}
            </div>
            {columns !== currentColumns && widgetCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {widgetCount} widget{widgetCount === 1 ? '' : 's'} will be resized to fit {columns}{' '}
                column{columns === 1 ? '' : 's'}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

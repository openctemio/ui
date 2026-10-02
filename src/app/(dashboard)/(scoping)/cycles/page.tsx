'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, RefreshCw, CalendarClock, Lightbulb } from 'lucide-react'
import { get, post } from '@/lib/api/client'
import { toast } from 'sonner'
import { summarizeEvaluation, type CtemCycle } from '@/features/cycles'
import { CycleStatusBadge } from '@/features/cycles/components/cycle-status-badge'

interface PaginatedResponse {
  data: CtemCycle[]
  total: number
  page: number
  per_page: number
}

// Feed-forward "lessons" callout accent — a distinct info hue, not a severity/status color.
const LESSONS_CALLOUT_CLASS =
  'rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 dark:bg-amber-900/10' // palette-ok: distinct lessons info accent
const LESSONS_ICON_CLASS = 'h-4 w-4 text-amber-500' // palette-ok: distinct lessons info accent

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

// CTEM operating rhythm (https://ctem.org/docs/stages/ctem-mobilization): the
// prescribed cadence that keeps a cycle running. Purely a reference rhythm —
// no scheduler is implied; the dates are anchored to real cycle data below.
const CTEM_CADENCE = [
  {
    key: 'weekly',
    label: 'Weekly triage',
    detail: 'Review new exposures, re-prioritize, unblock owners.',
  },
  {
    key: 'monthly',
    label: 'Monthly steering',
    detail: 'Trend risk & SLA burn-down with sponsors; adjust focus.',
  },
  {
    key: 'quarterly',
    label: 'Quarterly scope refresh',
    detail: 'Revisit the charter & scope; fold in last cycle’s lessons.',
  },
] as const

// nextWeekday returns the next occurrence of the given weekday (0=Sun) from
// today, used to anchor the weekly-triage checkpoint to a real date.
function nextWeekday(weekday: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const delta = (weekday - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d
}

// firstOfNextMonth anchors the monthly-steering checkpoint.
function firstOfNextMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

export default function CtemCyclesPage() {
  const router = useRouter()
  const {
    data: response,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse>('/api/v1/ctem-cycles?per_page=100', get, {
    revalidateOnFocus: false,
  })

  const cycles = useMemo(() => response?.data ?? [], [response])

  // Feedback-to-scope loop: surface the most recent finished cycle's
  // scope-refinement notes so they visibly feed the NEXT cycle's scoping
  // (otherwise the notes are captured but never carried forward).
  const lastLessons = useMemo(() => {
    const withNotes = cycles.filter(
      (c) =>
        (c.status === 'closed' || c.status === 'review') &&
        (c.charter?.scope_refinement_notes ?? '').trim() !== ''
    )
    withNotes.sort(
      (a, b) =>
        new Date(b.end_date || b.updated_at).getTime() -
        new Date(a.end_date || a.updated_at).getTime()
    )
    return withNotes[0] ?? null
  }, [cycles])

  // The single active cycle anchors the operating-rhythm checkpoints to real
  // dates (its scope-refresh checkpoint is the cycle's own end date).
  const activeCycle = useMemo(() => cycles.find((c) => c.status === 'active') ?? null, [cycles])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  })
  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a cycle name')
      return
    }
    try {
      const created = await post<CtemCycle>('/api/v1/ctem-cycles', formData)
      await mutate()
      toast.success('Cycle created')
      setIsCreateOpen(false)
      resetForm()
      // Straight to the new cycle, where its charter is written.
      if (created?.id) router.push(`/cycles/${created.id}`)
    } catch {
      toast.error('Failed to create cycle')
    }
  }

  const columns = useMemo<ColumnDef<CtemCycle>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link href={`/cycles/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <CycleStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'start_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Start date" />,
        cell: ({ row }) => formatDate(row.original.start_date),
      },
      {
        accessorKey: 'end_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="End date" />,
        cell: ({ row }) => formatDate(row.original.end_date),
      },
      {
        id: 'criteria',
        header: () => <span>Success criteria</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const ev = row.original.charter_evaluation
          const summary = summarizeEvaluation(ev)
          if (!summary) return <span className="text-muted-foreground">-</span>
          return (
            <Link
              href={`/cycles/${row.original.id}?tab=outcome`}
              className="text-start text-sm tabular-nums hover:underline"
              title="View the success criteria outcome"
            >
              {summary}
              {ev?.completion_rate !== undefined && (
                <span className="ms-1.5 text-xs text-muted-foreground">
                  {Math.round(ev.completion_rate)}%
                </span>
              )}
            </Link>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Cycles"
          description="Plan and run CTEM cycles: the charter, the scope it freezes and the outcome it is judged by."
        >
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            New cycle
          </Button>
        </PageHeader>

        {/* CTEM operating rhythm — a lightweight, always-visible reminder of
            the prescribed cadence. Checkpoints are anchored to real dates: the
            weekly/monthly ones to the calendar, the quarterly scope refresh to
            the active cycle's end date. No scheduler is implied. One strip with
            dividers rather than a card of cards. */}
        <section aria-label="Operating rhythm" className="mt-5">
          <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-3">
            {CTEM_CADENCE.map((c) => {
              let when = ''
              if (c.key === 'weekly') when = formatDate(nextWeekday(1).toISOString())
              else if (c.key === 'monthly') when = formatDate(firstOfNextMonth().toISOString())
              else if (c.key === 'quarterly')
                when = activeCycle?.end_date ? formatDate(activeCycle.end_date) : ''
              return (
                <div key={c.key} className="-ms-px -mt-px border-s border-t px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      {c.label}
                    </span>
                    {when && <span className="text-xs text-muted-foreground">{when}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                </div>
              )
            })}
          </div>
          {!activeCycle && (
            <p className="mt-2 text-xs text-muted-foreground">
              Activate a cycle to anchor the quarterly scope-refresh checkpoint to its end date.
            </p>
          )}
        </section>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2 rounded-xl border p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : cycles.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No cycles yet"
              description="A cycle binds the charter, the scope it freezes and the outcome it is judged by. Create one to start."
            />
          ) : (
            <DataTable
              columns={columns}
              data={cycles}
              onRowClick={(cycle) => router.push(`/cycles/${cycle.id}`)}
              searchPlaceholder="Search cycles..."
              emptyMessage="No cycles found"
              emptyDescription="No cycles match the current search."
            />
          )}
        </div>
      </Main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New CTEM cycle</DialogTitle>
            <DialogDescription>
              Start a new continuous threat exposure management cycle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Feed-forward: the last finished cycle's scope-refinement notes,
                shown read-only so the lessons visibly inform this new cycle's
                scope instead of being copied by hand. */}
            {lastLessons && (
              <div className={LESSONS_CALLOUT_CLASS}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className={LESSONS_ICON_CLASS} />
                  Lessons from {lastLessons.name}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {lastLessons.charter?.scope_refinement_notes}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Carry the relevant items into this cycle&rsquo;s scope and charter.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q2 2026 CTEM Cycle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of cycle goals"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

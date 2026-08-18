'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Play,
  Eye,
  CheckCircle,
  RefreshCw,
  ScrollText,
  NotebookPen,
  CalendarClock,
  Lightbulb,
} from 'lucide-react'
import { get, post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { toast } from 'sonner'
import { CharterEditorSheet, type CtemCycle } from '@/features/cycles'

interface PaginatedResponse {
  data: CtemCycle[]
  total: number
  page: number
  per_page: number
}

const statusColors: Record<CtemCycle['status'], string> = {
  planning:
    'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-900/30 dark:text-blue-400',
  active:
    'bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-900/30 dark:text-green-400', // palette-ok: distinct cycle-status accent
  review:
    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:bg-yellow-900/30 dark:text-yellow-400', // palette-ok: distinct cycle-status accent
  closed: 'bg-muted text-muted-foreground',
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
  const {
    data: response,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse>('/api/v1/ctem-cycles?per_page=100', get, {
    revalidateOnFocus: false,
  })

  const cycles = response?.data ?? []

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
  // F-10: confirm state for destructive / irreversible cycle transitions.
  const [pendingAction, setPendingAction] = useState<{
    id: string
    action: 'activate' | 'review' | 'close'
    cycleName: string
  } | null>(null)
  // Cycle whose charter is being viewed/edited in the side sheet.
  const [charterCycle, setCharterCycle] = useState<CtemCycle | null>(null)
  // Cycle whose scope-refinement notes (feedback-to-scope) are being edited.
  const [scopeCycle, setScopeCycle] = useState<CtemCycle | null>(null)
  const [scopeNotes, setScopeNotes] = useState('')
  const [savingScope, setSavingScope] = useState(false)

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' })
  }

  const openScopeRefinement = (cycle: CtemCycle) => {
    setScopeNotes(cycle.charter?.scope_refinement_notes ?? '')
    setScopeCycle(cycle)
  }

  const handleSaveScopeRefinement = async () => {
    if (!scopeCycle) return
    setSavingScope(true)
    try {
      await post(`/api/v1/ctem-cycles/${scopeCycle.id}/scope-refinement`, {
        scope_refinement_notes: scopeNotes,
      })
      await mutate()
      toast.success('Scope refinement notes saved')
      setScopeCycle(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save scope refinement notes'))
    } finally {
      setSavingScope(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a cycle name')
      return
    }
    try {
      await post('/api/v1/ctem-cycles', formData)
      await mutate()
      toast.success('CTEM cycle created')
      setIsCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create cycle')
    }
  }

  const handleStatusChange = async (id: string, action: 'activate' | 'review' | 'close') => {
    // Cycle transitions have dedicated endpoints that also snapshot scope
    // (activate) and enforce close gates. A plain PATCH {status} does NOT
    // transition the cycle — it hits the metadata Update handler, which
    // blanks the name and only matches WHERE status='planning'.
    const endpointMap = { activate: 'activate', review: 'start-review', close: 'close' } as const
    const successMap = {
      activate: 'Cycle activated',
      review: 'Cycle moved to review',
      close: 'Cycle closed',
    } as const
    try {
      await post(`/api/v1/ctem-cycles/${id}/${endpointMap[action]}`)
      await mutate()
      toast.success(successMap[action])
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update cycle status'))
    }
  }

  // F-10: copy shown in the confirmation dialog for each transition.
  const confirmCopy: Record<
    'activate' | 'review' | 'close',
    { title: string; body: string; actionLabel: string }
  > = {
    activate: {
      title: 'Activate this cycle?',
      body: 'Activating freezes the current asset scope into an immutable snapshot. This is an expensive operation and the scope cannot be changed afterwards.',
      actionLabel: 'Activate',
    },
    review: {
      title: 'Move to review?',
      body: 'The cycle will stop accepting new findings into scope and enter the review phase. You can still close it afterwards.',
      actionLabel: 'Start Review',
    },
    close: {
      title: 'Close this cycle?',
      body: 'Closing is irreversible. The cycle and its scope snapshot become read-only archive data.',
      actionLabel: 'Close Cycle',
    },
  }

  const confirmStatusChange = async () => {
    if (!pendingAction) return
    const { id, action } = pendingAction
    setPendingAction(null)
    await handleStatusChange(id, action)
  }

  const columns = useMemo<ColumnDef<CtemCycle>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant="outline" className={statusColors[row.original.status]}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'start_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.start_date),
      },
      {
        accessorKey: 'end_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.end_date),
      },
      {
        id: 'actions',
        header: () => <div className="text-end">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const cycle = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCharterCycle(cycle)}
                title={cycle.status === 'planning' ? 'Edit charter' : 'View charter'}
              >
                <ScrollText className="me-1 h-3 w-3" />
                Charter
              </Button>
              {cycle.status === 'planning' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingAction({
                      id: cycle.id,
                      action: 'activate',
                      cycleName: cycle.name,
                    })
                  }
                >
                  <Play className="me-1 h-3 w-3" />
                  Activate
                </Button>
              )}
              {cycle.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingAction({
                      id: cycle.id,
                      action: 'review',
                      cycleName: cycle.name,
                    })
                  }
                >
                  <Eye className="me-1 h-3 w-3" />
                  Start Review
                </Button>
              )}
              {(cycle.status === 'review' || cycle.status === 'closed') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openScopeRefinement(cycle)}
                  title="Record scope-refinement notes (feedback to next cycle's scope)"
                >
                  <NotebookPen className="me-1 h-3 w-3" />
                  Scope Notes
                </Button>
              )}
              {cycle.status === 'review' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingAction({
                      id: cycle.id,
                      action: 'close',
                      cycleName: cycle.name,
                    })
                  }
                >
                  <CheckCircle className="me-1 h-3 w-3" />
                  Close
                </Button>
              )}
              {cycle.status === 'closed' && (
                <Badge variant="outline" className="text-xs">
                  Completed
                </Badge>
              )}
            </div>
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
          title="CTEM Cycles"
          description="Manage continuous threat exposure management cycles"
        >
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            New Cycle
          </Button>
        </PageHeader>

        {/* CTEM operating rhythm — a lightweight, always-visible reminder of
            the prescribed cadence. Checkpoints are anchored to real dates: the
            weekly/monthly ones to the calendar, the quarterly scope refresh to
            the active cycle's end date. No scheduler is implied. */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Operating rhythm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {CTEM_CADENCE.map((c) => {
                let when = ''
                if (c.key === 'weekly') when = formatDate(nextWeekday(1).toISOString())
                else if (c.key === 'monthly') when = formatDate(firstOfNextMonth().toISOString())
                else if (c.key === 'quarterly')
                  when = activeCycle?.end_date ? formatDate(activeCycle.end_date) : ''
                return (
                  <div key={c.key} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{c.label}</span>
                      {when && (
                        <Badge variant="outline" className="text-xs">
                          {when}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                )
              })}
            </div>
            {!activeCycle && (
              <p className="mt-3 text-xs text-muted-foreground">
                Activate a cycle to anchor the quarterly scope-refresh checkpoint to its end date.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cycles.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title="No CTEM cycles yet."
                description="Create one to get started."
                card={false}
              />
            ) : (
              <DataTable
                columns={columns}
                data={cycles}
                searchPlaceholder="Search cycles..."
                emptyMessage="No cycles found"
                emptyDescription="No cycles match the current search."
              />
            )}
          </CardContent>
        </Card>
      </Main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CTEM Cycle</DialogTitle>
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
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
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

      {/* F-10: ConfirmDialog for irreversible cycle transitions. */}
      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction ? confirmCopy[pendingAction.action].title : ''}
        desc={
          pendingAction ? (
            <>
              <span className="block font-medium text-foreground">
                Cycle: {pendingAction.cycleName}
              </span>
              <span className="block mt-2">{confirmCopy[pendingAction.action].body}</span>
            </>
          ) : (
            ''
          )
        }
        confirmText={pendingAction ? confirmCopy[pendingAction.action].actionLabel : ''}
        handleConfirm={confirmStatusChange}
      />

      <CharterEditorSheet
        cycle={charterCycle}
        open={charterCycle !== null}
        onOpenChange={(open) => !open && setCharterCycle(null)}
        onSaved={() => mutate()}
      />

      {/* Feedback-to-scope: record what the review/close learned about scope. */}
      <Dialog open={scopeCycle !== null} onOpenChange={(open) => !open && setScopeCycle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scope refinement &amp; lessons</DialogTitle>
            <DialogDescription>
              {scopeCycle ? `${scopeCycle.name} — ` : ''}
              what this cycle taught you about scope: gaps to add, items to exclude next time,
              lessons for the next charter. Feeds the next cycle&rsquo;s scoping.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scope-notes">Notes</Label>
            <Textarea
              id="scope-notes"
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
              placeholder="e.g. Add exposed RDP to scope next cycle; the legacy VPN exclusion held up."
              rows={6}
              disabled={savingScope}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScopeCycle(null)} disabled={savingScope}>
              Cancel
            </Button>
            <Button onClick={handleSaveScopeRefinement} disabled={savingScope}>
              {savingScope ? 'Saving…' : 'Save notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

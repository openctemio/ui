'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, CalendarClock, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DataTable, EmptyState } from '@/features/shared'
import { RelativeTime } from '@/features/shared/components/relative-time'
import { Can } from '@/lib/permissions'
import { useReportSchedules } from '../hooks/use-report-schedules'
import { humanizeCron } from '../lib/cron'
import { NewScheduleDialog } from './new-schedule-dialog'
import type { ReportSchedule } from '../types'

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive summary',
  summary: 'Summary digest',
  findings: 'Findings digest',
}

function statusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'no_recipients':
    case 'unsupported':
      return 'outline'
    default:
      return 'secondary'
  }
}

function LastRunCell({ schedule }: { schedule: ReportSchedule }) {
  if (!schedule.last_run_at) {
    return <span className="text-muted-foreground">Never</span>
  }
  return (
    <div className="flex flex-col gap-1">
      <RelativeTime date={schedule.last_run_at} className="text-sm" />
      {schedule.last_status && (
        <Badge variant={statusVariant(schedule.last_status)} className="w-fit text-xs">
          {schedule.last_status.replace(/_/g, ' ')}
        </Badge>
      )}
    </div>
  )
}

export function ReportSchedulesSection() {
  const { schedules, isLoading, error, createSchedule, toggleSchedule, deleteSchedule } =
    useReportSchedules()
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggle = useCallback(
    async (schedule: ReportSchedule) => {
      setPendingToggle(schedule.id)
      try {
        await toggleSchedule(schedule.id, !schedule.is_active)
        toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule activated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update schedule')
      } finally {
        setPendingToggle(null)
      }
    },
    [toggleSchedule]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      try {
        await deleteSchedule(id)
        toast.success('Schedule deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete schedule')
      } finally {
        setDeletingId(null)
      }
    },
    [deleteSchedule]
  )

  const columns: ColumnDef<ReportSchedule>[] = [
    {
      accessorKey: 'name',
      enableSorting: false,
      header: 'Name',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'report_type',
      enableSorting: false,
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm">
          {REPORT_TYPE_LABELS[row.original.report_type] ?? row.original.report_type}
        </span>
      ),
    },
    {
      id: 'cadence',
      enableSorting: false,
      header: 'Cadence',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{humanizeCron(row.original.cron_expression)}</span>
          <span className="text-xs text-muted-foreground">{row.original.timezone}</span>
        </div>
      ),
    },
    {
      id: 'recipients',
      enableSorting: false,
      header: 'Recipients',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.recipients?.length ?? 0}</span>
      ),
    },
    {
      id: 'active',
      enableSorting: false,
      header: 'Active',
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <Can permission="reports:write" mode="disable" disabledTooltip="Requires reports:write">
            <Switch
              checked={schedule.is_active}
              disabled={pendingToggle === schedule.id}
              onCheckedChange={() => handleToggle(schedule)}
              aria-label={schedule.is_active ? 'Deactivate schedule' : 'Activate schedule'}
            />
          </Can>
        )
      },
    },
    {
      id: 'last_run',
      enableSorting: false,
      header: 'Last run',
      cell: ({ row }) => <LastRunCell schedule={row.original} />,
    },
    {
      id: 'next_run',
      enableSorting: false,
      header: 'Next run',
      cell: ({ row }) =>
        row.original.next_run_at && row.original.is_active ? (
          <RelativeTime date={row.original.next_run_at} className="text-sm" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <Can permission="reports:write">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={deletingId === schedule.id}
                  aria-label={`Delete ${schedule.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{schedule.name}&rdquo; will stop sending. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(schedule.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Can>
        )
      },
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Scheduled reports</h2>
          <p className="text-sm text-muted-foreground">
            Recurring finding-summary digests emailed to recipients on a cron cadence.
          </p>
        </div>
        {schedules.length > 0 && (
          <Can permission="reports:write">
            <NewScheduleDialog onCreate={createSchedule} />
          </Can>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-px overflow-hidden rounded-xl border">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load schedules</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </AlertDescription>
        </Alert>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled reports yet"
          description="Create a schedule to email a recurring finding-summary digest to your team."
          action={
            <Can permission="reports:write">
              <NewScheduleDialog onCreate={createSchedule} />
            </Can>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={schedules}
          getRowId={(s) => s.id}
          showSearch={false}
          showColumnToggle={false}
          showPagination={schedules.length > 10}
          emptyMessage="No scheduled reports"
        />
      )}
    </section>
  )
}

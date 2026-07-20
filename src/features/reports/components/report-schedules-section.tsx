'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { EmptyState } from '@/features/shared'
import { RelativeTime } from '@/features/shared/components/relative-time'
import { Can } from '@/lib/permissions'
import { useReportSchedules } from '../hooks/use-report-schedules'
import { humanizeCron } from '../lib/cron'
import { NewScheduleDialog } from './new-schedule-dialog'
import type { ReportSchedule } from '../types'

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  summary: 'Summary Digest',
  findings: 'Findings Digest',
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Scheduled reports</CardTitle>
          <CardDescription>
            Recurring finding-summary digests emailed to recipients on a cron cadence.
          </CardDescription>
        </div>
        <Can permission="reports:write">
          <NewScheduleDialog onCreate={createSchedule} />
        </Can>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">Failed to load schedules.</p>
        ) : schedules.length === 0 ? (
          <EmptyState
            card={false}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      {REPORT_TYPE_LABELS[schedule.report_type] ?? schedule.report_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{humanizeCron(schedule.cron_expression)}</span>
                        <span className="text-xs text-muted-foreground">{schedule.timezone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{schedule.recipients?.length ?? 0}</TableCell>
                    <TableCell>
                      <Can
                        permission="reports:write"
                        mode="disable"
                        disabledTooltip="Requires reports:write"
                      >
                        <Switch
                          checked={schedule.is_active}
                          disabled={pendingToggle === schedule.id}
                          onCheckedChange={() => handleToggle(schedule)}
                          aria-label={
                            schedule.is_active ? 'Deactivate schedule' : 'Activate schedule'
                          }
                        />
                      </Can>
                    </TableCell>
                    <TableCell>
                      <LastRunCell schedule={schedule} />
                    </TableCell>
                    <TableCell>
                      {schedule.next_run_at && schedule.is_active ? (
                        <RelativeTime date={schedule.next_run_at} className="text-sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permission="reports:write">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
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
                                &ldquo;{schedule.name}&rdquo; will stop sending. This cannot be
                                undone.
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

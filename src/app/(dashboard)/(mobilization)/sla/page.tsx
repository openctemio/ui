'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertOctagon, AlertTriangle, Clock, CheckCircle2, Timer } from 'lucide-react'

import { Main } from '@/components/layout'
import {
  PageHeader,
  StatsCard,
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  SeverityBadge,
} from '@/features/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format-date'
import { SEVERITY_DOT_COLORS, SEVERITY_ORDER, type SeverityLevel } from '@/lib/severity-colors'

import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { ApiFinding } from '@/features/findings/api/finding-api.types'
import { SlaStatusBadge } from '@/features/sla/components/sla-status-badge'
import { AGING_BUCKETS, agingBucketFor, formatDueRelative, isBreach } from '@/features/sla/lib/sla'

// Terminal statuses are dropped: an SLA breach is only actionable while the
// finding is still open.
const OPEN_FINDINGS_FILTER = {
  exclude_statuses: [
    'resolved',
    'false_positive',
    'accepted',
    'accepted_risk',
    'duplicate',
    'verified',
  ],
  // MaxPerPage on the API is 100. There is no server-side sla_status filter yet
  // (see note in the UI), so we score one prioritized page client-side rather
  // than paginating the whole finding set.
  per_page: 100,
  page: 1,
}

function StatCardSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function SlaBreachBoardPage() {
  const router = useRouter()
  const { data, isLoading } = useFindingsApi(OPEN_FINDINGS_FILTER)

  const findings = useMemo(() => data?.data ?? [], [data])
  const loadedTotal = findings.length
  const serverTotal = data?.total ?? 0

  const counts = useMemo(() => {
    const c = { exceeded: 0, overdue: 0, warning: 0, on_track: 0, not_applicable: 0 }
    for (const f of findings) {
      const s = (f.sla_status as keyof typeof c) || 'not_applicable'
      if (s in c) c[s] += 1
    }
    return c
  }, [findings])

  const breached = useMemo(() => findings.filter((f) => isBreach(f.sla_status)), [findings])

  const breachBySeverity = useMemo(() => {
    const m = new Map<SeverityLevel, number>()
    for (const f of breached) {
      const sev = f.severity as SeverityLevel
      m.set(sev, (m.get(sev) ?? 0) + 1)
    }
    return SEVERITY_ORDER.map((sev) => ({ sev, count: m.get(sev) ?? 0 })).filter((r) => r.count > 0)
  }, [breached])

  const agingCounts = useMemo(() => {
    return AGING_BUCKETS.map((bucket) => ({
      bucket,
      count: breached.filter((f) => agingBucketFor(f.sla_deadline)?.label === bucket.label).length,
    }))
  }, [breached])

  const columns = useMemo<ColumnDef<ApiFinding>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => (
          <span className="line-clamp-1 font-medium">
            {row.original.title || row.original.message}
          </span>
        ),
      },
      {
        id: 'asset',
        header: 'Asset',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.asset?.name || row.original.asset_id}
          </span>
        ),
      },
      {
        accessorKey: 'sla_status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="SLA" />,
        cell: ({ row }) => <SlaStatusBadge status={row.original.sla_status} />,
      },
      {
        id: 'due',
        header: 'Overdue',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-destructive">
            {formatDueRelative(row.original.sla_deadline)}
          </span>
        ),
      },
      {
        id: 'detected',
        header: 'Detected',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatRelative(row.original.first_detected_at)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <Main>
      <PageHeader
        title="SLA Compliance"
        description="Open findings tracked against their remediation SLA deadlines."
      />

      {isLoading ? (
        <div className="mt-6 space-y-6">
          <StatCardSkeletons />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="SLA Exceeded"
              value={counts.exceeded}
              icon={AlertOctagon}
              valueClassName={counts.exceeded > 0 ? 'text-destructive' : undefined}
              description="Well past deadline"
            />
            <StatsCard
              title="Overdue"
              value={counts.overdue}
              icon={AlertTriangle}
              valueClassName={counts.overdue > 0 ? 'text-destructive' : undefined}
              description="Past deadline"
            />
            <StatsCard
              title="Warning"
              value={counts.warning}
              icon={Clock}
              description="Approaching deadline"
            />
            <StatsCard
              title="On Track"
              value={counts.on_track}
              icon={CheckCircle2}
              description="Within SLA"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Breaches by severity</CardTitle>
                <CardDescription>Overdue and exceeded findings, by severity.</CardDescription>
              </CardHeader>
              <CardContent>
                {breachBySeverity.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No breached findings.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {breachBySeverity.map(({ sev, count }) => (
                      <div key={sev} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_DOT_COLORS[sev])}
                          />
                          <span className="text-sm capitalize">{sev}</span>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aging of breaches</CardTitle>
                <CardDescription>How long breached findings have been past due.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agingCounts.map(({ bucket, count }) => (
                    <div key={bucket.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{bucket.label}</span>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2">
            <div>
              <h2 className="text-lg font-semibold">Breached findings</h2>
              <p className="text-sm text-muted-foreground">
                Overdue and exceeded open findings. Scored from the top {loadedTotal} of{' '}
                {serverTotal} open findings by priority — a server-side{' '}
                <code className="text-xs">?sla_status=</code> filter is a planned follow-up so the
                board can cover the full set.
              </p>
            </div>
            {breached.length === 0 ? (
              <EmptyState
                icon={Timer}
                title="No SLA breaches"
                description="No open findings are past their remediation deadline in the current scope."
              />
            ) : (
              <DataTable
                columns={columns}
                data={breached}
                searchKey="title"
                searchPlaceholder="Search findings..."
                pageSize={10}
                onRowClick={(row) => router.push(`/findings/${row.id}`)}
              />
            )}
          </section>
        </div>
      )}
    </Main>
  )
}

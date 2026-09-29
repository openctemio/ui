'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Timer } from 'lucide-react'

import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
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
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => (
          <span className="line-clamp-1 font-medium">
            {row.original.title || row.original.message}
          </span>
        ),
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
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
        title="SLA compliance"
        description="Open findings tracked against their remediation SLA deadlines."
      />

      <MetricStrip
        className="mt-5"
        loading={isLoading}
        items={[
          {
            key: 'exceeded',
            label: 'SLA exceeded',
            value: counts.exceeded,
            hint: 'well past deadline',
            tone: 'danger',
          },
          {
            key: 'overdue',
            label: 'Overdue',
            value: counts.overdue,
            hint: 'past deadline',
            tone: 'danger',
          },
          { key: 'warning', label: 'Warning', value: counts.warning, hint: 'due soon' },
          { key: 'on_track', label: 'On track', value: counts.on_track, hint: 'within SLA' },
        ]}
      />

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Breaches by severity</CardTitle>
            <CardDescription>Overdue and exceeded findings, by severity.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : breachBySeverity.length === 0 ? (
              <EmptyState
                card={false}
                className="py-6"
                icon={CheckCircle2}
                title="No breached findings"
              />
            ) : (
              <div className="space-y-3">
                {breachBySeverity.map(({ sev, count }) => (
                  <div key={sev} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_DOT_COLORS[sev])} />
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
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3">
                {agingCounts.map(({ bucket, count }) => (
                  <div key={bucket.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{bucket.label}</span>
                    <span className="text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Breached findings</h2>
          <p className="text-sm text-muted-foreground">
            Scored from the top {loadedTotal} of {serverTotal} open findings by priority.
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : breached.length === 0 ? (
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
    </Main>
  )
}

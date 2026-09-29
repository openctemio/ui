'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight } from 'lucide-react'
import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
  DataTable,
  DataTableColumnHeader,
  type MetricStripItem,
} from '@/features/shared'
import { SeverityBadge } from '@/features/shared/components/severity-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format-date'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { ApiFinding, FindingApiFilters } from '@/features/findings/api/finding-api.types'

const OPEN_EXCLUDE = [
  'resolved',
  'false_positive',
  'accepted',
  'duplicate',
  'verified',
  'accepted_risk',
]

/** The queue shows the top of the list; "View all" opens Findings filtered to me. */
const QUEUE_SIZE = 15

function findingName(f: ApiFinding): string {
  return f.title || f.rule_name || f.message || 'Untitled finding'
}

function prettyStatus(s: string): string {
  const text = s.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function MyWorkPage() {
  const router = useRouter()
  const queueFilters: FindingApiFilters = {
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sort: 'priority_class,severity,-created_at',
    per_page: QUEUE_SIZE,
  }
  const { data: queue, isLoading } = useFindingsApi(queueFilters)
  const { data: critical } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    severities: ['critical', 'high'],
    per_page: 1,
  })
  const { data: overdue } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sla_statuses: ['overdue', 'exceeded'],
    per_page: 1,
  })

  const openTotal = queue?.total ?? 0
  const rows = useMemo(() => queue?.data ?? [], [queue])

  // Each metric opens Findings with the matching filter (this page is a
  // read-only queue; the full list and its filters live on Findings).
  const metrics: MetricStripItem[] = [
    {
      key: 'open',
      label: 'Open · assigned to me',
      value: openTotal,
      onClick: () => router.push('/findings?mine=true'),
    },
    {
      key: 'critical',
      label: 'Critical / high',
      value: critical?.total ?? 0,
      tone: 'danger',
      onClick: () => router.push('/findings?mine=true&priority=P0'),
    },
    {
      key: 'overdue',
      label: 'Overdue (SLA)',
      value: overdue?.total ?? 0,
      tone: 'danger',
      onClick: () => router.push('/findings?mine=true&sla_status=overdue'),
    },
  ]

  const columns = useMemo<ColumnDef<ApiFinding>[]>(
    () => [
      {
        accessorKey: 'title',
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => {
          const f = row.original
          return (
            <div className="min-w-0 max-w-[520px]">
              <p className="truncate text-sm font-medium">{findingName(f)}</p>
              {f.asset?.name && (
                <p className="truncate text-xs text-muted-foreground">{f.asset.name}</p>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'severity',
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'status',
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{prettyStatus(row.original.status)}</span>
        ),
      },
      {
        id: 'sla',
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="SLA" />,
        cell: ({ row }) => {
          const sla = (row.original.sla_status || '').toLowerCase()
          if (sla === 'overdue' || sla === 'exceeded') {
            return <Badge variant="destructive">Overdue</Badge>
          }
          if (sla === 'warning') return <Badge variant="secondary">Due soon</Badge>
          return <span className="text-sm text-muted-foreground">—</span>
        },
      },
      {
        accessorKey: 'created_at',
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatRelative(row.original.created_at)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <Main>
      <PageHeader
        title="My work"
        description="Findings assigned to you or on assets you own — your triage queue."
      />

      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            showSearch={false}
            showColumnToggle={false}
            showPagination={false}
            pageSize={QUEUE_SIZE}
            getRowId={(f) => f.id}
            onRowClick={(f) => router.push(`/findings/${f.id}`)}
            toolbarStart={
              <span className="text-sm text-muted-foreground">
                {openTotal > rows.length
                  ? `Top ${rows.length} of ${openTotal.toLocaleString()} by priority`
                  : 'Ordered by priority'}
              </span>
            }
            toolbarEnd={
              <Button variant="outline" size="sm" asChild>
                <Link href="/findings?mine=true">
                  View all
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
            }
            emptyMessage="You're all caught up"
            emptyDescription="Nothing is assigned to you right now. Findings assigned to you, or on assets you own, appear here."
          />
        )}
      </div>
    </Main>
  )
}

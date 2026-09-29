'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Radar, RotateCcw, ShieldCheck } from 'lucide-react'
import { PageHeader, DataTable, DataTableColumnHeader, EmptyState } from '@/features/shared'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useRecentDetections,
  IOC_TYPE_LABELS,
  type IOCMatch,
  type IOCType,
} from '../api/use-iocs-api'

// Detections view — the tenant-wide Detect/Respond feed. Each row is a runtime
// detection (from an EDR/XDR/SIEM forwarder via /telemetry-events) that matched
// a known indicator; `reopened` shows whether it auto-reopened the source
// finding. Backed by GET /api/v1/iocs/matches.
export function DetectionsPanel() {
  const { data, isLoading, error } = useRecentDetections(100)
  const rows = useMemo(() => data?.items ?? [], [data])

  const columns = useMemo<ColumnDef<IOCMatch>[]>(
    () => [
      {
        accessorKey: 'matched_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Detected" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {new Date(row.original.matched_at).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'ioc_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Indicator" />,
        cell: ({ row }) => {
          const t = row.original.ioc_type as IOCType | undefined
          return (
            <div className="flex items-center gap-2">
              {t && <Badge variant="outline">{IOC_TYPE_LABELS[t] ?? t}</Badge>}
              <span className="font-mono text-sm">{row.original.ioc_value ?? '—'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'reopened',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Response" />,
        cell: ({ row }) =>
          row.original.reopened ? (
            <Badge variant="destructive" className="gap-1">
              <RotateCcw className="size-3" /> Finding reopened
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" /> Logged
            </Badge>
          ),
      },
      {
        accessorKey: 'finding_title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => {
          const { finding_id, finding_title } = row.original
          if (!finding_id) return <span className="text-muted-foreground">—</span>
          return (
            <Link
              href={`/findings/${finding_id}`}
              className="text-primary max-w-xs truncate hover:underline"
            >
              {finding_title || finding_id}
            </Link>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detections"
        description="Runtime detections from your EDR/XDR/SIEM that matched a known indicator. A match on an indicator tied to a resolved finding auto-reopens it — closing the detect-and-respond loop."
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error || rows.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No detections yet"
          description="When a SIEM/EDR forwarder posts a runtime detection that matches an indicator in your catalogue, it appears here. Configure a collector agent to forward detections to /telemetry-events."
        />
      ) : (
        <DataTable columns={columns} data={rows} />
      )}
    </div>
  )
}

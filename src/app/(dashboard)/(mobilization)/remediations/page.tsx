'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  SeverityBadge,
  type Severity,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Can, Permission } from '@/lib/permissions'
import {
  useRemediationGroups,
  ResolveGroupDialog,
  CreateCampaignFromGroupDialog,
  type RemediationGroup,
} from '@/features/remediation-groups'

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function SeverityBreakdown({ group }: { group: RemediationGroup }) {
  const present = SEVERITY_ORDER.filter((s) => (group.severity_counts[s] ?? 0) > 0)
  if (present.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {present.map((s) => (
        <span key={s} className="inline-flex items-center gap-1">
          <SeverityBadge severity={s} />
          <span className="text-xs tabular-nums">{group.severity_counts[s]}</span>
        </span>
      ))}
    </div>
  )
}

export default function RemediationsPage() {
  const { data, isLoading, mutate } = useRemediationGroups()
  const groups = useMemo(() => data?.groups ?? [], [data])

  const [selected, setSelected] = useState<RemediationGroup | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [campaignGroup, setCampaignGroup] = useState<RemediationGroup | null>(null)
  const [campaignOpen, setCampaignOpen] = useState(false)

  const openResolve = (g: RemediationGroup) => {
    setSelected(g)
    setDialogOpen(true)
  }

  const openCampaign = (g: RemediationGroup) => {
    setCampaignGroup(g)
    setCampaignOpen(true)
  }

  const columns = useMemo<ColumnDef<RemediationGroup>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fix" />,
        cell: ({ row }) => (
          <span className="max-w-md truncate font-medium" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: 'finding_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.finding_count}</span>,
      },
      {
        accessorKey: 'asset_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.asset_count}</span>,
      },
      {
        id: 'severity',
        header: 'Severity',
        cell: ({ row }) => <SeverityBreakdown group={row.original} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Can permission={Permission.RemediationWrite}>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => openCampaign(row.original)}>
                Track as campaign
              </Button>
              <Button size="sm" onClick={() => openResolve(row.original)}>
                Resolve all
              </Button>
            </div>
          </Can>
        ),
      },
    ],
    []
  )

  return (
    <Main>
      <PageHeader
        title="Remediations"
        description="One fix, many findings — resolve a whole solution family in a single action."
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={groups}
          searchPlaceholder="Search remediations..."
          emptyMessage="No remediation groups yet"
          emptyDescription="Groups appear once findings that share a fix (a patch or dependency upgrade) are ingested."
        />
      )}

      <ResolveGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selected}
        onSuccess={() => mutate()}
      />

      <CreateCampaignFromGroupDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        group={campaignGroup}
      />
    </Main>
  )
}

'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageHeader,
  RelativeTime,
  StackedCell,
} from '@/features/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Can, Permission } from '@/lib/permissions'
import { GitMerge, Check, X, CopyCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDedupReviews,
  approveDedupReview,
  rejectDedupReview,
  type DedupReview,
} from '../api/use-asset-dedup'

// DedupReviewPage surfaces the identity/dedup pipeline that was previously
// invisible: the correlator enqueues a pending review when several assets share
// identity, and an operator approves (merge) or rejects (keep separate). The
// backend + hooks already existed; this is the missing operator UI.
export function DedupReviewPage() {
  const { data, isLoading, error, mutate } = useDedupReviews()
  const [busyId, setBusyId] = useState<string | null>(null)

  const reviews = data?.data ?? []

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      if (action === 'approve') {
        await approveDedupReview(id)
        toast.success('Duplicates merged')
      } else {
        await rejectDedupReview(id)
        toast.success('Kept as separate assets')
      }
      await mutate()
    } catch {
      toast.error(`Failed to ${action} review`)
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo<ColumnDef<DedupReview>[]>(
    () => [
      {
        accessorKey: 'normalized_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Identity" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.normalized_name}</div>
            <Badge variant="outline" className="mt-1">
              {row.original.asset_type}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'keep_asset_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Keep" />,
        cell: ({ row }) => (
          <StackedCell
            primary={row.original.keep_asset_name}
            secondary={`${row.original.keep_finding_count} finding${
              row.original.keep_finding_count === 1 ? '' : 's'
            }`}
          />
        ),
      },
      {
        id: 'merge',
        header: 'Merge into it',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <div className="flex flex-wrap gap-1">
              {row.original.merge_asset_names.map((name, i) => (
                <Badge key={i} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {row.original.merge_asset_ids.length} asset
              {row.original.merge_asset_ids.length === 1 ? '' : 's'} ·{' '}
              {row.original.merge_finding_count} finding
              {row.original.merge_finding_count === 1 ? '' : 's'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Flagged" />,
        cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
      },
      {
        id: 'actions',
        header: () => <div className="text-end">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Can permission={Permission.AssetsWrite}>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.original.id}
                onClick={() => act(row.original.id, 'reject')}
              >
                <X className="me-1 h-3.5 w-3.5" />
                Keep separate
              </Button>
              <Button
                size="sm"
                disabled={busyId === row.original.id}
                onClick={() => act(row.original.id, 'approve')}
              >
                <GitMerge className="me-1 h-3.5 w-3.5" />
                Merge
              </Button>
            </div>
          </Can>
        ),
      },
    ],
    // act is stable within a render; busyId drives the disabled state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId]
  )

  return (
    <Main>
      <PageHeader
        title="Duplicate Review"
        description="Approve or reject asset merges the correlator flagged as likely duplicates."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Failed to load duplicate reviews.
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={CopyCheck}
          title="No duplicates to review"
          description="The correlator hasn't flagged any assets as likely duplicates."
        />
      ) : (
        <DataTable columns={columns} data={reviews} searchPlaceholder="Search reviews..." />
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3" />
        Merging preserves findings from all assets on the kept asset; rejecting leaves them
        separate.
      </p>
    </Main>
  )
}

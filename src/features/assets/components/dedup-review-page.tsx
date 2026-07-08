'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can, Permission } from '@/lib/permissions'
import { GitMerge, Check, X, CopyCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useDedupReviews, approveDedupReview, rejectDedupReview } from '../api/use-asset-dedup'

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
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CopyCheck className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No duplicates to review</p>
            <p className="text-sm text-muted-foreground">
              The correlator hasn&apos;t flagged any assets as likely duplicates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identity</TableHead>
                  <TableHead>Keep</TableHead>
                  <TableHead>Merge into it</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.normalized_name}</div>
                      <Badge variant="outline" className="mt-1">
                        {r.asset_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.keep_asset_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.keep_finding_count} finding{r.keep_finding_count === 1 ? '' : 's'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.merge_asset_names.map((name, i) => (
                          <Badge key={i} variant="secondary">
                            {name}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.merge_asset_ids.length} asset{r.merge_asset_ids.length === 1 ? '' : 's'}{' '}
                        · {r.merge_finding_count} finding{r.merge_finding_count === 1 ? '' : 's'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Can permission={Permission.AssetsWrite}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, 'reject')}
                          >
                            <X className="me-1 h-3.5 w-3.5" />
                            Keep separate
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, 'approve')}
                          >
                            <GitMerge className="me-1 h-3.5 w-3.5" />
                            Merge
                          </Button>
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3" />
        Merging preserves findings from all assets on the kept asset; rejecting leaves them
        separate.
      </p>
    </Main>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Search, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { SeverityBadge } from '@/features/shared'
import { useFindingGroups, type FindingGroup } from '../api/use-finding-groups'
import { usePermissions } from '@/context/permission-provider'

interface VerifyResponse {
  updated: number
  failed: number
  errors?: string[]
}

export function PendingReviewTab() {
  const { hasPermission } = usePermissions()
  const canVerify = hasPermission('findings:verify')

  const { data, isLoading, mutate } = useFindingGroups({
    group_by: 'cve_id',
    statuses: 'fix_applied',
  })

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<FindingGroup | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const groups = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  const handleVerify = async (group: FindingGroup) => {
    if (!canVerify) {
      toast.error('You do not have permission to verify findings')
      return
    }

    setIsProcessing(group.group_key)
    try {
      // Verify all fix_applied findings matching this CVE
      const result = await post<{ updated: number }>('/api/v1/finding-actions/verify', {
        filter: { cve_ids: [group.group_key] },
        note: `Batch verified: ${group.label}`,
      })

      toast.success(`${result.updated} findings verified`)
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify findings'))
    } finally {
      setIsProcessing(null)
    }
  }

  const handleRejectClick = (group: FindingGroup) => {
    setRejectTarget(group)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectReason.trim()) return

    setIsProcessing(rejectTarget.group_key)
    try {
      // Reject all fix_applied findings matching this CVE
      const result = await post<{ updated: number }>('/api/v1/finding-actions/reject-fix', {
        filter: { cve_ids: [rejectTarget.group_key] },
        reason: rejectReason.trim(),
      })

      toast.success(`${result.updated} findings rejected — sent back to assignee`)
      setRejectDialogOpen(false)
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject fix'))
    } finally {
      setIsProcessing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
                <div className="ml-auto flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No findings pending review</h3>
          <p className="text-muted-foreground text-sm">
            All fix-applied findings have been verified or there are none awaiting review.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">
            {total} finding{total !== 1 ? 's' : ''} awaiting verification
          </h3>
          <p className="text-sm text-muted-foreground">
            Developers marked these as fixed. Trigger a scan or manually approve to confirm.
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.group_key} className="hover:border-yellow-500/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{group.label}</h4>
                    {group.severity && (
                      <SeverityBadge
                        severity={group.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'}
                      />
                    )}
                    <Badge
                      variant="outline"
                      className="text-yellow-600 border-yellow-600 text-[10px]"
                    >
                      {group.stats.fix_applied} fix applied
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {group.stats.affected_assets} assets affected
                  </p>
                </div>

                {/* Actions */}
                {canVerify && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(group)}
                      disabled={isProcessing === group.group_key}
                    >
                      {isProcessing === group.group_key ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectClick(group)}
                      disabled={isProcessing === group.group_key}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Fix Applied {group.stats.fix_applied}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Verified {group.stats.resolved}
                  </span>
                </div>
                <Progress
                  value={
                    group.stats.total > 0 ? (group.stats.resolved / group.stats.total) * 100 : 0
                  }
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Fix</AlertDialogTitle>
            <AlertDialogDescription>
              This will send findings back to the assignee as &quot;In Progress&quot;. Please
              explain why the fix is insufficient.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {rejectTarget && (
            <div className="rounded-lg border bg-muted/50 p-3 my-2">
              <p className="font-medium">{rejectTarget.label}</p>
              <p className="text-sm text-muted-foreground">
                {rejectTarget.stats.fix_applied} findings will be reopened
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason *</label>
            <Textarea
              placeholder="e.g., Vulnerability still present — log4j 2.14.0 detected on server"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRejectConfirm()
              }}
              disabled={!rejectReason.trim() || isProcessing !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Fix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PendingReviewTab

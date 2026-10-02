'use client'

/**
 * The verification queue's group actions: approve or reject every claimed fix
 * of a CVE. The queue itself is the grouped findings table (group by CVE,
 * status fix_applied) on the Findings page.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
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
import type { FindingGroup } from '../api/use-finding-groups'

interface VerifyGroupActionsProps {
  group: FindingGroup
  /** Called after the group's fixes were approved or rejected. */
  onDone?: () => void
}

/** Approve / Reject for one CVE group in the verification queue. */
export function VerifyGroupActions({ group, onDone }: VerifyGroupActionsProps) {
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const approve = async () => {
    setBusy(true)
    try {
      const result = await post<{ updated: number }>('/api/v1/findings/actions/verify', {
        filter: { cve_ids: [group.group_key] },
        note: `Batch verified: ${group.label}`,
      })
      toast.success(`${result.updated} findings verified`)
      onDone?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify findings'))
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    if (!reason.trim()) return
    setBusy(true)
    try {
      const result = await post<{ updated: number }>('/api/v1/findings/actions/reject-fix', {
        filter: { cve_ids: [group.group_key] },
        reason: reason.trim(),
      })
      toast.success(`${result.updated} findings rejected, sent back to the assignee`)
      setRejectOpen(false)
      setReason('')
      onDone?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject fix'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 px-2" onClick={approve} disabled={busy}>
        {busy ? (
          <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle className="me-1 h-3.5 w-3.5 text-success" />
        )}
        Approve
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2"
        onClick={() => setRejectOpen(true)}
        disabled={busy}
      >
        <XCircle className="me-1 h-3.5 w-3.5 text-destructive" />
        Reject
      </Button>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject fix</AlertDialogTitle>
            <AlertDialogDescription>
              The findings go back to the assignee as In progress. Say why the fix is not enough.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 rounded-lg border bg-muted/50 p-3">
            <p className="font-medium">{group.label}</p>
            <p className="text-sm text-muted-foreground">
              {group.stats?.fix_applied ?? 0} findings will be reopened
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor={`reject-${group.group_key}`} className="text-sm font-medium">
              Reason
            </label>
            <Textarea
              id={`reject-${group.group_key}`}
              placeholder="e.g. Vulnerability still present: log4j 2.14.0 detected on server"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void reject()
              }}
              disabled={!reason.trim() || busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Reject fix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

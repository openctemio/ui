'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useRequestApproval } from '../api/use-findings-api'
import { FINDING_STATUS_CONFIG } from '../types'
import type { FindingStatus } from '../types'

interface ApprovalDialogProps {
  findingId: string
  targetStatus: FindingStatus
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApprovalDialog({
  findingId,
  targetStatus,
  open,
  onOpenChange,
}: ApprovalDialogProps) {
  const [justification, setJustification] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [step, setStep] = useState<'input' | 'confirm'>('input')
  const { trigger: requestApproval, isMutating } = useRequestApproval(findingId)

  const statusLabel = FINDING_STATUS_CONFIG[targetStatus]?.label || targetStatus
  const showExpiryPicker = targetStatus === 'accepted'

  const handleNext = () => {
    if (!justification.trim()) {
      toast.error('Justification is required')
      return
    }
    setStep('confirm')
  }

  const handleBack = () => {
    setStep('input')
  }

  const handleSubmit = async () => {
    if (!justification.trim()) {
      toast.error('Justification is required')
      return
    }

    try {
      await requestApproval({
        requested_status: targetStatus,
        justification: justification.trim(),
        ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
      })
      toast.success(`Approval request submitted for "${statusLabel}"`)
      setJustification('')
      setExpiresAt('')
      setStep('input')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit approval request'))
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('input')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step === 'input' ? (
          <>
            <DialogHeader>
              <DialogTitle>Request Status Approval</DialogTitle>
              <DialogDescription>
                Changing status to <strong>{statusLabel}</strong> requires approval. Please provide
                a justification.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  placeholder="Explain why this status change is needed..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {justification.length}/2000 characters
                </p>
              </div>
              {showExpiryPicker && (
                <div className="grid gap-2">
                  <Label htmlFor="expires-at">Expiry Date (optional)</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Risk acceptance will expire on this date if set.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!justification.trim()}>
                Review
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Approval Request</DialogTitle>
              <DialogDescription>Please review the details before submitting.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>{' '}
                <strong>{statusLabel}</strong>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Justification:</span>
                <p className="mt-1 rounded-md border bg-muted/50 p-2 text-sm">{justification}</p>
              </div>
              {expiresAt && (
                <div>
                  <span className="font-medium text-muted-foreground">Expires:</span>{' '}
                  {new Date(expiresAt).toLocaleString()}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={isMutating}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isMutating}>
                {isMutating ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

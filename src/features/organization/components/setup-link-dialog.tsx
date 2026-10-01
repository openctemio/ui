'use client'

import { useState } from 'react'
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SetupLinkResult,
  type SetupLinkOutcome,
} from '@/features/shared/components/one-time-setup-link'
import { getErrorMessage } from '@/lib/api/error-handler'

export interface SetupLinkTarget {
  userId: string
  email: string
  name?: string
}

interface SetupLinkDialogProps {
  target: SetupLinkTarget | null
  onOpenChange: (open: boolean) => void
  /** Issues the link (tenant or platform-console endpoint). */
  issue: (userId: string) => Promise<SetupLinkOutcome>
}

/**
 * "Get setup link" for a user whose account is still pending setup. Issuing is
 * an explicit step because it invalidates any link given out before.
 */
export function SetupLinkDialog({ target, onOpenChange, issue }: SetupLinkDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SetupLinkOutcome | null>(null)

  const close = () => {
    onOpenChange(false)
    setError(null)
    setOutcome(null)
  }

  const run = async () => {
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      setOutcome(await issue(target.userId))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not issue a setup link'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup link</DialogTitle>
          <DialogDescription>
            {target?.name || target?.email} has not set a password yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {outcome && target ? (
            <SetupLinkResult outcome={outcome} email={target.email} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Issue a new one-time link they can use to set their password. Any link issued before
              stops working.
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {outcome ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={run} disabled={busy || !target}>
                {busy ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="me-2 h-4 w-4" />
                )}
                Issue setup link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

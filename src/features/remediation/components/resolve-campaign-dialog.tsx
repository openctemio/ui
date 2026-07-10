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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useResolveRemediationCampaign } from '../api/use-remediation-campaigns'

type ResolveStatus = 'fix_applied' | 'resolved'

// Above this many open findings, require explicit approval (mirrors the backend
// bulk abuse-guard's default size ceiling).
const APPROVAL_THRESHOLD = 500

interface ResolveCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  campaignName: string
  openCount: number
  onSuccess?: () => void
}

export function ResolveCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  openCount,
  onSuccess,
}: ResolveCampaignDialogProps) {
  const [status, setStatus] = useState<ResolveStatus>('fix_applied')
  const [resolution, setResolution] = useState('')
  const [approved, setApproved] = useState(false)

  const { trigger, isMutating } = useResolveRemediationCampaign(campaignId)
  const needsApproval = openCount > APPROVAL_THRESHOLD

  const handleSubmit = async () => {
    if (needsApproval && !approved) {
      toast.error('Please confirm this large bulk resolution to proceed')
      return
    }
    try {
      const result = await trigger({
        status,
        resolution: resolution.trim() || undefined,
        approved: approved || undefined,
      })
      toast.success(
        `${result?.resolved ?? 0} finding${result?.resolved === 1 ? '' : 's'} moved to ${
          status === 'resolved' ? 'Resolved' : 'Fix applied'
        }`
      )
      setResolution('')
      setApproved(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resolve the campaign findings'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve campaign findings</DialogTitle>
          <DialogDescription>
            Apply the outcome to all <strong>{openCount}</strong> open finding
            {openCount === 1 ? '' : 's'} in <span className="font-medium">{campaignName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-resolve-status">Outcome</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ResolveStatus)}>
              <SelectTrigger id="campaign-resolve-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fix_applied">
                  Fix applied — pending rescan verification (recommended)
                </SelectItem>
                <SelectItem value="resolved">Resolved — close now</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {status === 'fix_applied'
                ? 'The next scan confirms the fix and closes each finding automatically.'
                : 'Closes every finding immediately without waiting for a rescan.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-resolve-note">Note (optional)</Label>
            <Textarea
              id="campaign-resolve-note"
              placeholder="e.g. Patched via change CR-1234"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
            />
          </div>

          {needsApproval ? (
            <div className="flex items-start gap-2">
              <Checkbox
                id="campaign-resolve-approve"
                checked={approved}
                onCheckedChange={(c) => setApproved(c === true)}
              />
              <Label
                htmlFor="campaign-resolve-approve"
                className="text-sm font-normal leading-snug"
              >
                I confirm resolving {openCount} findings at once.
              </Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Resolve findings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

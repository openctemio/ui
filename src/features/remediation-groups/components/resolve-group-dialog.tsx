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
import { useResolveRemediationGroup } from '../api/use-remediation-groups'
import type { RemediationGroup, ResolveGroupStatus } from '../types'

interface ResolveGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: RemediationGroup | null
  onSuccess?: () => void
}

// Above this many findings, require explicit approval (mirrors the backend
// bulk abuse-guard's default size ceiling).
const APPROVAL_THRESHOLD = 500

export function ResolveGroupDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ResolveGroupDialogProps) {
  const [status, setStatus] = useState<ResolveGroupStatus>('fix_applied')
  const [resolution, setResolution] = useState('')
  const [approved, setApproved] = useState(false)

  const { trigger, isMutating } = useResolveRemediationGroup(group?.key ?? '')

  const needsApproval = (group?.finding_count ?? 0) > APPROVAL_THRESHOLD

  const handleSubmit = async () => {
    if (!group) return
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
        `${result?.updated ?? 0} finding${result?.updated === 1 ? '' : 's'} moved to ${
          status === 'resolved' ? 'Resolved' : 'Fix applied'
        }`
      )
      setResolution('')
      setApproved(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resolve the remediation group'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve remediation group</DialogTitle>
          <DialogDescription>
            {group ? (
              <>
                Apply this fix to all <strong>{group.finding_count}</strong> open finding
                {group.finding_count === 1 ? '' : 's'} across {group.asset_count} asset
                {group.asset_count === 1 ? '' : 's'}:{' '}
                <span className="font-medium">{group.title}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolve-status">Outcome</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ResolveGroupStatus)}>
              <SelectTrigger id="resolve-status">
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
            <Label htmlFor="resolve-note">Note (optional)</Label>
            <Textarea
              id="resolve-note"
              placeholder="e.g. Patched via change CR-1234"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
            />
          </div>

          {needsApproval ? (
            <div className="flex items-start gap-2">
              <Checkbox
                id="resolve-approve"
                checked={approved}
                onCheckedChange={(c) => setApproved(c === true)}
              />
              <Label htmlFor="resolve-approve" className="text-sm font-normal leading-snug">
                I confirm resolving {group?.finding_count} findings at once.
              </Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isMutating || !group}>
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Resolve group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

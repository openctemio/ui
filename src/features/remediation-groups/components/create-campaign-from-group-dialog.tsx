'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  useCreateRemediationCampaign,
  type RemediationCampaign,
} from '@/features/remediation/api/use-remediation-campaigns'
import type { RemediationGroup } from '../types'

interface CreateCampaignFromGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: RemediationGroup | null
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
type Priority = (typeof PRIORITIES)[number]

// A campaign scoped to the group's fix-identity key tracks the whole solution
// family: findings surfaced by later scans that share the key roll in
// automatically. The backend keys off finding_filter.remediation_key.
export function CreateCampaignFromGroupDialog({
  open,
  onOpenChange,
  group,
}: CreateCampaignFromGroupDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const { trigger, isMutating } = useCreateRemediationCampaign()

  // Seed the name from the group's fix title each time a new group opens.
  useEffect(() => {
    if (open && group) setName(group.title)
  }, [open, group])

  const handleSubmit = async () => {
    if (!group) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Give the campaign a name')
      return
    }
    try {
      const created = (await trigger({
        name: trimmed,
        priority,
        finding_filter: { remediation_key: group.key },
      } as Partial<RemediationCampaign>)) as RemediationCampaign | undefined
      toast.success(`Campaign "${trimmed}" created`)
      onOpenChange(false)
      if (created?.id) router.push(`/remediation/${created.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create the campaign'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track as campaign</DialogTitle>
          <DialogDescription>
            {group ? (
              <>
                Create a tracked remediation campaign for this solution family —{' '}
                <strong>{group.finding_count}</strong> finding
                {group.finding_count === 1 ? '' : 's'} across {group.asset_count} asset
                {group.asset_count === 1 ? '' : 's'}. New findings that share this fix join
                automatically.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Upgrade OpenSSL fleet-wide"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger id="campaign-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

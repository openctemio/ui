'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { ExternalLink } from 'lucide-react'
import { useCreateCampaignTicket } from '@/features/remediation/api/use-remediation-campaigns'
import { getErrorMessage } from '@/lib/api/error-handler'

interface CreateJiraEpicDialogProps {
  /** Campaign id + name; null closes the dialog. */
  campaign: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
}

/**
 * Creates a Jira epic for a remediation campaign. The backend is idempotent —
 * if the campaign is already linked it returns the existing epic
 * (already_existed=true) rather than opening a duplicate.
 */
export function CreateJiraEpicDialog({ campaign, onOpenChange }: CreateJiraEpicDialogProps) {
  const [projectKey, setProjectKey] = useState('')
  const { trigger, isMutating } = useCreateCampaignTicket(campaign?.id ?? '')

  const handleCreate = async () => {
    const key = projectKey.trim().toUpperCase()
    if (!key) {
      toast.error('Project key is required (e.g. SEC)')
      return
    }
    try {
      const info = await trigger({ project_key: key })
      if (info?.already_existed) {
        toast.info(`Campaign already linked to ${info.issue_key}`, {
          description: info.issue_url,
        })
      } else {
        toast.success(`Jira epic ${info?.issue_key} created`, {
          description: info?.issue_url,
        })
      }
      setProjectKey('')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create Jira epic'))
    }
  }

  return (
    <Dialog open={campaign !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Create Jira Epic
          </DialogTitle>
          <DialogDescription>
            Track <span className="font-medium">{campaign?.name}</span> as a Jira epic. Campaign
            progress and completion sync to the epic; moving the epic to Done in Jira completes the
            campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="jira-project-key">Jira project key</Label>
          <Input
            id="jira-project-key"
            placeholder="SEC"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
          <p className="text-muted-foreground text-xs">
            The epic is created in this project. Requires a connected Jira integration.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isMutating || !projectKey.trim()}>
            {isMutating ? 'Creating…' : 'Create Epic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

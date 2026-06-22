'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
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
import { ExternalLink } from 'lucide-react'
import { useCreateFindingTicketApi } from '../api/use-findings-api'
import { useJiraProjectsApi } from '@/features/integrations/api/use-integrations-api'

interface CreateTicketDialogProps {
  findingId: string
  findingTitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create a Jira ticket from a finding. The project is optional — leaving it
 * blank routes the ticket to the tenant's configured default project / routing
 * rules (backend api#207/#209). When the tenant's Jira projects can be listed,
 * a picker is offered; otherwise the operator types a key (or leaves it blank).
 */
export function CreateTicketDialog({
  findingId,
  findingTitle,
  open,
  onOpenChange,
}: CreateTicketDialogProps) {
  const [projectKey, setProjectKey] = useState('')
  const [issueType, setIssueType] = useState('')

  const { trigger, isMutating } = useCreateFindingTicketApi(findingId)
  const { data: projectsData } = useJiraProjectsApi(open)
  const projects = projectsData?.projects ?? []

  async function handleCreate() {
    try {
      const info = await trigger({
        project_key: projectKey.trim() || undefined,
        issue_type: issueType.trim() || undefined,
      })
      toast.success(`Created ${info.ticket_key}`, {
        description: 'Jira ticket linked to this finding.',
        action: info.ticket_url
          ? {
              label: 'Open',
              onClick: () => window.open(info.ticket_url, '_blank', 'noopener,noreferrer'),
            }
          : undefined,
      })
      // Refresh the finding so its linked work items show the new ticket.
      await mutate((key) => typeof key === 'string' && key.includes(`/findings/${findingId}`))
      onOpenChange(false)
      setProjectKey('')
      setIssueType('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket'
      toast.error('Could not create ticket', {
        description: message.includes('project')
          ? 'No project specified and no default project is configured. Set a default project under Settings → Integrations → Ticketing, or enter a project key here.'
          : message,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Jira ticket</DialogTitle>
          <DialogDescription>
            {findingTitle
              ? `Create and link a Jira ticket for "${findingTitle}".`
              : 'Create and link a Jira ticket for this finding.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-project">Project</Label>
            {projects.length > 0 && (
              <Select value={projectKey || undefined} onValueChange={setProjectKey}>
                <SelectTrigger id="ticket-project-picker">
                  <SelectValue placeholder="Use default project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.key}>
                      {p.key} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              id="ticket-project"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="Leave blank to use the default project"
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to route by your configured default project / routing rules.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-issue-type">Issue type (optional)</Label>
            <Input
              id="ticket-issue-type"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              placeholder="e.g. Bug"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isMutating}>
            <ExternalLink className="me-2 h-4 w-4" />
            {isMutating ? 'Creating...' : 'Create ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

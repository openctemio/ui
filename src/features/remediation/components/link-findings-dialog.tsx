'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2, Search, Target, Plus } from 'lucide-react'
import { post, patch } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AssigneeSelect } from '@/features/findings/components/assignee-select'
import { useRemediationCampaigns } from '@/features/remediation/api/use-remediation-campaigns'

interface LinkFindingsToRemediationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The findings to link (one fix → many). */
  findingIds: string[]
  /** Pre-filled campaign name (e.g. derived from the selected findings). */
  suggestedName?: string
  /** Pre-selected priority (e.g. the max severity of the selection). */
  suggestedPriority?: string
  /** Called after a successful create/link so the caller can clear selection. */
  onDone?: () => void
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

/**
 * Turns a set of findings into remediation work — either a NEW campaign or by
 * adding them to an EXISTING one. Reused by the findings list (bulk + per-row)
 * so "prioritise → mobilise" is one click from where the finding lives.
 */
export function LinkFindingsToRemediationDialog({
  open,
  onOpenChange,
  findingIds,
  suggestedName,
  suggestedPriority,
  onDone,
}: LinkFindingsToRemediationDialogProps) {
  const { mutate: globalMutate } = useSWRConfig()
  const [tab, setTab] = useState<'new' | 'existing'>('new')
  const [submitting, setSubmitting] = useState(false)

  // New-campaign form
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined)

  // Existing-campaign search
  const [query, setQuery] = useState('')

  // Reset the form each time the dialog opens so it reflects the current selection.
  useEffect(() => {
    if (open) {
      setTab('new')
      setName(suggestedName ?? '')
      setPriority(suggestedPriority ?? 'medium')
      setAssignedTo(undefined)
      setQuery('')
    }
  }, [open, suggestedName, suggestedPriority])

  // Only draft/active campaigns are sensible link targets (not completed/canceled).
  const { data: campaignsData, isLoading: campaignsLoading } = useRemediationCampaigns()
  const linkableCampaigns = useMemo(() => {
    const all = campaignsData?.data ?? []
    const q = query.trim().toLowerCase()
    return all
      .filter((c) => c.status === 'draft' || c.status === 'active' || c.status === 'paused')
      .filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [campaignsData, query])

  const refreshCampaignLists = () => {
    void globalMutate(
      (key: unknown) => typeof key === 'string' && key.includes('/remediation/campaigns')
    )
  }

  const handleCreate = async () => {
    if (!name.trim() || findingIds.length === 0) return
    setSubmitting(true)
    try {
      await post('/api/v1/remediation/campaigns', {
        name: name.trim(),
        priority,
        status: 'draft',
        assigned_to: assignedTo || undefined,
        finding_filter: { finding_ids: findingIds },
      })
      refreshCampaignLists()
      toast.success(
        `Created “${name.trim()}” with ${findingIds.length} finding${
          findingIds.length === 1 ? '' : 's'
        }`
      )
      onOpenChange(false)
      onDone?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create remediation task'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddToExisting = async (campaignId: string) => {
    const campaign = linkableCampaigns.find((c) => c.id === campaignId)
    if (!campaign || findingIds.length === 0) return
    setSubmitting(true)
    try {
      // Merge into the existing filter so any dynamic/keyed scope survives.
      const existing = campaign.finding_filter ?? {}
      const current = (existing.finding_ids as string[] | undefined) ?? []
      const merged = Array.from(new Set([...current, ...findingIds]))
      const added = merged.length - current.length
      await patch(`/api/v1/remediation/campaigns/${campaignId}`, {
        finding_filter: { ...existing, finding_ids: merged },
      })
      refreshCampaignLists()
      toast.success(
        added === 0
          ? 'Those findings were already linked to this task'
          : `Added ${added} finding${added === 1 ? '' : 's'} to “${campaign.name}”`
      )
      onOpenChange(false)
      onDone?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add findings to the task'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remediate findings</DialogTitle>
          <DialogDescription>
            {findingIds.length} finding{findingIds.length === 1 ? '' : 's'} selected — create a new
            remediation task or add them to an existing one.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New task</TabsTrigger>
            <TabsTrigger value="existing">Add to existing</TabsTrigger>
          </TabsList>

          {/* ── New campaign ── */}
          <TabsContent value="new" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="rem-name">Task name</Label>
              <Input
                id="rem-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rotate exposed credentials"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rem-priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="rem-priority">
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
              <div className="space-y-1.5">
                <Label>Owner (optional)</Label>
                <AssigneeSelect
                  placeholder="Assign"
                  value={assignedTo ? { id: assignedTo, name: 'Assigned' } : null}
                  onChange={(user) => setAssignedTo(user?.id)}
                />
              </div>
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              {findingIds.length} finding{findingIds.length === 1 ? '' : 's'} will be linked and
              tracked to resolution.
            </div>
          </TabsContent>

          {/* ── Existing campaign ── */}
          <TabsContent value="existing" className="space-y-3 pt-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search remediation tasks…"
                className="ps-7"
              />
            </div>
            <div
              className="max-h-72 space-y-1 overflow-y-auto overscroll-contain"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
            >
              {campaignsLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
                </div>
              ) : linkableCampaigns.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No open remediation tasks{query ? ' match your search' : ''}. Create a new one
                  instead.
                </p>
              ) : (
                linkableCampaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAddToExisting(c.id)}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-start disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {c.finding_count} finding{c.finding_count === 1 ? '' : 's'} · {c.progress}%
                        done
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {c.status}
                    </Badge>
                    <Plus className="text-muted-foreground h-4 w-4 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {tab === 'new' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create task
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

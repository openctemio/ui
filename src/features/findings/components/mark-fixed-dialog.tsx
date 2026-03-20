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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { toast } from 'sonner'
import { post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useRelatedCVEs, type RelatedCVE } from '../api/use-finding-groups'
import { SeverityBadge } from '@/features/shared'

interface MarkFixedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupKey: string // CVE ID or asset ID
  groupType: string // "cve", "asset", "owner"
  groupLabel: string // Display label
  findingCount: number // Number of in_progress findings
  onSuccess?: () => void
}

interface FixAppliedResponse {
  updated: number
  skipped: number
  by_cve?: Record<string, number>
  assets_affected: number
}

export function MarkFixedDialog({
  open,
  onOpenChange,
  groupKey,
  groupType,
  groupLabel,
  findingCount,
  onSuccess,
}: MarkFixedDialogProps) {
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const [includeRelated, setIncludeRelated] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRelatedCVEs, setSelectedRelatedCVEs] = useState<Set<string>>(new Set())

  const cveId = groupType === 'cve' ? groupKey : null
  const { data: relatedData } = useRelatedCVEs(cveId)
  const relatedCVEs = relatedData?.related_cves ?? []

  // Calculate total including related
  const relatedCount = includeRelated
    ? relatedCVEs
        .filter((rc) => selectedRelatedCVEs.has(rc.cve_id))
        .reduce((sum, rc) => sum + rc.finding_count, 0)
    : 0
  const totalFindings = findingCount + relatedCount

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error('Please describe what you did to fix the issue')
      return
    }

    setIsSubmitting(true)
    try {
      const cveIds: string[] = []
      if (groupType === 'cve') {
        cveIds.push(groupKey)
        if (includeRelated) {
          selectedRelatedCVEs.forEach((id) => cveIds.push(id))
        }
      }

      const body: Record<string, unknown> = {
        filter: {
          ...(cveIds.length > 0 && { cve_ids: cveIds }),
          ...(groupType === 'asset' && { asset_ids: [groupKey] }),
        },
        include_related_cves: includeRelated && groupType === 'cve',
        note: note.trim(),
        ...(reference.trim() && { reference: reference.trim() }),
      }

      const result = await post<FixAppliedResponse>('/api/v1/findings/actions/fix-applied', body)

      toast.success(`${result.updated} findings marked as fix applied`, {
        description:
          result.assets_affected > 0 ? `${result.assets_affected} assets affected` : undefined,
      })

      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to mark findings as fix applied'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNote('')
    setReference('')
    setShowAdvanced(false)
    setSelectedRelatedCVEs(new Set())
  }

  const toggleRelatedCVE = (cveId: string) => {
    setSelectedRelatedCVEs((prev) => {
      const next = new Set(prev)
      if (next.has(cveId)) {
        next.delete(cveId)
      } else {
        next.add(cveId)
      }
      return next
    })
  }

  // Auto-select all related CVEs when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && relatedCVEs.length > 0) {
      setSelectedRelatedCVEs(new Set(relatedCVEs.map((rc) => rc.cve_id)))
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark as Fixed</DialogTitle>
          <DialogDescription>
            {groupType === 'cve' && `${groupLabel} — ${findingCount} findings`}
            {groupType === 'asset' && `All findings on ${groupLabel}`}
            {groupType === 'owner' && `All findings assigned to ${groupLabel}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Note (required) */}
          <div className="space-y-2">
            <Label htmlFor="fix-note">What did you do to fix this? *</Label>
            <Textarea
              id="fix-note"
              placeholder="e.g., Upgraded log4j-core from 2.14.0 to 2.17.1 via Ansible playbook"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Advanced options toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced options
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border p-3">
              {/* Reference */}
              <div className="space-y-2">
                <Label htmlFor="fix-ref">Reference (optional)</Label>
                <Input
                  id="fix-ref"
                  placeholder="commit:abc123, PR #456, KB5033898"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              {/* Related CVEs */}
              {groupType === 'cve' && relatedCVEs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-related"
                      checked={includeRelated}
                      onCheckedChange={(v) => setIncludeRelated(!!v)}
                    />
                    <Label htmlFor="include-related" className="cursor-pointer">
                      Include related CVEs (same component)
                    </Label>
                  </div>

                  {includeRelated && (
                    <div className="space-y-1.5 ml-6">
                      {relatedCVEs.map((rc) => (
                        <RelatedCVERow
                          key={rc.cve_id}
                          cve={rc}
                          selected={selectedRelatedCVEs.has(rc.cve_id)}
                          onToggle={() => toggleRelatedCVE(rc.cve_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <span className="font-medium">{totalFindings} findings</span> will be marked as
              &quot;Fix Applied&quot;. A verification scan is needed to confirm the fix. You cannot
              mark findings as &quot;Resolved&quot; directly.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !note.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              `Submit Fix Applied (${totalFindings})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Related CVE Row
// ============================================

function RelatedCVERow({
  cve,
  selected,
  onToggle,
}: {
  cve: RelatedCVE
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <span className="font-mono text-xs">{cve.cve_id}</span>
      <SeverityBadge severity={cve.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'} />
      <span className="text-muted-foreground ml-auto">{cve.finding_count} findings</span>
    </div>
  )
}

export default MarkFixedDialog

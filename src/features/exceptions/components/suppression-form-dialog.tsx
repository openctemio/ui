'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/api/error-handler'

import { useCreateSuppression, useUpdateSuppression } from '../api/use-suppressions-api'
import { SUPPRESSION_TYPE_LABELS, type SuppressionRule, type SuppressionType } from '../types'

interface SuppressionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this rule; otherwise it creates a new one. */
  rule?: SuppressionRule | null
  onSuccess?: () => void
}

const TYPE_OPTIONS: SuppressionType[] = ['false_positive', 'accepted_risk', 'wont_fix']

/** Convert an <input type="datetime-local"> value to RFC3339, or null if blank. */
function toRfc3339(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Convert an RFC3339 timestamp to a value the datetime-local input accepts. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SuppressionFormDialog({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: SuppressionFormDialogProps) {
  const isEdit = Boolean(rule)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [suppressionType, setSuppressionType] = useState<SuppressionType>('false_positive')
  const [toolName, setToolName] = useState('')
  const [ruleId, setRuleId] = useState('')
  const [pathPattern, setPathPattern] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const { trigger: triggerCreate, isMutating: isCreating } = useCreateSuppression()
  const { trigger: triggerUpdate, isMutating: isUpdating } = useUpdateSuppression(rule?.id ?? '')
  const isSubmitting = isCreating || isUpdating

  // Hydrate form when opening (reset for create, prefill for edit).
  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? '')
    setDescription(rule?.description ?? '')
    setSuppressionType(rule?.suppression_type ?? 'false_positive')
    setToolName(rule?.tool_name ?? '')
    setRuleId(rule?.rule_id ?? '')
    setPathPattern(rule?.path_pattern ?? '')
    setExpiresAt(toLocalInput(rule?.expires_at))
  }, [open, rule])

  // Backend requires at least one of rule_id / path_pattern / asset_id.
  // The console exposes rule_id and path_pattern; require one of them.
  const hasCriteria = ruleId.trim() !== '' || pathPattern.trim() !== ''
  const canSubmit = name.trim() !== '' && hasCriteria && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    const expires = toRfc3339(expiresAt)
    try {
      if (isEdit && rule) {
        await triggerUpdate({
          name: name.trim(),
          description: description.trim(),
          rule_id: ruleId.trim(),
          tool_name: toolName.trim(),
          path_pattern: pathPattern.trim(),
          expires_at: expires ?? '',
        })
        toast.success('Suppression rule updated')
      } else {
        await triggerCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          suppression_type: suppressionType,
          rule_id: ruleId.trim() || undefined,
          tool_name: toolName.trim() || undefined,
          path_pattern: pathPattern.trim() || undefined,
          expires_at: expires,
        })
        toast.success('Suppression rule submitted for approval')
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        getErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} suppression rule`)
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Suppression Rule' : 'New Suppression Rule'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the matching criteria or expiry for this suppression rule.'
              : 'Suppress false positives or accepted risks. New rules require approval before they take effect.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="suppression-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="suppression-name"
              placeholder="e.g. Ignore test-fixture secrets"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>

          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="suppression-type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={suppressionType}
                onValueChange={(v) => setSuppressionType(v as SuppressionType)}
              >
                <SelectTrigger id="suppression-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SUPPRESSION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="suppression-desc">Description</Label>
            <Textarea
              id="suppression-desc"
              placeholder="Why is this finding being suppressed?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Matching criteria — provide a rule ID or a path pattern (at least one is required).
              Tool name further narrows the match.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="suppression-tool">Tool name</Label>
                <Input
                  id="suppression-tool"
                  placeholder="semgrep"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="suppression-rule-id">Rule ID</Label>
                <Input
                  id="suppression-rule-id"
                  placeholder="semgrep.sql-injection"
                  value={ruleId}
                  onChange={(e) => setRuleId(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="suppression-path">Path pattern</Label>
              <Input
                id="suppression-path"
                placeholder="tests/**"
                value={pathPattern}
                onChange={(e) => setPathPattern(e.target.value)}
                maxLength={500}
              />
            </div>
            {!hasCriteria && (name.trim() !== '' || toolName.trim() !== '') && (
              <p className="text-xs text-destructive">
                Provide a rule ID or a path pattern so the rule can match findings.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="suppression-expires">Expires (optional)</Label>
            <Input
              id="suppression-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for a rule that never expires.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {isEdit ? 'Saving...' : 'Creating...'}
              </>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

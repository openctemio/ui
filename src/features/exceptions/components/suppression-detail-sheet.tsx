'use client'

import { formatDistanceToNow } from 'date-fns'
import { Check, X, Trash2, Pencil, ShieldQuestion, Clock, User } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { copyToClipboard } from '@/lib/clipboard'
import { SheetDetailToolbar } from '@/features/shared'
import {
  SheetBody,
  SheetInfoRow,
  SheetSectionHeading,
} from '@/features/shared/components/sheet-primitives'
import { Can, Permission } from '@/lib/permissions'

import {
  SUPPRESSION_STATUS_BADGE,
  SUPPRESSION_STATUS_LABELS,
  SUPPRESSION_TYPE_BADGE,
  SUPPRESSION_TYPE_LABELS,
  type SuppressionRule,
} from '../types'

interface SuppressionDetailSheetProps {
  rule: SuppressionRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (rule: SuppressionRule) => void
  onApprove?: (rule: SuppressionRule) => void
  onReject?: (rule: SuppressionRule) => void
  onDelete?: (rule: SuppressionRule) => void
}

function relative(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

function CriterionRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <SheetInfoRow label={label}>
      {value ? (
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{value}</code>
      ) : (
        <span className="text-sm text-muted-foreground">Any</span>
      )}
    </SheetInfoRow>
  )
}

export function SuppressionDetailSheet({
  rule,
  open,
  onOpenChange,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: SuppressionDetailSheetProps) {
  if (!rule) return null

  const isPending = rule.status === 'pending'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="sm:max-w-xl p-0 flex flex-col h-full max-h-screen [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TooltipProvider>
          <SheetDetailToolbar
            title="Suppression Rule"
            onClose={() => onOpenChange(false)}
            onCopyId={() => copyToClipboard(rule.id)}
            onEdit={onEdit ? () => onEdit(rule) : undefined}
          />
        </TooltipProvider>

        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl shrink-0 bg-primary/10">
              <ShieldQuestion className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{rule.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs', SUPPRESSION_STATUS_BADGE[rule.status])}
                >
                  {SUPPRESSION_STATUS_LABELS[rule.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', SUPPRESSION_TYPE_BADGE[rule.suppression_type])}
                >
                  {SUPPRESSION_TYPE_LABELS[rule.suppression_type]}
                </Badge>
              </div>
              {rule.description && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                  {rule.description}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <SheetBody className="pt-4 space-y-6">
            {/* Matching criteria */}
            <section className="space-y-1">
              <SheetSectionHeading icon={ShieldQuestion}>Matching Criteria</SheetSectionHeading>
              <div className="rounded-lg border divide-y px-3">
                <CriterionRow label="Tool" value={rule.tool_name} />
                <CriterionRow label="Rule ID" value={rule.rule_id} />
                <CriterionRow label="Path pattern" value={rule.path_pattern} />
                <CriterionRow label="Asset" value={rule.asset_id} />
              </div>
            </section>

            {/* Workflow */}
            <section className="space-y-1">
              <SheetSectionHeading icon={Clock}>Approval Workflow</SheetSectionHeading>
              <div className="rounded-lg border divide-y px-3">
                <SheetInfoRow label="Requested">
                  <span className="text-sm">{relative(rule.requested_at)}</span>
                </SheetInfoRow>
                <SheetInfoRow label="Requested by">
                  <span className="text-sm font-mono flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {rule.requested_by.slice(0, 8)}
                  </span>
                </SheetInfoRow>
                {rule.approved_at && (
                  <SheetInfoRow label="Approved">
                    <span className="text-sm">{relative(rule.approved_at)}</span>
                  </SheetInfoRow>
                )}
                {rule.rejected_at && (
                  <SheetInfoRow label="Rejected">
                    <span className="text-sm">{relative(rule.rejected_at)}</span>
                  </SheetInfoRow>
                )}
                {rule.rejection_reason && (
                  <SheetInfoRow label="Rejection reason">
                    <span className="text-sm text-muted-foreground max-w-[260px] text-end">
                      {rule.rejection_reason}
                    </span>
                  </SheetInfoRow>
                )}
                <SheetInfoRow label="Expires">
                  <span className="text-sm">
                    {rule.expires_at ? relative(rule.expires_at) : 'Never'}
                  </span>
                </SheetInfoRow>
                <SheetInfoRow label="Created">
                  <span className="text-sm">{relative(rule.created_at)}</span>
                </SheetInfoRow>
              </div>
            </section>
          </SheetBody>
        </div>

        {/* Actions */}
        <div className="border-t p-4 shrink-0 flex flex-wrap items-center gap-2">
          {isPending && (
            <Can permission={Permission.SuppressionsApprove}>
              <Button size="sm" onClick={() => onApprove?.(rule)}>
                <Check className="me-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive/90"
                onClick={() => onReject?.(rule)}
              >
                <X className="me-1.5 h-4 w-4" />
                Reject
              </Button>
            </Can>
          )}
          <Can permission={Permission.SuppressionsWrite}>
            <Button size="sm" variant="outline" onClick={() => onEdit?.(rule)}>
              <Pencil className="me-1.5 h-4 w-4" />
              Edit
            </Button>
          </Can>
          <div className="flex-1" />
          <Can permission={Permission.SuppressionsDelete}>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive/90"
              onClick={() => onDelete?.(rule)}
            >
              <Trash2 className="me-1.5 h-4 w-4" />
              Delete
            </Button>
          </Can>
        </div>
      </SheetContent>
    </Sheet>
  )
}

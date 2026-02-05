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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Check, X, AlertTriangle, RefreshCw, ShieldCheck, ShieldX, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ExposureEvent } from '@/lib/api/exposure-types'
import {
  resolveExposure,
  acceptExposure,
  markExposureFalsePositive,
  reactivateExposure,
} from '../hooks/use-exposures'

type ActionType = 'resolve' | 'accept' | 'false_positive' | 'reactivate'

interface ExposureActionDialogProps {
  exposure: ExposureEvent | null
  actionType: ActionType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const actionConfig: Record<
  ActionType,
  {
    title: string
    description: string
    icon: typeof Check
    iconColor: string
    buttonText: string
    buttonVariant: 'default' | 'destructive' | 'outline' | 'secondary'
    successMessage: string
    requireReason: boolean
  }
> = {
  resolve: {
    title: 'Resolve Exposure',
    description: 'Mark this exposure as resolved. This indicates the issue has been fixed.',
    icon: ShieldCheck,
    iconColor: 'text-green-500',
    buttonText: 'Mark Resolved',
    buttonVariant: 'default',
    successMessage: 'Exposure marked as resolved',
    requireReason: false,
  },
  accept: {
    title: 'Accept Risk',
    description:
      'Accept the risk associated with this exposure. Use this when the exposure is a known acceptable risk.',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    buttonText: 'Accept Risk',
    buttonVariant: 'secondary',
    successMessage: 'Risk accepted',
    requireReason: true,
  },
  false_positive: {
    title: 'Mark as False Positive',
    description:
      'Mark this exposure as a false positive. Use this when the detection was incorrect.',
    icon: ShieldX,
    iconColor: 'text-gray-500',
    buttonText: 'Mark False Positive',
    buttonVariant: 'outline',
    successMessage: 'Marked as false positive',
    requireReason: true,
  },
  reactivate: {
    title: 'Reactivate Exposure',
    description: 'Reactivate this exposure. This will return it to active status for remediation.',
    icon: RefreshCw,
    iconColor: 'text-blue-500',
    buttonText: 'Reactivate',
    buttonVariant: 'default',
    successMessage: 'Exposure reactivated',
    requireReason: false,
  },
}

/**
 * Exposure Action Dialog - Handles state transitions with optional reason
 */
export function ExposureActionDialog({
  exposure,
  actionType,
  open,
  onOpenChange,
  onSuccess,
}: ExposureActionDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!actionType || !exposure) return null

  const config = actionConfig[actionType]
  const Icon = config.icon

  const handleSubmit = async () => {
    if (config.requireReason && !reason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setIsSubmitting(true)
    try {
      const input = reason.trim() ? { reason: reason.trim() } : undefined

      switch (actionType) {
        case 'resolve':
          await resolveExposure(exposure.id, input)
          break
        case 'accept':
          await acceptExposure(exposure.id, input)
          break
        case 'false_positive':
          await markExposureFalsePositive(exposure.id, input)
          break
        case 'reactivate':
          await reactivateExposure(exposure.id)
          break
      }

      toast.success(config.successMessage)
      onOpenChange(false)
      setReason('')
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${actionType.replace('_', ' ')} exposure`))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full bg-muted', config.iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium">{exposure.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exposure.description || 'No description'}
            </p>
          </div>

          {(config.requireReason || actionType !== 'reactivate') && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason {config.requireReason ? '(required)' : '(optional)'}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Why are you ${actionType === 'resolve' ? 'resolving' : actionType === 'accept' ? 'accepting' : actionType === 'false_positive' ? 'marking as false positive' : 'reactivating'} this exposure?`}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            disabled={isSubmitting || (config.requireReason && !reason.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ExposureQuickActionsProps {
  exposure: ExposureEvent
  onSuccess?: () => void
  className?: string
}

/**
 * Exposure Quick Actions - Inline action buttons for exposure state changes
 */
export function ExposureQuickActions({
  exposure,
  onSuccess,
  className,
}: ExposureQuickActionsProps) {
  const [actionType, setActionType] = useState<ActionType | null>(null)

  const isActive = exposure.state === 'active'

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {isActive ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionType('resolve')}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="mr-1 h-4 w-4" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionType('accept')}
              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionType('false_positive')}
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            >
              <X className="mr-1 h-4 w-4" />
              False Positive
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActionType('reactivate')}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Reactivate
          </Button>
        )}
      </div>

      <ExposureActionDialog
        exposure={exposure}
        actionType={actionType}
        open={actionType !== null}
        onOpenChange={(open) => !open && setActionType(null)}
        onSuccess={onSuccess}
      />
    </>
  )
}

interface ExposureBulkActionsProps {
  selectedIds: string[]
  onClearSelection: () => void
  onBulkResolve: (ids: string[]) => Promise<void>
  onBulkAccept: (ids: string[], reason: string) => Promise<void>
  onBulkFalsePositive: (ids: string[], reason: string) => Promise<void>
  className?: string
}

/**
 * Exposure Bulk Actions - Actions for multiple selected exposures
 */
export function ExposureBulkActions({
  selectedIds,
  onClearSelection,
  onBulkResolve,
  onBulkAccept,
  onBulkFalsePositive,
  className,
}: ExposureBulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [bulkAction, setBulkAction] = useState<'accept' | 'false_positive' | null>(null)
  const [reason, setReason] = useState('')

  const count = selectedIds.length

  if (count === 0) return null

  const handleBulkResolve = async () => {
    setIsProcessing(true)
    try {
      await onBulkResolve(selectedIds)
      toast.success(`${count} exposure(s) resolved`)
      onClearSelection()
    } catch (_error) {
      toast.error('Failed to resolve exposures')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkActionSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setIsProcessing(true)
    try {
      if (bulkAction === 'accept') {
        await onBulkAccept(selectedIds, reason)
        toast.success(`${count} exposure(s) accepted`)
      } else if (bulkAction === 'false_positive') {
        await onBulkFalsePositive(selectedIds, reason)
        toast.success(`${count} exposure(s) marked as false positive`)
      }
      onClearSelection()
      setBulkAction(null)
      setReason('')
    } catch (_error) {
      toast.error('Failed to update exposures')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between p-3 bg-muted/50 rounded-lg border',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{count} selected</Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkResolve}
            disabled={isProcessing}
            className="text-green-600"
          >
            {isProcessing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            Resolve All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkAction('accept')}
            disabled={isProcessing}
            className="text-yellow-600"
          >
            <AlertTriangle className="mr-1 h-4 w-4" />
            Accept All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkAction('false_positive')}
            disabled={isProcessing}
            className="text-gray-600"
          >
            <X className="mr-1 h-4 w-4" />
            False Positive All
          </Button>
        </div>
      </div>

      <Dialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'accept' ? 'Accept Risk for ' : 'Mark as False Positive: '}
              {count} exposure(s)
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for this bulk action. This will be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="bulk-reason">Reason (required)</Label>
            <Textarea
              id="bulk-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this bulk action..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button onClick={handleBulkActionSubmit} disabled={!reason.trim() || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

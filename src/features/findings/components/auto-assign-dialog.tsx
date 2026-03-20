'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'

interface AutoAssignResult {
  assigned: number
  by_owner: Record<string, number>
  unassigned: number
}

interface AutoAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AutoAssignDialog({ open, onOpenChange, onSuccess }: AutoAssignDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<AutoAssignResult | null>(null)

  const handleAssign = async () => {
    setIsSubmitting(true)
    try {
      const data = await post<AutoAssignResult>('/api/v1/findings/actions/assign-to-owners', {
        filter: {
          // Assign unassigned critical+high findings
        },
      })

      setResult(data)

      const ownerCount = Object.keys(data.by_owner).length
      toast.success(
        `${data.assigned} findings assigned to ${ownerCount} owner${ownerCount !== 1 ? 's' : ''}`,
        {
          description:
            data.unassigned > 0 ? `${data.unassigned} findings have no asset owner` : undefined,
        }
      )

      onSuccess?.()
      onOpenChange(false)
      setResult(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to auto-assign'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Auto-Assign to Asset Owners
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will assign unassigned findings to their asset owners. Findings that already have
            an assignee will not be changed. Assets without an owner will be skipped.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {result && (
          <div className="rounded-lg border bg-muted/50 p-3 my-2 space-y-2">
            <p className="text-sm font-medium">{result.assigned} findings assigned</p>
            {Object.entries(result.by_owner).length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {Object.entries(result.by_owner)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([owner, count]) => (
                    <div key={owner}>
                      {owner}: {count} findings
                    </div>
                  ))}
              </div>
            )}
            {result.unassigned > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {result.unassigned} findings skipped (no asset owner)
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleAssign()
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Auto-Assign'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AutoAssignDialog

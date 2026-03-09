'use client'

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

interface AssetDeleteDialogSharedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetName?: string
  typeName: string
  onConfirm: () => void
  isSubmitting?: boolean
}

export function AssetDeleteDialogShared({
  open,
  onOpenChange,
  assetName,
  typeName,
  onConfirm,
  isSubmitting,
}: AssetDeleteDialogSharedProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {typeName}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            {assetName ? `"${assetName}"` : `this ${typeName.toLowerCase()}`}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

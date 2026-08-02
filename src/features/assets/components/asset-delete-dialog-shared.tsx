'use client'

import { ConfirmDialog } from '@/components/confirm-dialog'

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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${typeName}`}
      desc={
        <>
          Are you sure you want to delete{' '}
          {assetName ? `"${assetName}"` : `this ${typeName.toLowerCase()}`}? This action cannot be
          undone.
        </>
      }
      confirmText={isSubmitting ? 'Deleting...' : 'Delete'}
      destructive
      isLoading={isSubmitting}
      handleConfirm={onConfirm}
    />
  )
}

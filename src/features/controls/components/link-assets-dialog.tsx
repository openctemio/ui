'use client'

import { post } from '@/lib/api/client'
import { LinkAssetsDialog as AssetPickerDialog } from '@/features/assets/components/link-assets-dialog'

interface LinkAssetsDialogProps {
  /** The control to link assets to. `null` means the dialog is closed. */
  control: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  /** Called after a successful link so the caller can revalidate its data. */
  onLinked?: () => void
}

/** Link assets to a compensating control (the shared asset picker). */
export function LinkAssetsDialog({ control, onOpenChange, onLinked }: LinkAssetsDialogProps) {
  return (
    <AssetPickerDialog
      open={!!control}
      onOpenChange={onOpenChange}
      resetKey={control?.id}
      targetName={control?.name ?? 'this control'}
      description={
        <>
          Linking an asset is what makes {control?.name ?? 'this control'} reduce the priority of
          that asset&apos;s findings.
        </>
      }
      onLink={async (assetIds) => {
        if (!control) return assetIds.length
        // One call for the whole selection; it answers 204, so not throwing is
        // the success signal. The API returns actionable 400s on bad input.
        await post(`/api/v1/compensating-controls/${control.id}/assets`, { asset_ids: assetIds })
        onLinked?.()
        return 0
      }}
    />
  )
}

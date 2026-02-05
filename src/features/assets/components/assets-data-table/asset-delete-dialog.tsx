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
import { AlertTriangle, Loader2, FileWarning, Shield } from 'lucide-react'
import type { Asset } from '../../types'

export interface AssetDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  assetTypeName: string
  onConfirm: () => Promise<void>
  isDeleting?: boolean
  // For bulk delete
  bulkCount?: number
  // For bulk delete - total findings that will be deleted
  bulkFindingsCount?: number
}

export function AssetDeleteDialog({
  open,
  onOpenChange,
  asset,
  assetTypeName,
  onConfirm,
  isDeleting = false,
  bulkCount,
  bulkFindingsCount,
}: AssetDeleteDialogProps) {
  const isBulkDelete = bulkCount !== undefined && bulkCount > 0
  const findingsCount = isBulkDelete ? (bulkFindingsCount || 0) : (asset?.findingCount || 0)
  const hasFindings = findingsCount > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-left">
              {isBulkDelete ? `Delete ${bulkCount} ${assetTypeName}s?` : `Delete ${assetTypeName}?`}
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Asset Info */}
          {!isBulkDelete && asset && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="font-medium truncate">{asset.name}</p>
              <p className="text-sm text-muted-foreground">
                {assetTypeName} &middot; Risk Score: {asset.riskScore}
              </p>
            </div>
          )}

          {/* Impact Warning */}
          {hasFindings && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <div className="flex items-start gap-2">
                <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    This will permanently delete:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                    <li className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      <span><strong>{findingsCount}</strong> {findingsCount === 1 ? 'finding' : 'findings'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warning Text */}
          <AlertDialogDescription className="text-sm">
            {isBulkDelete ? (
              <>
                You are about to permanently delete <strong>{bulkCount}</strong>{' '}
                {assetTypeName.toLowerCase()}{bulkCount > 1 ? 's' : ''} and all associated data.
                This action cannot be undone.
              </>
            ) : (
              <>
                This will permanently delete this {assetTypeName.toLowerCase()} and all associated
                data including findings, scan history, and configurations. This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

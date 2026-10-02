'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Box, Link2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { LinkAssetsDialog } from './link-assets-dialog'

export interface LinkedAssetItem {
  id: string
  name: string
  type: string
  /** Muted text after the type (e.g. the dependency type of a service link). */
  meta?: string
}

export interface LinkedAssetsPanelProps {
  /** What the assets belong to ("Payments", a service or unit name). */
  targetName: string
  items: LinkedAssetItem[] | undefined
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  /** How many are linked in all, when `items` is only the first page. */
  total?: number
  /** The inventory filtered to these assets, for "View all". */
  viewAllHref?: string
  /** Whether the user may link and unlink (the write permission). */
  canEdit: boolean
  /** Link the picked assets; resolve to the number that failed. */
  onLink: (assetIds: string[]) => Promise<number>
  onUnlink: (assetId: string) => Promise<unknown>
  /** What linking does, in one sentence (shown in the picker). */
  linkDescription: ReactNode
  /** Extra picker fields (a dependency type for services). */
  linkFields?: ReactNode
  emptyDescription: string
}

/**
 * The assets linked to a business unit or business service, with Link and
 * Unlink. These links are what make business context count: a unit's or a
 * service's criticality lifts the effective criticality of its assets, and a
 * cycle scoped to a service snapshots the service's assets.
 */
export function LinkedAssetsPanel({
  targetName,
  items,
  isLoading,
  error,
  onRetry,
  total,
  viewAllHref,
  canEdit,
  onLink,
  onUnlink,
  linkDescription,
  linkFields,
  emptyDescription,
}: LinkedAssetsPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const linkedIds = useMemo(() => new Set((items ?? []).map((i) => i.id)), [items])
  const count = total ?? items?.length ?? 0

  const unlink = async (item: LinkedAssetItem) => {
    setRemoving(item.id)
    try {
      await onUnlink(item.id)
      toast.success(`${item.name} unlinked from ${targetName}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to unlink the asset'))
    } finally {
      setRemoving(null)
    }
  }

  const linkButton = canEdit ? (
    <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
      <Link2 className="me-2 h-4 w-4" />
      Link assets
    </Button>
  ) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${count} asset${count === 1 ? '' : 's'} linked`}
        </p>
        {linkButton}
      </div>

      {error ? (
        <ErrorState title="linked assets" error={error} onRetry={onRetry} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No assets linked"
          description={emptyDescription}
          card={false}
          className="rounded-lg border border-dashed py-8"
        />
      ) : (
        <ul className="divide-y rounded-lg border" aria-label={`Assets linked to ${targetName}`}>
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <Box className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/assets/${item.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="capitalize">{item.type.replace(/_/g, ' ')}</span>
                  {item.meta ? ` · ${item.meta}` : ''}
                </p>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Unlink ${item.name}`}
                  disabled={removing !== null}
                  onClick={() => unlink(item)}
                >
                  {removing === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewAllHref && items && total !== undefined && total > items.length && (
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href={viewAllHref}>View all {total} in the inventory</Link>
        </Button>
      )}

      <LinkAssetsDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        targetName={targetName}
        description={linkDescription}
        linkedIds={linkedIds}
        onLink={onLink}
        resetKey={targetName}
      >
        {linkFields}
      </LinkAssetsDialog>
    </div>
  )
}

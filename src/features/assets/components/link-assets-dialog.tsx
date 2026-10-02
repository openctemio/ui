'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Box, Link2, Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useAssets } from '../hooks/use-assets'

export interface LinkAssetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the assets are linked to, for the copy ("Customer Portal"). */
  targetName: string
  /** One sentence on what linking does (shown under the title). */
  description: ReactNode
  /**
   * Link the picked assets. Resolve to the number that failed (0 = all
   * linked); throw for a failure that stopped the whole request.
   */
  onLink: (assetIds: string[]) => Promise<number>
  /** Assets already linked: listed as linked and not selectable. */
  linkedIds?: ReadonlySet<string>
  /** Extra fields between the list and the footer (e.g. a dependency type). */
  children?: ReactNode
  /** Changes when the dialog is reused for another target: clears the selection. */
  resetKey?: string
}

/**
 * Pick assets from the inventory and link them to something (a compensating
 * control, a business unit, a business service). Searches active assets,
 * 50 at a time; already linked assets are shown but cannot be picked again.
 */
export function LinkAssetsDialog({
  open,
  onOpenChange,
  targetName,
  description,
  onLink,
  linkedIds,
  children,
  resetKey,
}: LinkAssetsDialogProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // `skip` keeps SWR from firing while the dialog is closed.
  const { assets, isLoading } = useAssets({
    search: debouncedSearch,
    pageSize: 50,
    statuses: ['active'],
    skip: !open,
  })

  // Reset whenever the dialog closes, or reopens for a different target, so a
  // second open never inherits the previous selection.
  useEffect(() => {
    setSelected(new Set())
    setSearch('')
    setDebouncedSearch('')
  }, [open, resetKey])

  const toggle = useCallback((assetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }, [])

  const handleLink = async () => {
    if (selected.size === 0) return
    const count = selected.size
    setIsSubmitting(true)
    try {
      const failed = await onLink(Array.from(selected))
      const noun = (n: number) => `${n} asset${n === 1 ? '' : 's'}`
      if (failed === 0) {
        toast.success(`${noun(count)} linked to ${targetName}`)
      } else if (failed < count) {
        toast.warning(`${noun(count - failed)} linked to ${targetName}; ${failed} failed`)
      } else {
        toast.error(`Could not link ${noun(count)} to ${targetName}`)
        return
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to link assets'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link assets
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              aria-label="Search assets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selected.size} selected</span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* A plain scroller, not ScrollArea: its viewport lays content out as a
              table, so one long asset name widened the whole dialog past its
              edge instead of truncating. */}
          <div className="h-[300px] overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-4 w-4 rounded-[4px]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Box className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {debouncedSearch ? 'No assets match your search' : 'No active assets found'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {assets.map((asset) => {
                  const linked = linkedIds?.has(asset.id) ?? false
                  const isSelected = selected.has(asset.id)
                  return (
                    <div
                      key={asset.id}
                      role="button"
                      tabIndex={linked ? -1 : 0}
                      aria-pressed={isSelected}
                      aria-disabled={linked}
                      onClick={() => !linked && toggle(asset.id)}
                      onKeyDown={(e) => {
                        if (!linked && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          toggle(asset.id)
                        }
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border p-2 text-start transition-colors',
                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        linked ? 'cursor-default border-transparent opacity-60' : 'cursor-pointer',
                        !linked && isSelected
                          ? 'border-primary/30 bg-primary/10'
                          : !linked && 'border-transparent hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={linked || isSelected}
                        disabled={linked}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none shrink-0"
                      />
                      <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{asset.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{asset.type.replace(/_/g, ' ')}</span>
                          {asset.criticality && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                              {asset.criticality}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {linked && <span className="text-xs text-muted-foreground">Linked</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {children}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isSubmitting || selected.size === 0}>
            {isSubmitting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="me-2 h-4 w-4" />
            )}
            {isSubmitting
              ? 'Linking...'
              : `Link ${selected.size > 0 ? `${selected.size} ` : ''}asset${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Run `fn` over `items` in small concurrent batches (the link endpoints take
 * one asset per call). Returns how many failed, so a partial failure is
 * reported instead of swallowed.
 */
export async function linkInBatches<T>(
  items: readonly T[],
  fn: (item: T) => Promise<unknown>
): Promise<number> {
  const BATCH = 5
  let failed = 0
  for (let i = 0; i < items.length; i += BATCH) {
    const results = await Promise.allSettled(items.slice(i, i + BATCH).map(fn))
    failed += results.filter((r) => r.status === 'rejected').length
  }
  return failed
}

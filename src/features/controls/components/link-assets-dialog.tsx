'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { post } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useAssets } from '@/features/assets/hooks/use-assets'

interface LinkAssetsDialogProps {
  /** The control to link assets to. `null` means the dialog is closed. */
  control: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  /** Called after a successful link so the caller can revalidate its data. */
  onLinked?: () => void
}

export function LinkAssetsDialog({ control, onOpenChange, onLinked }: LinkAssetsDialogProps) {
  const open = !!control

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  // `skip` keeps SWR from firing while the dialog is closed.
  const { assets, isLoading } = useAssets({
    search: debouncedSearch,
    pageSize: 50,
    statuses: ['active'],
    skip: !open,
  })

  const controlId = control?.id ?? null

  // Reset whenever the dialog closes, or reopens for a different control, so a
  // second open never inherits the previous selection.
  useEffect(() => {
    setSelectedAssetIds(new Set())
    setSearch('')
    setDebouncedSearch('')
  }, [controlId])

  const toggleAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) {
        next.delete(assetId)
      } else {
        next.add(assetId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedAssetIds(new Set())
  }, [])

  const handleLink = async () => {
    if (!control || selectedAssetIds.size === 0) return

    setIsSubmitting(true)
    try {
      // The endpoint answers 204, so `post` resolves to undefined — reaching
      // this line without throwing is the success signal.
      await post(`/api/v1/compensating-controls/${control.id}/assets`, {
        asset_ids: Array.from(selectedAssetIds),
      })

      toast.success(
        selectedAssetIds.size === 1
          ? `1 asset linked to ${control.name}`
          : `${selectedAssetIds.size} assets linked to ${control.name}`
      )

      setSelectedAssetIds(new Set())
      setSearch('')
      setDebouncedSearch('')
      onLinked?.()
      onOpenChange(false)
    } catch (error) {
      // Surface the server's message rather than a generic string — the API
      // now returns actionable 400s instead of an opaque 500.
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Assets
          </DialogTitle>
          <DialogDescription>
            Linking an asset is what makes {control?.name ?? 'this control'} reduce the priority of
            that asset&apos;s findings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Selection summary */}
          {selectedAssetIds.size > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selectedAssetIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          {/* Asset list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="p-2 space-y-1">
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
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Box className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {debouncedSearch ? 'No assets match your search' : 'No active assets found'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {assets.map((asset) => {
                  const isSelected = selectedAssetIds.has(asset.id)
                  return (
                    <div
                      key={asset.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => toggleAsset(asset.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleAsset(asset.id)
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md transition-colors text-start cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none shrink-0"
                      />
                      <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{asset.type}</span>
                          {asset.criticality && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {asset.criticality}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isSubmitting || selectedAssetIds.size === 0}>
            {isSubmitting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="me-2 h-4 w-4" />
            )}
            {isSubmitting
              ? 'Linking...'
              : `Link ${selectedAssetIds.size > 0 ? `${selectedAssetIds.size} ` : ''}Asset${
                  selectedAssetIds.size !== 1 ? 's' : ''
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Search, Box, Check, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type AssetOwnershipType,
  type GroupAsset,
  useBulkAssignAssets,
} from '@/features/access-control'
import { useAssets } from '@/features/assets/hooks/use-assets'
import { getErrorMessage } from '@/lib/api/error-handler'

interface BulkAddAssetsDialogProps {
  groupId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  existingAssets: GroupAsset[]
  onSuccess?: () => void
}

export function BulkAddAssetsDialog({
  groupId,
  open,
  onOpenChange,
  existingAssets,
  onSuccess,
}: BulkAddAssetsDialogProps) {
  const { bulkAssignAssets, isAssigning } = useBulkAssignAssets(open ? groupId : null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [ownershipType, setOwnershipType] = useState<AssetOwnershipType>('secondary')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  const { assets, isLoading } = useAssets({
    search: debouncedSearch,
    pageSize: 50,
    statuses: ['active'],
    skip: !open,
  })

  // Existing asset IDs for filtering
  const existingAssetIds = useMemo(
    () => new Set(existingAssets.map((a) => a.asset_id)),
    [existingAssets]
  )

  // Available assets (not already assigned)
  const availableAssets = useMemo(
    () => assets.filter((a) => !existingAssetIds.has(a.id)),
    [assets, existingAssetIds]
  )

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

  const selectAll = useCallback(() => {
    setSelectedAssetIds(new Set(availableAssets.map((a) => a.id)))
  }, [availableAssets])

  const clearSelection = useCallback(() => {
    setSelectedAssetIds(new Set())
  }, [])

  const handleBulkAssign = async () => {
    if (!groupId || selectedAssetIds.size === 0) return

    try {
      const result = await bulkAssignAssets({
        asset_ids: Array.from(selectedAssetIds),
        ownership_type: ownershipType,
      })

      if (result) {
        const { success_count, failed_count } = result

        if (success_count > 0) {
          toast.success(
            success_count === 1
              ? '1 asset assigned to group'
              : `${success_count} assets assigned to group`
          )
        }
        if (failed_count > 0) {
          toast.error(`Failed to assign ${failed_count} asset(s)`)
        }

        if (success_count > 0) {
          setSelectedAssetIds(new Set())
          setSearch('')
          onOpenChange(false)
          onSuccess?.()
        }
      }
    } catch (error) {
      console.error('Failed to bulk assign assets:', error)
      toast.error(getErrorMessage(error, 'Failed to assign assets'))
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedAssetIds(new Set())
      setSearch('')
      setOwnershipType('secondary')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Bulk Assign Assets
          </DialogTitle>
          <DialogDescription>
            Select multiple assets to assign to this group at once.
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
              className="pl-9"
            />
          </div>

          {/* Selection actions */}
          {availableAssets.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedAssetIds.size} of {availableAssets.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                {selectedAssetIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Asset list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Box className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No assets match your search' : 'All assets are already assigned'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableAssets.map((asset) => {
                  const isSelected = selectedAssetIds.has(asset.id)
                  return (
                    <button
                      key={asset.id}
                      onClick={() => toggleAsset(asset.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left',
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center shrink-0',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{asset.type}</span>
                          {asset.criticality && (
                            <>
                              <span>-</span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {asset.criticality}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Ownership Type */}
          <div className="space-y-2">
            <Label>Ownership Type</Label>
            <Select
              value={ownershipType}
              onValueChange={(value: AssetOwnershipType) => setOwnershipType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">
                  <div className="flex flex-col">
                    <span className="font-medium">Primary</span>
                    <span className="text-xs text-muted-foreground">
                      Main owner with full access and responsibility
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="secondary">
                  <div className="flex flex-col">
                    <span className="font-medium">Secondary</span>
                    <span className="text-xs text-muted-foreground">
                      Co-owner with full access and shared responsibility
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="stakeholder">
                  <div className="flex flex-col">
                    <span className="font-medium">Stakeholder</span>
                    <span className="text-xs text-muted-foreground">
                      View access, receives critical notifications
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="informed">
                  <div className="flex flex-col">
                    <span className="font-medium">Informed</span>
                    <span className="text-xs text-muted-foreground">
                      No direct access, receives summary notifications
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkAssign} disabled={isAssigning || selectedAssetIds.size === 0}>
            {isAssigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Layers className="mr-2 h-4 w-4" />
            )}
            Assign {selectedAssetIds.size > 0 ? `${selectedAssetIds.size} ` : ''}Asset
            {selectedAssetIds.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Box,
  Plus,
  Trash2,
  MoreHorizontal,
  Search,
  Globe,
  Database,
  Server,
  Cloud,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { type GroupAsset } from '@/features/access-control'
import { useState, useEffect } from 'react'

interface AssetsTabProps {
  assets: GroupAsset[]
  totalCount: number
  isLoading: boolean
  limit: number
  offset: number
  onPageChange: (offset: number) => void
  onAddAsset: () => void
  onBulkAddAssets: () => void
  onRemoveAsset: (id: string, name: string) => void
}

export function AssetsTab({
  assets,
  totalCount,
  isLoading,
  limit,
  offset,
  onPageChange,
  onAddAsset,
  onBulkAddAssets,
  onRemoveAsset,
}: AssetsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Reset to first page when search query changes
  useEffect(() => {
    if (searchQuery) {
      onPageChange(0)
    }
  }, [searchQuery, onPageChange])

  const filteredAssets = searchQuery
    ? assets.filter(
        (item) =>
          item.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.asset?.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalCount / limit)

  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'domain':
        return <Globe className="h-4 w-4 text-blue-500" />
      case 'repository':
        return <Database className="h-4 w-4 text-purple-500" />
      case 'host':
        return <Server className="h-4 w-4 text-green-500" />
      case 'cloud':
        return <Cloud className="h-4 w-4 text-orange-500" />
      default:
        return <Box className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Assigned Assets ({totalCount})</h4>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onBulkAddAssets}>
            <Layers className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
          <Button size="sm" onClick={onAddAsset}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Asset
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No assets assigned to this group</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No assets found matching &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {getAssetIcon(item.asset?.type || 'unknown')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.asset?.name || 'Unknown Asset'}</p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.ownership_type} Owner
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{item.asset?.type || 'Unknown Type'}</span>
                    <span>•</span>
                    <span className="capitalize">{item.asset?.status || 'Unknown Status'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={() => onRemoveAsset(item.asset_id, item.asset?.name || 'Asset')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + limit >= totalCount}
              onClick={() => onPageChange(offset + limit)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

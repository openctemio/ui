'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SheetDetailToolbar } from '@/features/shared'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RiskScoreBadge } from '@/features/shared'
import { copyToClipboard } from '@/lib/clipboard'
import { Can, Permission } from '@/lib/permissions'
import {
  FolderKanban,
  Copy,
  Link,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGroupAssets, useRemoveAssetsFromGroup } from '../hooks'
import type { AssetGroup } from '../types'

// ============================================
// STYLE HELPERS
// ============================================

const CRITICALITY_COLORS: Record<string, { gradient: string; icon: string; badge: string }> = {
  critical: {
    gradient: 'bg-gradient-to-br from-red-500/20 to-red-600/5',
    icon: 'bg-red-500/20 text-red-500',
    badge: 'bg-red-500 text-white',
  },
  high: {
    gradient: 'bg-gradient-to-br from-orange-500/20 to-orange-600/5',
    icon: 'bg-orange-500/20 text-orange-500',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    gradient: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/5',
    icon: 'bg-yellow-500/20 text-yellow-500',
    badge: 'bg-yellow-500 text-black',
  },
  low: {
    gradient: 'bg-gradient-to-br from-blue-500/20 to-blue-600/5',
    icon: 'bg-blue-500/20 text-blue-500',
    badge: 'bg-blue-500 text-white',
  },
}

const ENVIRONMENT_COLORS: Record<string, string> = {
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  staging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  testing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

// ============================================
// QUICK VIEW ASSETS
// ============================================

function QuickViewAssets({ groupId, onRefresh }: { groupId: string; onRefresh?: () => void }) {
  const { data: assets, isLoading, mutate: refreshAssets } = useGroupAssets(groupId)
  const { trigger: removeAssets, isMutating: isRemoving } = useRemoveAssetsFromGroup(groupId)
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemoveAsset = async (assetId: string) => {
    setRemovingId(assetId)
    try {
      await removeAssets([assetId])
      refreshAssets()
      onRefresh?.()
    } catch {
      // Error handled by hook
    } finally {
      setRemovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-medium">Recent Assets</span>
        </div>
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayAssets = (assets || []).slice(0, 5)

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="text-sm font-medium">Recent Assets ({assets?.length || 0})</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push(`/asset-groups/${groupId}?tab=assets`)}
        >
          Manage All
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
      {displayAssets.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">No assets in this group</div>
      ) : (
        <div className="divide-y">
          {displayAssets.map(
            (asset: { id: string; name: string; type: string; status?: string }) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-green-500 border-green-500/30 bg-green-500/10"
                  >
                    {asset.status || 'active'}
                  </Badge>
                  <Can permission={Permission.AssetGroupsWrite}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveAsset(asset.id)
                      }}
                      disabled={isRemoving}
                    >
                      {removingId === asset.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </Can>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// QUICK VIEW SHEET
// ============================================

interface GroupQuickViewProps {
  group: AssetGroup | null
  onClose: () => void
  onEdit: (group: AssetGroup) => void
  onDelete: (group: AssetGroup) => void
  onRefresh: () => void
}

export function GroupQuickView({
  group,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}: GroupQuickViewProps) {
  const router = useRouter()
  const colors = group ? CRITICALITY_COLORS[group.criticality] || CRITICALITY_COLORS.low : null

  const handleCopyId = (id: string) => {
    copyToClipboard(id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = (id: string) => {
    copyToClipboard(`${window.location.origin}/asset-groups/${id}`)
    toast.success('Link copied to clipboard')
  }

  return (
    <Sheet open={!!group} onOpenChange={() => onClose()}>
      <SheetContent
        className="sm:max-w-xl p-0 overflow-y-auto [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Asset Group Details</SheetTitle>
          <SheetDescription>View details of the selected asset group</SheetDescription>
        </VisuallyHidden>
        {group && colors && (
          <>
            <TooltipProvider>
              <SheetDetailToolbar
                title="Asset Group"
                onClose={onClose}
                onEdit={() => onEdit(group)}
                onCopyId={() => handleCopyId(group.id)}
              />
            </TooltipProvider>
            {/* Header */}
            <div className={`relative p-6 ${colors.gradient}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${colors.icon.split(' ')[0]}`}
                  >
                    <FolderKanban className={`h-7 w-7 ${colors.icon.split(' ')[1]}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{group.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {group.description || 'No description'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Badge variant="outline" className={ENVIRONMENT_COLORS[group.environment]}>
                  {group.environment}
                </Badge>
                <Badge className={colors.badge}>{group.criticality}</Badge>
              </div>

              <div className="flex items-center gap-1 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => handleCopyId(group.id)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy ID
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => handleCopyLink(group.id)}
                >
                  <Link className="h-3.5 w-3.5 mr-1" />
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium">Assets</span>
                  </div>
                  <p className="text-2xl font-bold">{group.assetCount}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Findings</span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${group.findingCount > 0 ? 'text-orange-500' : ''}`}
                  >
                    {group.findingCount}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <span className="text-xs font-medium">Risk</span>
                  </div>
                  <RiskScoreBadge score={group.riskScore} size="lg" />
                </div>
              </div>

              {/* Assets Preview */}
              <QuickViewAssets groupId={group.id} onRefresh={onRefresh} />

              {/* Metadata */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium">Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Group ID</p>
                    <p className="font-mono text-xs mt-0.5">{group.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Created</p>
                    <p className="mt-0.5">{new Date(group.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="mt-0.5">{new Date(group.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Owner</p>
                    <p className="mt-0.5">{group.owner || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Can permission={Permission.AssetGroupsWrite}>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      onClose()
                      onEdit(group)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Group
                  </Button>
                </Can>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onClose()
                    router.push(`/asset-groups/${group.id}`)
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Page
                </Button>
              </div>

              {/* Danger Zone */}
              <Can permission={Permission.AssetGroupsDelete}>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-500">Danger Zone</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete this group and unassign all assets
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        onClose()
                        onDelete(group)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Can>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

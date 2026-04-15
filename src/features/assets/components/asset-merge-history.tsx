'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { GitMerge, ArrowRight, Clock } from 'lucide-react'

interface MergeLogEntry {
  id: string
  kept_asset_name: string
  merged_asset_name: string | null
  correlation_type: string
  action: string
  old_name: string | null
  new_name: string | null
  source: string
  created_at: string
}

interface AssetMergeHistoryProps {
  assetId: string
}

/**
 * Shows merge/rename history for an asset.
 * Displays in asset detail sheets as part of the timeline.
 */
export function AssetMergeHistory({ assetId }: AssetMergeHistoryProps) {
  const { data } = useSWR<{ data: MergeLogEntry[] }>(
    assetId ? `/api/v1/assets/dedup/merge-log?asset_id=${assetId}&limit=10` : null,
    get,
    { revalidateOnFocus: false }
  )

  const entries = data?.data
  if (!entries || entries.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Identity History</p>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-xs">
            <div className="mt-0.5 shrink-0">
              {entry.action === 'merge' ? (
                <GitMerge className="h-3.5 w-3.5 text-blue-500" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {entry.action === 'merge' && entry.merged_asset_name && (
                <p>
                  Merged <code className="bg-muted px-1 rounded">{entry.merged_asset_name}</code>{' '}
                  into this asset
                </p>
              )}
              {entry.action === 'rename' && entry.old_name && entry.new_name && (
                <p>
                  Renamed from <code className="bg-muted px-1 rounded">{entry.old_name}</code>
                </p>
              )}
              {entry.action === 'normalize' && entry.old_name && (
                <p>
                  Normalized from <code className="bg-muted px-1 rounded">{entry.old_name}</code>
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                <Badge variant="outline" className="h-4 text-[10px] px-1">
                  {entry.correlation_type}
                </Badge>
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(entry.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

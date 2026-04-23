'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RiskScoreBadge } from '@/features/shared'
import { AssetStatusBadge } from '@/features/asset-lifecycle'
import { ClassificationBadges } from '../classification-badges'

// daysSinceISO returns whole days elapsed between now and an ISO
// timestamp. Used by the asset list status column to render
// "Stale 12d" style labels. Returns undefined on missing/future
// timestamps so the badge falls back to its plain form rather than
// inaccurate "stale 0d" noise.
function daysSinceISO(iso?: string | null): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const diffMs = Date.now() - t
  if (diffMs < 0) return undefined
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
import {
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Copy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Asset } from '../../types'

export interface AssetColumnConfig {
  showSelect?: boolean
  showName?: boolean
  showStatus?: boolean
  showClassification?: boolean
  showFindings?: boolean
  showRiskScore?: boolean
  showOwner?: boolean
  showTags?: boolean
  showActions?: boolean
  showCreatedAt?: boolean
  showLastSeen?: boolean
  // Custom columns
  customColumns?: ColumnDef<Asset>[]
}

export interface AssetColumnHandlers {
  onView?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  onCopy?: (asset: Asset) => void
}

const defaultConfig: AssetColumnConfig = {
  showSelect: true,
  showName: true,
  showStatus: true,
  showClassification: true,
  showFindings: true,
  showRiskScore: true,
  showOwner: true,
  showTags: false,
  showActions: true,
}

/**
 * Create asset table columns based on configuration
 */
export function createAssetColumns(
  assetTypeIcon: LucideIcon,
  assetTypeName: string,
  handlers: AssetColumnHandlers,
  config?: AssetColumnConfig
): ColumnDef<Asset>[] {
  // Merge with defaults to ensure all flags have proper boolean values
  const mergedConfig: AssetColumnConfig = {
    ...defaultConfig,
    ...config,
  }
  const columns: ColumnDef<Asset>[] = []

  // Select column
  if (mergedConfig.showSelect) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }

  // Name column
  if (mergedConfig.showName) {
    const Icon = assetTypeIcon
    columns.push({
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          {assetTypeName}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="text-muted-foreground text-xs line-clamp-1">
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    })
  }

  // Status column. Uses AssetStatusBadge so "Stale" / "Inactive"
  // show a days-since-last-seen suffix ("Stale 12d") and snoozed
  // assets flag themselves, instead of the generic StatusBadge
  // which only shows the flat label.
  if (mergedConfig.showStatus) {
    columns.push({
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <AssetStatusBadge
          status={row.original.status}
          daysSinceLastSeen={daysSinceISO(row.original.lastSeen)}
          snoozedUntil={row.original.lifecyclePausedUntil}
        />
      ),
    })
  }

  // Classification column
  if (mergedConfig.showClassification) {
    columns.push({
      id: 'classification',
      header: 'Classification',
      cell: ({ row }) => (
        <ClassificationBadges
          scope={row.original.scope}
          exposure={row.original.exposure}
          size="sm"
          showTooltips
        />
      ),
    })
  }

  // Findings column
  if (mergedConfig.showFindings) {
    columns.push({
      accessorKey: 'findingCount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Findings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.original.findingCount
        if (count === 0) return <span className="text-muted-foreground">0</span>
        return <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count}</Badge>
      },
    })
  }

  // Risk Score column
  if (mergedConfig.showRiskScore) {
    columns.push({
      accessorKey: 'riskScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Risk
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    })
  }

  // Owner column
  if (mergedConfig.showOwner) {
    columns.push({
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => {
        const owner = row.original.primaryOwner
        if (!owner) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        const OwnerIcon = owner.type === 'group' ? Users : User
        return (
          <div className="flex items-center gap-1.5 max-w-[140px]">
            <OwnerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{owner.name}</span>
          </div>
        )
      },
      enableSorting: false,
    })
  }

  // Tags column
  if (mergedConfig.showTags) {
    columns.push({
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags || tags.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        const visible = tags.slice(0, 3)
        const remaining = tags.length - visible.length
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remaining}
              </Badge>
            )}
          </div>
        )
      },
      enableSorting: false,
    })
  }

  // Insert custom columns before actions
  if (mergedConfig.customColumns) {
    columns.push(...mergedConfig.customColumns)
  }

  // Created At column
  if (mergedConfig.showCreatedAt) {
    columns.push({
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return <span className="text-sm">{date.toLocaleDateString()}</span>
      },
    })
  }

  // Last Seen column
  if (mergedConfig.showLastSeen) {
    columns.push({
      accessorKey: 'lastSeen',
      header: 'Last Seen',
      cell: ({ row }) => {
        const date = new Date(row.original.lastSeen)
        return <span className="text-sm text-muted-foreground">{date.toLocaleDateString()}</span>
      },
    })
  }

  // Actions column
  if (mergedConfig.showActions) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {handlers.onView && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handlers.onView?.(asset)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {handlers.onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handlers.onEdit?.(asset)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {handlers.onCopy && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handlers.onCopy?.(asset)
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Name
                </DropdownMenuItem>
              )}
              {handlers.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlers.onDelete?.(asset)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return columns
}

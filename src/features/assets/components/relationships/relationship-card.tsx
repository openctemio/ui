'use client'

/**
 * Relationship Card Component
 *
 * Displays a single relationship between two assets
 */

import * as React from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AssetRelationship, RelationshipDirection, ExtendedAssetType } from '../../types'
import { RELATIONSHIP_LABELS, EXTENDED_ASSET_TYPE_LABELS } from '../../types'

// ============================================
// Asset Type Icons & Colors
// ============================================

const EXTENDED_ASSET_TYPE_COLORS: Record<ExtendedAssetType, { bg: string; text: string }> = {
  // External Attack Surface
  domain: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  certificate: { bg: 'bg-green-500/20', text: 'text-green-500' },
  ip_address: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
  // Applications
  website: { bg: 'bg-cyan-500/20', text: 'text-cyan-500' },
  api: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
  mobile_app: { bg: 'bg-pink-500/20', text: 'text-pink-500' },
  application: { bg: 'bg-blue-400/20', text: 'text-blue-400' },
  endpoint: { bg: 'bg-teal-400/20', text: 'text-teal-400' },
  // Cloud
  cloud_account: { bg: 'bg-sky-500/20', text: 'text-sky-500' },
  compute: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  storage: { bg: 'bg-amber-500/20', text: 'text-amber-500' },
  serverless: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
  // Infrastructure
  host: { bg: 'bg-slate-500/20', text: 'text-slate-500' },
  server: { bg: 'bg-slate-400/20', text: 'text-slate-400' },
  container: { bg: 'bg-indigo-500/20', text: 'text-indigo-500' },
  database: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  network: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
  // Code & CI/CD
  repository: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  // Unclassified
  unclassified: { bg: 'bg-gray-400/20', text: 'text-gray-400' },
  // Legacy types (deprecated)
  service: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
  credential: { bg: 'bg-red-500/20', text: 'text-red-500' },
  mobile: { bg: 'bg-pink-500/20', text: 'text-pink-500' },
  // Extended types
  k8s_cluster: { bg: 'bg-blue-600/20', text: 'text-blue-600' },
  k8s_workload: { bg: 'bg-blue-400/20', text: 'text-blue-400' },
  container_image: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
  api_collection: { bg: 'bg-teal-500/20', text: 'text-teal-500' },
  api_endpoint: { bg: 'bg-teal-400/20', text: 'text-teal-400' },
  load_balancer: { bg: 'bg-amber-500/20', text: 'text-amber-500' },
  identity_provider: { bg: 'bg-rose-500/20', text: 'text-rose-500' },
}

// ============================================
// Confidence Badge
// ============================================

function ConfidenceBadge({ confidence }: { confidence: AssetRelationship['confidence'] }) {
  const variants = {
    high: { className: 'bg-green-500/20 text-green-600 border-green-500/30', label: 'High' },
    medium: { className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', label: 'Medium' },
    low: { className: 'bg-red-500/20 text-red-600 border-red-500/30', label: 'Low' },
  }

  const variant = variants[confidence]

  return (
    <Badge variant="outline" className={cn('text-xs', variant.className)}>
      {variant.label}
    </Badge>
  )
}

// ============================================
// Impact Weight Indicator
// ============================================

function ImpactIndicator({ weight }: { weight: number }) {
  const getColor = () => {
    if (weight >= 8) return 'bg-red-500'
    if (weight >= 5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-3 rounded-full',
                  i < Math.ceil(weight / 2) ? getColor() : 'bg-muted'
                )}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Impact Weight: {weight}/10</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================
// Asset Node
// ============================================

interface AssetNodeProps {
  name: string
  type: ExtendedAssetType
  onClick?: () => void
}

function AssetNode({ name, type, onClick }: AssetNodeProps) {
  const colors = EXTENDED_ASSET_TYPE_COLORS[type] || EXTENDED_ASSET_TYPE_COLORS.service
  const label = EXTENDED_ASSET_TYPE_LABELS[type] || type

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        'min-w-[100px] max-w-[140px]'
      )}
    >
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', colors.bg)}>
        <Link2 className={cn('h-4 w-4', colors.text)} />
      </div>
      <span className="text-xs font-medium truncate w-full text-center">{name}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  )
}

// ============================================
// Relationship Card Props
// ============================================

interface RelationshipCardProps {
  relationship: AssetRelationship
  /** Which direction to show from current asset's perspective */
  direction: RelationshipDirection
  /** Current asset ID (to determine which side is "self") */
  currentAssetId?: string
  onEdit?: (relationship: AssetRelationship) => void
  onDelete?: (relationship: AssetRelationship) => void
  onSourceClick?: (assetId: string) => void
  onTargetClick?: (assetId: string) => void
  compact?: boolean
  className?: string
}

// ============================================
// Relationship Card Component
// ============================================

export function RelationshipCard({
  relationship,
  direction,
  currentAssetId,
  onEdit,
  onDelete,
  onSourceClick,
  onTargetClick,
  compact = false,
  className,
}: RelationshipCardProps) {
  const labels = RELATIONSHIP_LABELS[relationship.type]
  const label = direction === 'outgoing' ? labels.direct : labels.inverse

  const isSource = currentAssetId === relationship.sourceAssetId
  const otherAsset = isSource
    ? {
        id: relationship.targetAssetId,
        name: relationship.targetAssetName,
        type: relationship.targetAssetType,
      }
    : {
        id: relationship.sourceAssetId,
        name: relationship.sourceAssetName,
        type: relationship.sourceAssetType,
      }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors',
          className
        )}
      >
        {direction === 'outgoing' ? (
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <button
              onClick={() =>
                isSource ? onTargetClick?.(otherAsset.id) : onSourceClick?.(otherAsset.id)
              }
              className="text-sm font-medium truncate hover:underline"
            >
              {otherAsset.name}
            </button>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {EXTENDED_ASSET_TYPE_LABELS[otherAsset.type]}
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {label}
          </Badge>
          <ConfidenceBadge confidence={relationship.confidence} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(relationship)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                isSource
                  ? onTargetClick?.(relationship.targetAssetId)
                  : onSourceClick?.(relationship.sourceAssetId)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View {isSource ? 'Target' : 'Source'} Asset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete?.(relationship)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Visual Relationship */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <AssetNode
          name={relationship.sourceAssetName}
          type={relationship.sourceAssetType}
          onClick={() => onSourceClick?.(relationship.sourceAssetId)}
        />
        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground text-center max-w-[80px]">
            {labels.direct}
          </span>
        </div>
        <AssetNode
          name={relationship.targetAssetName}
          type={relationship.targetAssetType}
          onClick={() => onTargetClick?.(relationship.targetAssetId)}
        />
      </div>

      {/* Description */}
      {relationship.description && (
        <p className="text-sm text-muted-foreground mb-3">{relationship.description}</p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{relationship.discoveryMethod}</span>
          </div>
          {relationship.lastVerified && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Verified {new Date(relationship.lastVerified).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <ImpactIndicator weight={relationship.impactWeight} />
      </div>

      {/* Tags */}
      {relationship.tags && relationship.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
          {relationship.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Compact Relationship List Item
// ============================================

interface RelationshipListItemProps {
  relationship: AssetRelationship
  direction: RelationshipDirection
  currentAssetId: string
  onClick?: () => void
}

export function RelationshipListItem({
  relationship,
  direction,
  currentAssetId,
  onClick,
}: RelationshipListItemProps) {
  const labels = RELATIONSHIP_LABELS[relationship.type]
  const label = direction === 'outgoing' ? labels.direct : labels.inverse

  const isSource = currentAssetId === relationship.sourceAssetId
  const otherAsset = isSource
    ? {
        name: relationship.targetAssetName,
        type: relationship.targetAssetType,
      }
    : {
        name: relationship.sourceAssetName,
        type: relationship.sourceAssetType,
      }

  const colors = EXTENDED_ASSET_TYPE_COLORS[otherAsset.type] || EXTENDED_ASSET_TYPE_COLORS.service

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
    >
      <div
        className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colors.bg)}
      >
        <Link2 className={cn('h-4 w-4', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{otherAsset.name}</p>
        <p className="text-xs text-muted-foreground">
          {label} - {EXTENDED_ASSET_TYPE_LABELS[otherAsset.type]}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ImpactIndicator weight={relationship.impactWeight} />
        {direction === 'outgoing' ? (
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </button>
  )
}

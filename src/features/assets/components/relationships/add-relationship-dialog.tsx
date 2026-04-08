'use client'

/**
 * Add Relationship Dialog Component
 *
 * Dialog for creating new relationships between assets.
 *
 * Target asset selection uses a server-side debounced search instead of
 * preloading every asset in the tenant — that pattern does not scale and
 * was the reason this dialog never got wired before.
 */

import * as React from 'react'
import { Link2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import type {
  RelationshipType,
  ExtendedAssetType,
  CreateRelationshipInput,
  RelationshipConfidence,
  AssetRelationship,
} from '../../types'
import {
  RELATIONSHIP_LABELS,
  EXTENDED_ASSET_TYPE_LABELS,
  getValidRelationshipTypes,
  getValidTargetTypes,
  isValidRelationship,
} from '../../types'

// ============================================
// Types
// ============================================

export interface AssetOption {
  id: string
  name: string
  type: ExtendedAssetType
  description?: string
}

interface AddRelationshipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Current asset (source of the relationship) */
  sourceAsset: AssetOption
  /**
   * Server-side asset search. Called with the user's query (already
   * debounced). Should return up to ~50 candidates filtered by tenant.
   * The dialog further narrows the result by valid target types and
   * excludes the source asset from the final list.
   */
  searchAssets: (query: string) => Promise<AssetOption[]>
  /**
   * Existing relationships involving this source asset. Used to hide
   * candidates that already have a relationship of the selected type
   * with the source — saves the user from picking → submit → "already
   * exists" → try again. Also handles the runs_on / deployed_to
   * placement mutex (we hide candidates that already have the
   * conflicting type so the backend's mutex check is never hit).
   */
  existingRelationships?: AssetRelationship[]
  /** Called when relationship is created */
  onSubmit: (input: CreateRelationshipInput) => void
  /** Loading state */
  isLoading?: boolean
}

/**
 * runs_on and deployed_to are mutually exclusive for the same source/target
 * pair (see asset_relationship_service.go placement mutex). Returns the
 * conflicting type for a given type, or null if no mutex applies.
 */
function getMutexType(type: RelationshipType): RelationshipType | null {
  if (type === 'runs_on') return 'deployed_to'
  if (type === 'deployed_to') return 'runs_on'
  return null
}

// ============================================
// Asset Type Colors
// ============================================

const ASSET_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  domain: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  website: { bg: 'bg-green-500/20', text: 'text-green-500' },
  service: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
  project: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  repository: { bg: 'bg-orange-500/20', text: 'text-orange-500' }, // @deprecated
  cloud: { bg: 'bg-cyan-500/20', text: 'text-cyan-500' },
  credential: { bg: 'bg-red-500/20', text: 'text-red-500' },
  host: { bg: 'bg-slate-500/20', text: 'text-slate-500' },
  container: { bg: 'bg-indigo-500/20', text: 'text-indigo-500' },
  database: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  mobile: { bg: 'bg-pink-500/20', text: 'text-pink-500' },
  api: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
  k8s_cluster: { bg: 'bg-blue-600/20', text: 'text-blue-600' },
  k8s_workload: { bg: 'bg-blue-400/20', text: 'text-blue-400' },
  container_image: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
  api_collection: { bg: 'bg-teal-500/20', text: 'text-teal-500' },
  api_endpoint: { bg: 'bg-teal-400/20', text: 'text-teal-400' },
  network: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
  load_balancer: { bg: 'bg-amber-500/20', text: 'text-amber-500' },
  identity_provider: { bg: 'bg-rose-500/20', text: 'text-rose-500' },
}

// ============================================
// Asset Selector Item
// ============================================

function AssetSelectorItem({
  asset,
  selected,
  onClick,
  disabled,
}: {
  asset: AssetOption
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const colors = ASSET_TYPE_COLORS[asset.type] || { bg: 'bg-gray-500/20', text: 'text-gray-500' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-accent/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colors.bg)}
      >
        <Link2 className={cn('h-4 w-4', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {EXTENDED_ASSET_TYPE_LABELS[asset.type] || asset.type}
        </p>
      </div>
      {selected && (
        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

// ============================================
// Add Relationship Dialog Component
// ============================================

export function AddRelationshipDialog({
  open,
  onOpenChange,
  sourceAsset,
  searchAssets,
  existingRelationships = [],
  onSubmit,
  isLoading = false,
}: AddRelationshipDialogProps) {
  // Form state
  const [relationshipType, setRelationshipType] = React.useState<RelationshipType | ''>('')
  const [selectedTarget, setSelectedTarget] = React.useState<AssetOption | null>(null)
  const [description, setDescription] = React.useState('')
  const [confidence, setConfidence] = React.useState<RelationshipConfidence>('medium')
  const [impactWeight, setImpactWeight] = React.useState(5)
  const [searchQuery, setSearchQuery] = React.useState('')
  const debouncedQuery = useDebounce(searchQuery, 250)

  // Server-side search results
  const [searchResults, setSearchResults] = React.useState<AssetOption[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Get valid relationship types for source asset
  const validRelationshipTypes = React.useMemo(
    () => getValidRelationshipTypes(sourceAsset.type),
    [sourceAsset.type]
  )

  // Get valid target types based on selected relationship
  const validTargetTypes = React.useMemo(() => {
    if (!relationshipType) return []
    return getValidTargetTypes(relationshipType as RelationshipType, sourceAsset.type)
  }, [relationshipType, sourceAsset.type])

  // Run server-side search whenever the debounced query changes (and a
  // relationship type is selected — no point searching before then).
  React.useEffect(() => {
    if (!open || !relationshipType) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setIsSearching(true)
    searchAssets(debouncedQuery)
      .then((results) => {
        if (cancelled) return
        setSearchResults(results)
      })
      .catch(() => {
        if (cancelled) return
        setSearchResults([])
      })
      .finally(() => {
        if (cancelled) return
        setIsSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, relationshipType, debouncedQuery, searchAssets])

  // Compute the set of asset IDs that are already related to the source
  // by either:
  //   (a) the currently-selected relationship type — duplicate
  //   (b) the placement-mutex sibling type — would be rejected by the
  //       backend mutex check
  // Hidden from the picker so the user never sees them as candidates.
  // We only consider OUTGOING edges (where source is the current asset)
  // because that's the direction this dialog creates.
  const takenTargetIds = React.useMemo(() => {
    if (!relationshipType) return new Set<string>()
    const mutex = getMutexType(relationshipType as RelationshipType)
    const taken = new Set<string>()
    for (const rel of existingRelationships) {
      if (rel.sourceAssetId !== sourceAsset.id) continue
      if (rel.type === relationshipType || rel.type === mutex) {
        taken.add(rel.targetAssetId)
      }
    }
    return taken
  }, [existingRelationships, relationshipType, sourceAsset.id])

  // Apply final client-side filters in order:
  //   1. valid target types (constraint table — local, no API needed)
  //   2. exclude the source asset itself
  //   3. exclude assets that are already related (avoid round-trip errors)
  const filteredAssets = React.useMemo(() => {
    let result = searchResults
    if (validTargetTypes.length > 0) {
      result = result.filter((asset) => validTargetTypes.includes(asset.type))
    }
    result = result.filter((asset) => asset.id !== sourceAsset.id)
    if (takenTargetIds.size > 0) {
      result = result.filter((asset) => !takenTargetIds.has(asset.id))
    }
    return result
  }, [searchResults, validTargetTypes, sourceAsset.id, takenTargetIds])

  // Validation
  const isValid = React.useMemo(() => {
    if (!relationshipType || !selectedTarget) return false
    return isValidRelationship(
      relationshipType as RelationshipType,
      sourceAsset.type,
      selectedTarget.type
    )
  }, [relationshipType, selectedTarget, sourceAsset.type])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setRelationshipType('')
      setSelectedTarget(null)
      setDescription('')
      setConfidence('medium')
      setImpactWeight(5)
      setSearchQuery('')
      setSearchResults([])
    }
  }, [open])

  // Handle submit
  const handleSubmit = () => {
    if (!isValid || !relationshipType || !selectedTarget) return

    onSubmit({
      type: relationshipType as RelationshipType,
      sourceAssetId: sourceAsset.id,
      targetAssetId: selectedTarget.id,
      description: description || undefined,
      confidence,
      discoveryMethod: 'manual',
      impactWeight,
    })
  }

  const sourceColors = ASSET_TYPE_COLORS[sourceAsset.type] || {
    bg: 'bg-gray-500/20',
    text: 'text-gray-500',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>Create a new relationship from {sourceAsset.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Asset Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                sourceColors.bg
              )}
            >
              <Link2 className={cn('h-5 w-5', sourceColors.text)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{sourceAsset.name}</p>
              <p className="text-xs text-muted-foreground">
                {EXTENDED_ASSET_TYPE_LABELS[sourceAsset.type]} (Source)
              </p>
            </div>
          </div>

          {/* No valid relationship types — happens when the source asset
              has an unmapped type (e.g. `unclassified`). Show a clear
              message instead of an empty dropdown. */}
          {validRelationshipTypes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">No relationship types available</p>
                  <p className="text-xs text-muted-foreground">
                    The asset type{' '}
                    <strong>
                      {EXTENDED_ASSET_TYPE_LABELS[sourceAsset.type] ?? sourceAsset.type}
                    </strong>{' '}
                    has no relationship constraints defined yet. Create the relationship from the
                    other end of the edge instead, or contact your administrator to extend the
                    constraint table.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Relationship Type — SelectItem children show ONLY the label
              (e.g. "Runs On"). Putting the description inside SelectItem
              caused Radix to render it inside the trigger as well, creating
              a 2-line trigger and a duplicate of the helper text below. */
            <div className="space-y-2">
              <Label>Relationship Type</Label>
              <Select
                value={relationshipType}
                onValueChange={(v) => {
                  setRelationshipType(v as RelationshipType)
                  setSelectedTarget(null) // Reset target when type changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {validRelationshipTypes.map((type) => {
                    const labels = RELATIONSHIP_LABELS[type]
                    return (
                      <SelectItem key={type} value={type}>
                        {labels.direct}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {relationshipType && (
                <p className="text-xs text-muted-foreground">
                  {RELATIONSHIP_LABELS[relationshipType as RelationshipType]?.description}
                </p>
              )}
              {/* Edge case: type was selected (valid for the source type
                  in the abstract) but the constraint table doesn't list
                  any concrete target types. Tells the user up front
                  instead of leaving them staring at an empty picker. */}
              {relationshipType && validTargetTypes.length === 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    No target asset types are defined for this relationship from a{' '}
                    <strong>{EXTENDED_ASSET_TYPE_LABELS[sourceAsset.type]}</strong>. Pick a
                    different relationship type.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Visual Preview */}
          {relationshipType && (
            <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
              <Badge variant="secondary" className="max-w-[180px] truncate">
                {sourceAsset.name}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">
                {RELATIONSHIP_LABELS[relationshipType as RelationshipType]?.direct}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="secondary" className="max-w-[180px] truncate">
                {selectedTarget?.name || 'Select target…'}
              </Badge>
            </div>
          )}

          {/* Target Asset Selector — server-side search */}
          <div className="space-y-2">
            <Label>Target Asset</Label>
            {!relationshipType ? (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-dashed text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Select a relationship type first</span>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search assets by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-[200px] rounded-lg border p-2">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <p className="text-sm">Searching…</p>
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                      <Link2 className="h-8 w-8 mb-2" />
                      <p className="text-sm">
                        {debouncedQuery
                          ? `No compatible assets match "${debouncedQuery}"`
                          : 'No compatible assets found'}
                      </p>
                      {validTargetTypes.length > 0 && (
                        <p className="text-xs mt-1">
                          Looking for:{' '}
                          {validTargetTypes
                            .map((t) => EXTENDED_ASSET_TYPE_LABELS[t])
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {/* Tell the user *why* their search came back empty
                          when the only reason is "everything is already
                          related". Otherwise they may think the search
                          is broken. */}
                      {takenTargetIds.size > 0 && !debouncedQuery && (
                        <p className="text-xs mt-2">
                          {takenTargetIds.size} compatible asset
                          {takenTargetIds.size === 1 ? ' is' : 's are'} already related and
                          therefore hidden.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAssets.map((asset) => (
                        <AssetSelectorItem
                          key={asset.id}
                          asset={asset}
                          selected={asset.id === selectedTarget?.id}
                          onClick={() => setSelectedTarget(asset)}
                        />
                      ))}
                      {takenTargetIds.size > 0 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-2 border-t mt-2">
                          {takenTargetIds.size} asset
                          {takenTargetIds.size === 1 ? ' is' : 's are'} hidden because{' '}
                          {takenTargetIds.size === 1 ? 'it already has' : 'they already have'} a
                          relationship of this type with the source.
                        </p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* Additional Options */}
          {selectedTarget && (
            <>
              {/* Description */}
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Describe this relationship..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Confidence & Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Confidence</Label>
                  <Select
                    value={confidence}
                    onValueChange={(v) => setConfidence(v as RelationshipConfidence)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Impact Weight: {impactWeight}</Label>
                  <Slider
                    value={[impactWeight]}
                    onValueChange={([v]) => setImpactWeight(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Creating...' : 'Create Relationship'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

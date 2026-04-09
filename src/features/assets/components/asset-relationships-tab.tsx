'use client'

/**
 * Asset Relationships Tab
 *
 * Self-contained tab component that owns all relationship CRUD state for an
 * asset detail sheet. Mirrors the AssetOwnersTab pattern: parent passes only
 * the assetId + a few asset descriptors, and this component handles fetching,
 * dialogs, mutations, and toast feedback internally.
 *
 * Why a container instead of plain RelationshipSection? Because the section
 * component is render-only and needs callbacks for every action. Wiring those
 * callbacks at every consumer site is what kept this feature dead — no
 * consumer in the codebase ever did it. By making the tab self-contained the
 * sheet just renders <AssetRelationshipsTab assetId=... /> and gets the full
 * Add / Edit / Delete experience for free.
 */

import { useCallback, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { useTenant } from '@/context/tenant-provider'
import { get } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Permission, usePermissions } from '@/lib/permissions'
import {
  addAssetRelationshipBatch,
  removeAssetRelationship,
  updateAssetRelationship,
  useAssetRelationships,
} from '../hooks/use-asset-relationships'
import type {
  Asset,
  AssetRelationship,
  CreateRelationshipInput,
  ExtendedAssetType,
  RelationshipConfidence,
} from '../types'
import { RELATIONSHIP_LABELS } from '../types'
import { RelationshipSection } from './relationships/relationship-section'
import { AddRelationshipDialog, type AssetOption } from './relationships/add-relationship-dialog'

interface AssetRelationshipsTabProps {
  assetId: string
  /** The current asset is the source for any new relationship. We need its
   *  name and type for the dialog header and constraint validation. */
  sourceAsset: Pick<Asset, 'id' | 'name' | 'type'>
  /**
   * Optional. Called when the user clicks a related asset (in a card
   * or list row) to navigate to it. The tab itself cannot swap the
   * parent sheet's selected asset, so this is forwarded up.
   */
  onNavigateToAsset?: (assetId: string) => void
}

// Backend asset list response shape (matching `useAssets`'s BackendAsset).
// Inlined because we only need three fields and the full transform is
// overkill for a search picker.
interface BackendAssetSearchItem {
  id: string
  name: string
  type: string
  description?: string
}
interface BackendAssetsListResponse {
  data: BackendAssetSearchItem[]
  total: number
}

const PICKER_PAGE_SIZE = 50

// Format a list of asset names for inclusion in a toast message.
// Joins the first N with commas, summarises the rest as "and K more"
// to keep toasts readable when the user picked many targets.
function truncateNameList(names: string[], max = 3): string {
  if (names.length <= max) return names.join(', ')
  const head = names.slice(0, max).join(', ')
  return `${head}, and ${names.length - max} more`
}

export function AssetRelationshipsTab({
  assetId,
  sourceAsset,
  onNavigateToAsset,
}: AssetRelationshipsTabProps) {
  const { relationships, isLoading, mutate } = useAssetRelationships(assetId)
  const { can } = usePermissions()
  const { currentTenant } = useTenant()
  const canWrite = can(Permission.AssetsWrite)
  const canDelete = can(Permission.AssetsDelete)

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editTarget, setEditTarget] = useState<AssetRelationship | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AssetRelationship | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state — populated from `editTarget` when the dialog opens
  const [editDescription, setEditDescription] = useState('')
  const [editConfidence, setEditConfidence] = useState<RelationshipConfidence>('medium')
  const [editImpactWeight, setEditImpactWeight] = useState(5)

  // ============================================
  // Server-side asset search for the Add dialog
  // ============================================
  //
  // Wrapped in useCallback so the dialog's effect dep array is stable.
  // Calls GET /api/v1/assets?search=... and returns up to PICKER_PAGE_SIZE
  // candidates. The dialog applies the relationship-type constraint filter
  // on top of this — we don't try to push that down to the API because the
  // constraint table is local and complex.
  const searchAssets = useCallback(
    async (query: string): Promise<AssetOption[]> => {
      if (!currentTenant) return []
      const params = new URLSearchParams({
        per_page: String(PICKER_PAGE_SIZE),
      })
      if (query.trim()) params.set('search', query.trim())
      try {
        const response = await get<BackendAssetsListResponse>(`/api/v1/assets?${params.toString()}`)
        return (response.data ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type as ExtendedAssetType,
          description: a.description,
        }))
      } catch {
        return []
      }
    },
    [currentTenant]
  )

  // ============================================
  // Handlers
  // ============================================

  // Multi-select handler. The dialog passes one (input, targetName)
  // per selected target. We send all of them in ONE call to the
  // batch endpoint POST /assets/{id}/relationships/batch.
  //
  // The batch endpoint validates the source asset + tenant ONCE for
  // the whole request (instead of per-item like the singleton path)
  // and reports per-item status in the response. Per-item failures do
  // not abort the batch — every target gets its own outcome.
  //
  // Why batch endpoint instead of N parallel POSTs: it's one HTTP
  // round trip instead of N, source-asset validation is a single
  // query instead of N, and the backend can rate-limit at the
  // request level. Same UX as before — chunking is no longer needed
  // because all the load is now on a single endpoint that the backend
  // controls.
  //
  // Possible outcomes:
  //   - All N created → green toast with the count
  //   - All N duplicates → red toast naming the duplicates
  //   - All N other-failed → red toast with first error
  //   - Mixed → warning toast naming the skipped target(s)
  //   - Whole-batch failure (bad source asset, etc.) → red toast
  const handleAdd = async (
    items: Array<{ input: CreateRelationshipInput; targetName: string }>
  ) => {
    if (items.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await addAssetRelationshipBatch(
        assetId,
        items.map((it) => it.input)
      )

      const succeededNames: string[] = []
      const duplicateNames: string[] = []
      const otherFailedNames: string[] = []
      const otherErrorMessages: string[] = []

      result.results.forEach((r) => {
        const name = items[r.index]?.targetName ?? '(unknown)'
        if (r.status === 'created') {
          succeededNames.push(name)
        } else if (r.status === 'duplicate') {
          duplicateNames.push(name)
        } else {
          otherFailedNames.push(name)
          if (r.error) otherErrorMessages.push(r.error)
        }
      })

      const total = items.length
      if (succeededNames.length === total) {
        toast.success(total === 1 ? 'Relationship created' : `${total} relationships created`)
        setShowAddDialog(false)
      } else if (succeededNames.length === 0 && otherFailedNames.length === 0) {
        // Every attempt was a duplicate
        toast.error(
          total === 1
            ? 'This relationship already exists'
            : `All ${total} relationships already exist`,
          {
            description:
              total === 1
                ? 'A relationship with the same type between these assets is already recorded.'
                : `Already recorded: ${truncateNameList(duplicateNames)}`,
          }
        )
      } else if (succeededNames.length === 0) {
        // Every attempt failed for non-duplicate reasons
        toast.error(otherErrorMessages[0] || 'Failed to create relationships', {
          description:
            otherFailedNames.length > 1
              ? `Failed: ${truncateNameList(otherFailedNames)}`
              : undefined,
        })
      } else {
        // Mixed
        const description =
          duplicateNames.length > 0 && otherFailedNames.length === 0
            ? `Already recorded: ${truncateNameList(duplicateNames)}`
            : otherFailedNames.length > 0 && duplicateNames.length === 0
              ? `Failed: ${truncateNameList(otherFailedNames)}${
                  otherErrorMessages[0] ? ` (${otherErrorMessages[0]})` : ''
                }`
              : `${duplicateNames.length} already existed, ${otherFailedNames.length} failed`
        toast.warning(`${succeededNames.length} of ${total} created`, { description })
        setShowAddDialog(false)
      }
    } catch (error) {
      // Whole-batch failure (bad source asset, missing tenant, etc.)
      const message = getErrorMessage(error, 'Failed to create relationships')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      mutate()
    }
  }

  const openEditDialog = (rel: AssetRelationship) => {
    setEditTarget(rel)
    setEditDescription(rel.description ?? '')
    setEditConfidence(rel.confidence)
    setEditImpactWeight(rel.impactWeight)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      await updateAssetRelationship(editTarget.id, {
        description: editDescription,
        confidence: editConfidence,
        impactWeight: editImpactWeight,
      })
      toast.success('Relationship updated')
      setEditTarget(null)
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update relationship'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setIsSubmitting(true)
    try {
      await removeAssetRelationship(removeTarget.id)
      toast.success('Relationship removed')
      setRemoveTarget(null)
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove relationship'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      <RelationshipSection
        relationships={relationships}
        isLoading={isLoading}
        currentAssetId={assetId}
        onAddClick={canWrite ? () => setShowAddDialog(true) : undefined}
        onEditClick={canWrite ? openEditDialog : undefined}
        onDeleteClick={canDelete ? setRemoveTarget : undefined}
        onAssetClick={onNavigateToAsset}
      />

      {/* Add Relationship Dialog — server-side asset search.
          existingRelationships is forwarded so the dialog can hide
          candidates that already have a relationship of the chosen type
          with the source (or its placement-mutex sibling). */}
      <AddRelationshipDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        sourceAsset={{
          id: sourceAsset.id,
          name: sourceAsset.name,
          type: sourceAsset.type as ExtendedAssetType,
        }}
        searchAssets={searchAssets}
        existingRelationships={relationships}
        onSubmit={handleAdd}
        isLoading={isSubmitting}
      />

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Relationship</DialogTitle>
            <DialogDescription>
              Update the metadata for this relationship. The source, target, and type cannot be
              changed — delete and recreate if you need to change those.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Read-only context — shows the user *which* relationship they
                are editing. Without this they have to remember which row
                they clicked, especially when an asset has many edges of
                the same type. */}
            {editTarget && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <Badge variant="secondary" className="max-w-[180px] truncate">
                    {editTarget.sourceAssetName}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="outline">
                    {RELATIONSHIP_LABELS[editTarget.type]?.direct ?? editTarget.type}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="max-w-[180px] truncate">
                    {editTarget.targetAssetName}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  These fields are immutable. To change the source, target, or type, remove this
                  relationship and create a new one.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Optional context for this relationship…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Confidence</Label>
                <Select
                  value={editConfidence}
                  onValueChange={(v) => setEditConfidence(v as RelationshipConfidence)}
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
                <Label>Impact Weight: {editImpactWeight}</Label>
                <Slider
                  value={[editImpactWeight]}
                  onValueChange={([v]) => setEditImpactWeight(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this relationship between{' '}
              <strong>{removeTarget?.sourceAssetName}</strong> and{' '}
              <strong>{removeTarget?.targetAssetName}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

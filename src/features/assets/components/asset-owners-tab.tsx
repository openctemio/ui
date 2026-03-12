'use client'

import { useState } from 'react'
import { Users, UserPlus, Trash2, Building2, User, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePermissions, Permission } from '@/lib/permissions'
import {
  useAssetOwners,
  addAssetOwner,
  updateAssetOwner,
  removeAssetOwner,
} from '../hooks/use-asset-owners'
import type { AssetOwner, OwnershipType } from '../types'
import { OWNERSHIP_TYPE_LABELS, OWNERSHIP_TYPE_COLORS } from '../types'

interface AssetOwnersTabProps {
  assetId: string
}

function OwnershipBadge({ type }: { type: OwnershipType }) {
  const colors = OWNERSHIP_TYPE_COLORS[type]
  return (
    <Badge variant="outline" className={cn(colors.bg, colors.text, colors.border)}>
      {OWNERSHIP_TYPE_LABELS[type]}
    </Badge>
  )
}

function OwnerCard({
  owner,
  canEdit,
  canDelete,
  onEdit,
  onRemove,
}: {
  owner: AssetOwner
  canEdit: boolean
  canDelete: boolean
  onEdit: (owner: AssetOwner) => void
  onRemove: (owner: AssetOwner) => void
}) {
  const isUser = !!owner.userId
  const name = isUser ? owner.userName : owner.groupName
  const subtitle = isUser ? owner.userEmail : 'Group'

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            isUser ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{name || 'Unknown'}</span>
            <OwnershipBadge type={owner.ownershipType} />
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {owner.assignedByName && (
            <p className="text-xs text-muted-foreground">Assigned by {owner.assignedByName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(owner)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(owner)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function AssetOwnersTab({ assetId }: AssetOwnersTabProps) {
  const { owners, isLoading, mutate } = useAssetOwners(assetId)
  const { can } = usePermissions()
  const canEdit = can(Permission.AssetsWrite)
  const canDelete = can(Permission.AssetsDelete)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editOwner, setEditOwner] = useState<AssetOwner | null>(null)
  const [removeOwnerTarget, setRemoveOwnerTarget] = useState<AssetOwner | null>(null)

  // Add owner form state
  const [addType, setAddType] = useState<'user' | 'group'>('user')
  const [addId, setAddId] = useState('')
  const [addOwnershipType, setAddOwnershipType] = useState<OwnershipType>('primary')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit owner state
  const [editOwnershipType, setEditOwnershipType] = useState<OwnershipType>('primary')

  const handleAdd = async () => {
    if (!addId.trim()) {
      toast.error('Please enter an ID')
      return
    }
    setIsSubmitting(true)
    try {
      await addAssetOwner(assetId, {
        userId: addType === 'user' ? addId.trim() : undefined,
        groupId: addType === 'group' ? addId.trim() : undefined,
        ownershipType: addOwnershipType,
      })
      toast.success('Owner added successfully')
      setShowAddDialog(false)
      setAddId('')
      mutate()
    } catch {
      toast.error('Failed to add owner')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editOwner) return
    setIsSubmitting(true)
    try {
      await updateAssetOwner(assetId, editOwner.id, {
        ownershipType: editOwnershipType,
      })
      toast.success('Owner updated successfully')
      setEditOwner(null)
      mutate()
    } catch {
      toast.error('Failed to update owner')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!removeOwnerTarget) return
    setIsSubmitting(true)
    try {
      await removeAssetOwner(assetId, removeOwnerTarget.id)
      toast.success('Owner removed successfully')
      setRemoveOwnerTarget(null)
      mutate()
    } catch {
      toast.error('Failed to remove owner')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEditClick = (owner: AssetOwner) => {
    setEditOwner(owner)
    setEditOwnershipType(owner.ownershipType)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading owners...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Owners ({owners.length})</h3>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Owner
          </Button>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No owners assigned</p>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add First Owner
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map((owner) => (
            <OwnerCard
              key={owner.id}
              owner={owner}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEditClick}
              onRemove={setRemoveOwnerTarget}
            />
          ))}
        </div>
      )}

      {/* Add Owner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Owner</DialogTitle>
            <DialogDescription>Add a user or group as an owner of this asset.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Owner Type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as 'user' | 'group')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{addType === 'user' ? 'User ID' : 'Group ID'}</Label>
              <Input
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                placeholder={`Enter ${addType} ID`}
              />
            </div>
            <div className="space-y-2">
              <Label>Ownership Type</Label>
              <Select
                value={addOwnershipType}
                onValueChange={(v) => setAddOwnershipType(v as OwnershipType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OWNERSHIP_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog */}
      <Dialog open={!!editOwner} onOpenChange={(open) => !open && setEditOwner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ownership Type</DialogTitle>
            <DialogDescription>
              Change the ownership type for{' '}
              {editOwner?.userName || editOwner?.groupName || 'this owner'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Ownership Type</Label>
            <Select
              value={editOwnershipType}
              onValueChange={(v) => setEditOwnershipType(v as OwnershipType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OWNERSHIP_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOwner(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog
        open={!!removeOwnerTarget}
        onOpenChange={(open) => !open && setRemoveOwnerTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Owner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              {removeOwnerTarget?.userName || removeOwnerTarget?.groupName || 'this owner'} from
              this asset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

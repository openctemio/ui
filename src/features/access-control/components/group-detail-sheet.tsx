'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import { Users, Calendar, Loader2, Trash2, Box } from 'lucide-react'
import {
  useGroup,
  useGroupMembers,
  useGroupAssets,
  useUpdateGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useAssignAssetToGroup,
  useUnassignAssetFromGroup,
  type GroupMemberRole,
  formatDate,
} from '@/features/access-control'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useMembers } from '@/features/organization'
import { useTenant } from '@/context/tenant-provider'

import {
  GroupHeader,
  OverviewTab,
  MembersTab,
  AssetsTab,
  ErrorDisplay,
  AddMemberDialog,
  AddAssetDialog,
} from './group-detail-sheet/index'

interface GroupDetailSheetProps {
  groupId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function GroupDetailSheet({ groupId, open, onOpenChange, onUpdate }: GroupDetailSheetProps) {
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug

  // API Hooks - Only fetch when sheet is open (avoid unnecessary API calls)
  const {
    group,
    isLoading: groupLoading,
    isError: groupError,
    error: groupErrorDetails,
    mutate: mutateGroup,
  } = useGroup(groupId, { skip: !open })
  const {
    members,
    isLoading: membersLoading,
    mutate: mutateMembers,
  } = useGroupMembers(groupId, { skip: !open })
  const { updateGroup, isUpdating } = useUpdateGroup(open ? groupId : null)
  const { addMember, isAdding: isAddingMember } = useAddGroupMember(open ? groupId : null)
  const { members: tenantMembers } = useMembers(open ? tenantSlug : undefined)
  const {
    assets,
    isLoading: assetsLoading,
    mutate: mutateAssets,
  } = useGroupAssets(groupId, { skip: !open })
  const { assignAsset, isAssigning: isAssigningAsset } = useAssignAssetToGroup(
    open ? groupId : null
  )

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(
    null
  )
  const [assetToRemove, setAssetToRemove] = useState<{ id: string; name: string } | null>(null)
  const [newMember, setNewMember] = useState({ userId: '', role: 'member' as GroupMemberRole })

  // Remove hooks
  const { removeMember, isRemoving: isRemovingMember } = useRemoveGroupMember(
    groupId,
    memberToRemove?.userId || null
  )
  const { unassignAsset, isUnassigning: isUnassigningAsset } = useUnassignAssetFromGroup(
    groupId,
    assetToRemove?.id || null
  )

  // Force revalidate when sheet opens to avoid stale cache
  useEffect(() => {
    if (open && groupId) {
      mutateGroup()
      mutateAssets()
    }
  }, [open, groupId, mutateGroup, mutateAssets])

  // Log errors for debugging
  useEffect(() => {
    if (groupError && groupErrorDetails) {
      console.error('[GroupDetailSheet] Failed to load group:', {
        groupId,
        error: groupErrorDetails,
        timestamp: new Date().toISOString(),
      })
    }
  }, [groupError, groupErrorDetails, groupId])

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (group) {
      setEditForm({
        name: group.name,
        description: group.description || '',
      })
      setIsEditing(true)
    }
  }, [group])

  // Save changes
  const handleSaveChanges = async () => {
    if (!editForm.name) {
      toast.error('Team name is required')
      return
    }

    try {
      await updateGroup({
        name: editForm.name,
        description: editForm.description || undefined,
      })
      toast.success('Team updated successfully')
      setIsEditing(false)
      mutateGroup()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update team'))
    }
  }

  // Add member
  const handleAddMember = async () => {
    if (!newMember.userId) {
      toast.error('Please select a member')
      return
    }

    try {
      await addMember({
        user_id: newMember.userId,
        role: newMember.role,
      })
      toast.success('Member added successfully')
      setAddMemberDialogOpen(false)
      setNewMember({ userId: '', role: 'member' })
      mutateMembers()
      mutateGroup()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add member'))
    }
  }

  // Remove member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      await removeMember()
      toast.success(`Member removed successfully`)
      setMemberToRemove(null)
      mutateMembers()
      mutateGroup()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove member'))
    }
  }

  // Assign Asset
  const handleAssignAsset = async (
    assetId: string,
    ownershipType: 'primary' | 'secondary' | 'stakeholder' | 'informed'
  ) => {
    try {
      await assignAsset({
        asset_id: assetId,
        ownership_type: ownershipType,
      })
      toast.success('Asset assigned successfully')
      setAddAssetDialogOpen(false)
      mutateAssets()
      mutateGroup()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to assign asset'))
    }
  }

  // Unassign Asset
  const handleUnassignAsset = async () => {
    if (!assetToRemove) return

    try {
      await unassignAsset()
      toast.success('Asset removed successfully')
      setAssetToRemove(null)
      mutateAssets()
      mutateGroup()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove asset'))
    }
  }

  // Get available members (not already in group)
  const availableMembers = (tenantMembers || []).filter(
    (m: { user_id: string }) =>
      !members.some((gm: { user_id?: string; id?: string }) => {
        const gmId = gm.user_id || gm.id // defensive
        return gmId === m.user_id
      })
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Team Details</SheetTitle>
          </VisuallyHidden>

          {groupLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <div className="space-y-2 mt-8">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : groupError ? (
            <ErrorDisplay
              error={groupErrorDetails}
              onClose={() => onOpenChange(false)}
              onRetry={() => mutateGroup()}
            />
          ) : group ? (
            <div className="flex flex-col h-full">
              <GroupHeader
                group={group}
                isEditing={isEditing}
                editForm={editForm}
                isUpdating={isUpdating}
                onStartEdit={handleStartEdit}
                onCancelEdit={() => setIsEditing(false)}
                onSave={handleSaveChanges}
                onEditFormChange={setEditForm}
              />

              {/* Stats */}
              <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Members</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {group.member_count ?? members?.length ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Box className="h-4 w-4" />
                    <span className="text-xs">Assets</span>
                  </div>
                  <p className="text-lg font-semibold">{assets?.length ?? 0}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Created</span>
                  </div>
                  <p className="text-sm font-semibold">{formatDate(group.created_at)}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-1 px-6 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="members" className="flex-1">
                      Members
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="flex-1">
                      Assets
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <OverviewTab group={group} />
                  </TabsContent>

                  <TabsContent value="members">
                    <MembersTab
                      members={members}
                      isLoading={membersLoading}
                      onAddMember={() => setAddMemberDialogOpen(true)}
                      onRemoveMember={(userId, name) => setMemberToRemove({ userId, name })}
                    />
                  </TabsContent>

                  <TabsContent value="assets">
                    <AssetsTab
                      assets={assets}
                      isLoading={assetsLoading}
                      onAddAsset={() => setAddAssetDialogOpen(true)}
                      onRemoveAsset={(id, name) => setAssetToRemove({ id, name })}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <ErrorDisplay
              error={{ status: 404 }}
              onClose={() => onOpenChange(false)}
              onRetry={() => mutateGroup()}
            />
          )}
        </SheetContent>
      </Sheet>

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        newMember={newMember}
        setNewMember={setNewMember}
        isAddingMember={isAddingMember}
        onAddMember={handleAddMember}
        availableMembers={availableMembers}
      />

      <AddAssetDialog
        open={addAssetDialogOpen}
        onOpenChange={setAddAssetDialogOpen}
        isAssigning={isAssigningAsset}
        onAssign={handleAssignAsset}
        existingAssets={assets}
      />

      {/* Remove Member Confirmation */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{memberToRemove?.name}&quot; from this team?
              They will lose access to assets owned by this team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isRemovingMember}>
              {isRemovingMember ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Asset Confirmation */}
      <Dialog open={!!assetToRemove} onOpenChange={(open) => !open && setAssetToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Remove Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the asset &quot;{assetToRemove?.name}&quot; from this
              team? The team will lose access to this asset.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssetToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnassignAsset}
              disabled={isUnassigningAsset}
            >
              {isUnassigningAsset ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

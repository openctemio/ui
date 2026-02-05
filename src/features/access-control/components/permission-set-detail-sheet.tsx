'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Shield,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Lock,
  KeyRound,
  X,
  Save,
  Users,
  Check,
} from 'lucide-react'
import {
  usePermissionSet,
  useUpdatePermissionSet,
  useAddPermissionToSet,
  useRemovePermissionFromSet,
  PermissionCategories,
  getPermissionInfo,
} from '@/features/access-control'
import { getErrorMessage } from '@/lib/api/error-handler'

interface PermissionSetDetailSheetProps {
  permissionSetId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PermissionSetDetailSheet({
  permissionSetId,
  open,
  onOpenChange,
  onUpdate,
}: PermissionSetDetailSheetProps) {
  // API Hooks
  const {
    permissionSet,
    isLoading,
    mutate: mutatePermissionSet,
  } = usePermissionSet(permissionSetId)
  const { updatePermissionSet, isUpdating } = useUpdatePermissionSet(permissionSetId)
  const { addPermission, isAdding } = useAddPermissionToSet(permissionSetId)

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [addPermissionDialogOpen, setAddPermissionDialogOpen] = useState(false)
  const [permissionToRemove, setPermissionToRemove] = useState<{ id: string; key: string } | null>(
    null
  )
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  // Remove permission hook
  const { removePermission, isRemoving } = useRemovePermissionFromSet(
    permissionSetId,
    permissionToRemove?.id || null
  )

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (permissionSet) {
      setEditForm({
        name: permissionSet.name,
        description: permissionSet.description || '',
      })
      setIsEditing(true)
    }
  }, [permissionSet])

  // Save changes
  const handleSaveChanges = async () => {
    if (!editForm.name) {
      toast.error('Name is required')
      return
    }

    try {
      await updatePermissionSet({
        name: editForm.name,
        description: editForm.description || undefined,
      })
      toast.success('Permission set updated successfully')
      setIsEditing(false)
      mutatePermissionSet()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update permission set'))
    }
  }

  // Toggle permission selection
  const togglePermissionSelection = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  // Add permissions
  const handleAddPermissions = async () => {
    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission')
      return
    }

    const results = {
      success: [] as string[],
      failed: [] as { permission: string; error: string }[],
    }

    try {
      // Add permissions one by one with individual error handling
      for (const permission of selectedPermissions) {
        try {
          await addPermission({ permission })
          results.success.push(permission)
        } catch (error) {
          results.failed.push({
            permission,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // Show detailed results
      if (results.success.length > 0 && results.failed.length === 0) {
        toast.success(`Added ${results.success.length} permission(s) successfully`)
      } else if (results.success.length > 0 && results.failed.length > 0) {
        toast.warning(
          `Added ${results.success.length} permission(s). Failed to add ${results.failed.length} permission(s).`,
          {
            description: results.failed.map((f) => `• ${f.permission}: ${f.error}`).join('\n'),
          }
        )
      } else {
        toast.error(`Failed to add all ${results.failed.length} permission(s)`, {
          description: results.failed.map((f) => `• ${f.permission}: ${f.error}`).join('\n'),
        })
      }

      // Close dialog and refresh if any succeeded
      if (results.success.length > 0) {
        setAddPermissionDialogOpen(false)
        setSelectedPermissions([])
        mutatePermissionSet()
        onUpdate?.()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add permissions'))
    }
  }

  // Remove permission
  const handleRemovePermission = async () => {
    if (!permissionToRemove) return

    try {
      await removePermission()
      toast.success('Permission removed successfully')
      setPermissionToRemove(null)
      mutatePermissionSet()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove permission'))
    }
  }

  // Get current permission keys
  const currentPermissionKeys =
    permissionSet?.items?.map((p: { permission: string }) => p.permission) || []

  // Get available permissions (not already in set)
  const availablePermissions = PermissionCategories.map((category) => ({
    ...category,
    permissions: category.permissions.filter((p) => !currentPermissionKeys.includes(p.key)),
  })).filter((c) => c.permissions.length > 0)

  const isSystem = permissionSet?.is_system

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Permission Set Details</SheetTitle>
          </VisuallyHidden>

          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-16 rounded-xl mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <div className="space-y-2 mt-8">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : permissionSet ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-muted/50 to-background">
                {/* Edit Button */}
                {!isSystem && (
                  <div className="absolute top-4 right-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveChanges} disabled={isUpdating}>
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Icon & Info */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`p-4 rounded-xl ${isSystem ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}
                  >
                    {isSystem ? (
                      <Lock className={`h-8 w-8 text-purple-500`} />
                    ) : (
                      <KeyRound className={`h-8 w-8 text-blue-500`} />
                    )}
                  </div>

                  {isEditing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-4 text-center font-semibold"
                    />
                  ) : (
                    <h2 className="mt-4 text-xl font-semibold">{permissionSet.name}</h2>
                  )}

                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Add a description..."
                      className="mt-2 text-center"
                      rows={2}
                    />
                  ) : permissionSet.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {permissionSet.description}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2 mt-3">
                    <Badge
                      className={`${isSystem ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'} border-0`}
                    >
                      {isSystem ? 'System' : 'Custom'}
                    </Badge>
                    {isSystem && (
                      <Badge variant="outline" className="text-xs">
                        Read-only
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs">Permissions</span>
                  </div>
                  <p className="text-lg font-semibold">{permissionSet.permissions?.length || 0}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Groups</span>
                  </div>
                  <p className="text-lg font-semibold">{permissionSet.group_count || 0}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Created</span>
                  </div>
                  <p className="text-sm font-semibold">{formatDate(permissionSet.created_at)}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-1 px-6 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="flex-1">
                      Permissions
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-medium mb-3">Details</h4>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Type</dt>
                          <dd>{isSystem ? 'System' : 'Custom'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Created</dt>
                          <dd>{formatDate(permissionSet.created_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Last Updated</dt>
                          <dd>{formatDate(permissionSet.updated_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">ID</dt>
                          <dd className="font-mono text-xs">
                            {permissionSet.id.substring(0, 8)}...
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {permissionSet.description || 'No description provided.'}
                      </p>
                    </div>
                  </TabsContent>

                  {/* Permissions Tab */}
                  <TabsContent value="permissions" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium">
                        Permissions ({permissionSet.permissions?.length || 0})
                      </h4>
                      {!isSystem && (
                        <Button size="sm" onClick={() => setAddPermissionDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Permission
                        </Button>
                      )}
                    </div>

                    {!permissionSet.permissions || permissionSet.permissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No permissions in this set</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {permissionSet.permissions.map((permission: string, index: number) => {
                          const info = getPermissionInfo(permission)
                          return (
                            <div
                              key={`${permission}-${index}`}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                  <Check className="h-4 w-4 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{info?.label || permission}</p>
                                  {info?.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {info.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!isSystem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-500"
                                  onClick={() =>
                                    setPermissionToRemove({ id: permission, key: permission })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Permission set not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Permission Dialog */}
      <Dialog open={addPermissionDialogOpen} onOpenChange={setAddPermissionDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Permissions</DialogTitle>
            <DialogDescription>Select permissions to add to this permission set.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selected: {selectedPermissions.length} permissions
            </p>

            {availablePermissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All permissions are already in this set</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {availablePermissions.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.permissions.map((permission) => {
                        const isSelected = selectedPermissions.includes(permission.key)
                        return (
                          <div
                            key={permission.key}
                            onClick={() => togglePermissionSelection(permission.key)}
                            className={`
                              flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                              ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-muted-foreground/30'
                              }
                            `}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePermissionSelection(permission.key)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{permission.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddPermissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPermissions}
              disabled={isAdding || selectedPermissions.length === 0}
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add {selectedPermissions.length} Permission
              {selectedPermissions.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Permission Confirmation */}
      <Dialog
        open={!!permissionToRemove}
        onOpenChange={(open) => !open && setPermissionToRemove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Remove Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the &quot;
              {getPermissionInfo(permissionToRemove?.key || '')?.label || permissionToRemove?.key}
              &quot; permission? Groups using this permission set will lose this permission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPermissionToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemovePermission} disabled={isRemoving}>
              {isRemoving ? (
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

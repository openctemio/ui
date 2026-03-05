'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import {
  GitBranch,
  Pencil,
  Trash2,
  Loader2,
  Play,
  Calendar,
  Target,
  AlertCircle,
  Save,
  X,
} from 'lucide-react'
import {
  useAssignmentRule,
  useUpdateAssignmentRule,
  useDeleteAssignmentRule,
  useGroups,
  formatDate,
  type TestRuleResult,
} from '@/features/access-control'
import { fetcherWithOptions } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'

interface AssignmentRuleDetailSheetProps {
  ruleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  onDelete?: () => void
}

export function AssignmentRuleDetailSheet({
  ruleId,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: AssignmentRuleDetailSheetProps) {
  const { assignmentRule, isLoading, isError, mutate } = useAssignmentRule(open ? ruleId : null)
  const { updateAssignmentRule, isUpdating } = useUpdateAssignmentRule(open ? ruleId : null)
  const { deleteAssignmentRule, isDeleting } = useDeleteAssignmentRule(open ? ruleId : null)
  const { groups } = useGroups()

  // Group lookup map: id → name
  const groupMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of groups) {
      map[g.id] = g.name
    }
    return map
  }, [groups])

  const [isEditing, setIsEditing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    priority: 0,
    target_group_id: '',
    is_active: true,
  })

  // Populate edit form when rule loads
  useEffect(() => {
    if (assignmentRule && isEditing) {
      setEditForm({
        name: assignmentRule.name,
        description: assignmentRule.description || '',
        priority: assignmentRule.priority,
        target_group_id: assignmentRule.target_group_id,
        is_active: assignmentRule.is_active,
      })
    }
  }, [assignmentRule, isEditing])

  // Reset editing state when sheet closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
    }
  }, [open])

  const handleStartEdit = () => {
    if (assignmentRule) {
      setEditForm({
        name: assignmentRule.name,
        description: assignmentRule.description || '',
        priority: assignmentRule.priority,
        target_group_id: assignmentRule.target_group_id,
        is_active: assignmentRule.is_active,
      })
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!editForm.name) {
      toast.error('Rule name is required')
      return
    }

    try {
      await updateAssignmentRule({
        name: editForm.name,
        description: editForm.description || undefined,
        priority: editForm.priority,
        target_group_id: editForm.target_group_id,
        is_active: editForm.is_active,
      })
      toast.success('Assignment rule updated')
      setIsEditing(false)
      mutate()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update rule'))
    }
  }

  const handleToggleActive = async () => {
    if (!assignmentRule) return

    try {
      await updateAssignmentRule({ is_active: !assignmentRule.is_active })
      toast.success(assignmentRule.is_active ? 'Rule deactivated' : 'Rule activated')
      mutate()
      onUpdate?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update rule'))
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAssignmentRule()
      toast.success('Assignment rule deleted')
      setDeleteDialogOpen(false)
      onOpenChange(false)
      onDelete?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete rule'))
    }
  }

  // Test rule via direct API call (avoids SWR mutation race condition)
  const handleTest = useCallback(async () => {
    if (!ruleId) return
    setIsTesting(true)
    try {
      const result = await fetcherWithOptions<TestRuleResult>(
        `/api/v1/assignment-rules/${ruleId}/test`,
        { method: 'POST' }
      )
      if (result) {
        toast.success(`Rule matched ${result.total_matched} asset(s)`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to test rule'))
    } finally {
      setIsTesting(false)
    }
  }, [ruleId])

  const conditionLabels: Record<string, string> = {
    asset_type: 'Asset Type',
    finding_severity: 'Finding Severity',
    asset_status: 'Asset Status',
    asset_criticality: 'Asset Criticality',
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Assignment Rule Details</SheetTitle>
          </VisuallyHidden>

          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2 mt-8">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : isError || !assignmentRule ? (
            <div className="p-6 flex flex-col items-center justify-center py-12 gap-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-muted-foreground">Failed to load assignment rule</p>
              <Button variant="outline" onClick={() => mutate()}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-6 pr-14 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="text-lg font-semibold"
                        />
                      ) : (
                        <h2 className="text-lg font-semibold">{assignmentRule.name}</h2>
                      )}
                      <Badge variant={assignmentRule.is_active ? 'default' : 'secondary'}>
                        {assignmentRule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                          {isUpdating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save
                        </Button>
                      </>
                    ) : (
                      <Can permission={Permission.AssignmentRulesWrite}>
                        <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{assignmentRule.description || 'No description'}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">Priority</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">{assignmentRule.priority}</p>
                  )}
                </div>

                {/* Target Group */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">Target Group</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.target_group_id}
                      onValueChange={(v) => setEditForm({ ...editForm, target_group_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {groupMap[assignmentRule.target_group_id] || 'Unknown Group'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                {isEditing && (
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })}
                    />
                  </div>
                )}

                {/* Conditions */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">Conditions</Label>
                  {Object.keys(assignmentRule.conditions || {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conditions defined</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(assignmentRule.conditions).map(([key, values]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">
                            {conditionLabels[key] || key}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {values.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Created {formatDate(assignmentRule.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {formatDate(assignmentRule.updated_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                      {isTesting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Test Rule
                    </Button>
                    <Can permission={Permission.AssignmentRulesWrite}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleActive}
                        disabled={isUpdating}
                      >
                        {assignmentRule.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Can>
                    <Can permission={Permission.AssignmentRulesDelete}>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </Can>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Delete Assignment Rule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{assignmentRule?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

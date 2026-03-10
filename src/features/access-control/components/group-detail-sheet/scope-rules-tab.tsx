'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
  Tag,
  Layers,
  Zap,
  Search,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useScopeRules,
  useCreateScopeRule,
  useUpdateScopeRule,
  useDeleteScopeRule,
  useReconcileGroup,
} from '@/features/access-control/api/use-scope-rules'
import { fetcherWithOptions } from '@/lib/api/client'
import type { PreviewScopeRuleResult } from '@/features/access-control/types'
import {
  SCOPE_RULE_TYPE_LABELS,
  OWNERSHIP_TYPE_LABELS,
} from '@/features/access-control/types/scope-rule.types'
import type {
  ScopeRule,
  CreateScopeRuleInput,
  UpdateScopeRuleInput,
} from '@/features/access-control/types'
import { getErrorMessage } from '@/lib/api/error-handler'
import { PermissionGate } from '@/features/auth/components/permission-gate'
import { Permission } from '@/lib/permissions/constants'
import { ScopeRuleDialog } from './scope-rule-dialog'

interface ScopeRulesTabProps {
  groupId: string | null
}

export function ScopeRulesTab({ groupId }: ScopeRulesTabProps) {
  const { scopeRules, isLoading, isError, error, mutate } = useScopeRules(groupId)
  const { createScopeRule, isCreating } = useCreateScopeRule(groupId)
  const { reconcileGroup, isReconciling } = useReconcileGroup(groupId)

  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScopeRule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ScopeRule | null>(null)
  const [previewingRule, setPreviewingRule] = useState<ScopeRule | null>(null)

  // Mutation hooks - always called with stable IDs (null-safe via SWR)
  const { updateScopeRule, isUpdating } = useUpdateScopeRule(groupId, editingRule?.id || null)
  const { deleteScopeRule, isDeleting } = useDeleteScopeRule(groupId, deleteConfirm?.id || null)

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState<{
    matching_assets: number
    already_assigned: number
    would_add: number
  } | null>(null)

  const filteredRules = scopeRules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.rule_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = useCallback(
    async (data: CreateScopeRuleInput | UpdateScopeRuleInput) => {
      if (!groupId) return
      try {
        await createScopeRule(data as CreateScopeRuleInput)
        toast.success('Scope rule created')
        setDialogOpen(false)
        mutate()
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to create scope rule'))
      }
    },
    [groupId, createScopeRule, mutate]
  )

  const handleUpdate = useCallback(
    async (data: CreateScopeRuleInput | UpdateScopeRuleInput) => {
      try {
        await updateScopeRule(data as UpdateScopeRuleInput)
        toast.success('Scope rule updated')
        setEditingRule(null)
        mutate()
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update scope rule'))
      }
    },
    [updateScopeRule, mutate]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteScopeRule()
      toast.success('Scope rule deleted')
      setDeleteConfirm(null)
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete scope rule'))
    }
  }, [deleteConfirm, deleteScopeRule, mutate])

  const handlePreview = useCallback(
    async (rule: ScopeRule) => {
      if (!groupId) return
      setPreviewingRule(rule)
      setPreviewResult(null)
      setIsPreviewing(true)
      try {
        const result = await fetcherWithOptions<PreviewScopeRuleResult>(
          `/api/v1/groups/${groupId}/scope-rules/${rule.id}/preview`,
          { method: 'POST' }
        )
        setPreviewResult(result)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to preview scope rule'))
        setPreviewingRule(null)
      } finally {
        setIsPreviewing(false)
      }
    },
    [groupId]
  )

  const handleReconcile = useCallback(async () => {
    try {
      const result = await reconcileGroup()
      const r = result as { rules_evaluated: number; assets_added: number; assets_removed: number }
      toast.success(
        `Reconciled: ${r.rules_evaluated} rules evaluated, ${r.assets_added} assets added, ${r.assets_removed} removed`
      )
      mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reconcile'))
    }
  }, [reconcileGroup, mutate])

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Scope Rules ({scopeRules.length})</h4>
        <div className="flex items-center gap-2">
          <PermissionGate permission={Permission.GroupsWrite} mode="disable">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReconcile}
              disabled={isReconciling || scopeRules.length === 0}
            >
              {isReconciling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reconcile
            </Button>
          </PermissionGate>
          <PermissionGate permission={Permission.GroupsWrite} mode="disable">
            <Button size="sm" onClick={() => setDialogOpen(true)} disabled={isCreating || !groupId}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </PermissionGate>
        </div>
      </div>

      {scopeRules.length > 3 && (
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-70" />
          <p className="text-sm text-destructive">Failed to load scope rules</p>
          <p className="text-xs mt-1">{error?.message || 'An unexpected error occurred'}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => mutate()}>
            Try Again
          </Button>
        </div>
      ) : scopeRules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No scope rules configured</p>
          <p className="text-xs mt-1">
            Add rules to automatically assign assets based on tags or asset group membership.
          </p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No rules found matching &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted">
                  {rule.rule_type === 'tag_match' ? (
                    <Tag className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Layers className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{rule.name}</p>
                    {!rule.is_active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{SCOPE_RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}</span>
                    <span>-</span>
                    <span>{OWNERSHIP_TYPE_LABELS[rule.ownership_type] || rule.ownership_type}</span>
                    {rule.rule_type === 'tag_match' && rule.match_tags?.length > 0 && (
                      <>
                        <span>-</span>
                        <span className="truncate">
                          {rule.match_tags.slice(0, 3).join(', ')}
                          {rule.match_tags.length > 3 && ` +${rule.match_tags.length - 3}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={`Actions for ${rule.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePreview(rule)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <PermissionGate permission={Permission.GroupsWrite}>
                      <DropdownMenuItem onClick={() => setEditingRule(rule)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    </PermissionGate>
                    <PermissionGate permission={Permission.GroupsDelete}>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => setDeleteConfirm(rule)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <ScopeRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isSubmitting={isCreating}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <ScopeRuleDialog
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
        rule={editingRule}
        isSubmitting={isUpdating}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Scope Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? Auto-assigned
              assets from this rule will be removed from the team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
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

      {/* Preview Dialog */}
      <Dialog
        open={!!previewingRule}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewingRule(null)
            setPreviewResult(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview: {previewingRule?.name}</DialogTitle>
            <DialogDescription>
              Shows how many assets would be affected by this scope rule.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isPreviewing || !previewResult ? (
              <div className="flex items-center justify-center py-8" aria-busy="true">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{previewResult.matching_assets}</p>
                  <p className="text-xs text-muted-foreground">Matching Assets</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{previewResult.already_assigned}</p>
                  <p className="text-xs text-muted-foreground">Already Assigned</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{previewResult.would_add}</p>
                  <p className="text-xs text-muted-foreground">Would Add</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPreviewingRule(null)
                setPreviewResult(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

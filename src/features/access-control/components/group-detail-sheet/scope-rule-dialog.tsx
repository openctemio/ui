'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { Loader2, Plus, Save } from 'lucide-react'
import { useAssetTags } from '@/features/assets/hooks/use-asset-tags'
import { useAssetGroups } from '@/features/asset-groups/hooks/use-asset-groups'
import type {
  ScopeRule,
  ScopeRuleType,
  MatchLogic,
  OwnershipType,
  CreateScopeRuleInput,
  UpdateScopeRuleInput,
} from '@/features/access-control/types'

interface ScopeRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: ScopeRule | null
  isSubmitting: boolean
  onSubmit: (data: CreateScopeRuleInput | UpdateScopeRuleInput) => Promise<void>
}

export function ScopeRuleDialog({
  open,
  onOpenChange,
  rule,
  isSubmitting,
  onSubmit,
}: ScopeRuleDialogProps) {
  const isEditing = !!rule

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ruleType, setRuleType] = useState<ScopeRuleType>('tag_match')
  const [matchTags, setMatchTags] = useState<string[]>([])
  const [matchLogic, setMatchLogic] = useState<MatchLogic>('any')
  const [matchAssetGroupIds, setMatchAssetGroupIds] = useState<string[]>([])
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('secondary')
  const [priority, setPriority] = useState(0)

  // Tag autocomplete
  const { tags: tagSuggestions } = useAssetTags(undefined, open)

  // Asset groups for selection
  const { data: assetGroups } = useAssetGroups({
    enabled: open && ruleType === 'asset_group_match',
  })

  // Populate form when editing
  useEffect(() => {
    if (open && rule) {
      setName(rule.name)
      setDescription(rule.description || '')
      setRuleType(rule.rule_type)
      setMatchTags(rule.match_tags || [])
      setMatchLogic(rule.match_logic || 'any')
      setMatchAssetGroupIds(rule.match_asset_group_ids || [])
      setOwnershipType(rule.ownership_type || 'secondary')
      setPriority(rule.priority || 0)
    } else if (open && !rule) {
      setName('')
      setDescription('')
      setRuleType('tag_match')
      setMatchTags([])
      setMatchLogic('any')
      setMatchAssetGroupIds([])
      setOwnershipType('secondary')
      setPriority(0)
    }
  }, [open, rule])

  const handleSubmit = async () => {
    if (!name.trim()) return

    if (isEditing) {
      const data: UpdateScopeRuleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        match_tags: ruleType === 'tag_match' ? matchTags : undefined,
        match_logic: ruleType === 'tag_match' ? matchLogic : undefined,
        match_asset_group_ids: ruleType === 'asset_group_match' ? matchAssetGroupIds : undefined,
        ownership_type: ownershipType,
        priority,
      }
      await onSubmit(data)
    } else {
      const data: CreateScopeRuleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        rule_type: ruleType,
        match_tags: ruleType === 'tag_match' ? matchTags : undefined,
        match_logic: ruleType === 'tag_match' ? matchLogic : undefined,
        match_asset_group_ids: ruleType === 'asset_group_match' ? matchAssetGroupIds : undefined,
        ownership_type: ownershipType,
        priority,
      }
      await onSubmit(data)
    }
  }

  const isValid =
    name.trim() && (ruleType === 'tag_match' ? matchTags.length > 0 : matchAssetGroupIds.length > 0)

  const toggleAssetGroup = (groupId: string) => {
    setMatchAssetGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Scope Rule' : 'Create Scope Rule'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the scope rule configuration.'
              : 'Define a rule to automatically assign assets to this team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              placeholder="e.g., Production Assets"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Textarea
              id="rule-description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Rule Type (only when creating) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={ruleType} onValueChange={(v: ScopeRuleType) => setRuleType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag_match">
                    <div className="flex flex-col">
                      <span className="font-medium">Tag Match</span>
                      <span className="text-xs text-muted-foreground">
                        Match assets by their tags
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="asset_group_match">
                    <div className="flex flex-col">
                      <span className="font-medium">Asset Group Match</span>
                      <span className="text-xs text-muted-foreground">
                        Match assets by asset group membership
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tag Match Configuration */}
          {ruleType === 'tag_match' && (
            <>
              <div className="space-y-2">
                <Label>Match Tags (max 10)</Label>
                <TagInput
                  value={matchTags}
                  onChange={setMatchTags}
                  suggestions={tagSuggestions}
                  placeholder="Type a tag and press Enter..."
                  maxTags={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Match Logic</Label>
                <Select value={matchLogic} onValueChange={(v: MatchLogic) => setMatchLogic(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">
                      <div className="flex flex-col">
                        <span className="font-medium">Any (OR)</span>
                        <span className="text-xs text-muted-foreground">
                          Asset matches if it has ANY of the tags
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex flex-col">
                        <span className="font-medium">All (AND)</span>
                        <span className="text-xs text-muted-foreground">
                          Asset must have ALL of the tags
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Asset Group Match Configuration */}
          {ruleType === 'asset_group_match' && (
            <div className="space-y-2">
              <Label>Select Asset Groups (max 5)</Label>
              <div className="border rounded-md max-h-[200px] overflow-y-auto p-1 space-y-1">
                {assetGroups.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No asset groups found
                  </div>
                ) : (
                  assetGroups.map((group) => {
                    const selected = matchAssetGroupIds.includes(group.id)
                    const disabled = !selected && matchAssetGroupIds.length >= 5

                    return (
                      <div
                        key={group.id}
                        className={`
                          flex items-center justify-between p-2 rounded-sm cursor-pointer text-sm
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
                          ${selected ? 'bg-primary/10 border-primary/20 border' : ''}
                        `}
                        onClick={() => !disabled && toggleAssetGroup(group.id)}
                      >
                        <div className="flex flex-col truncate">
                          <span className="font-medium truncate">{group.name}</span>
                          {group.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {group.description}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {matchAssetGroupIds.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {matchAssetGroupIds.length} group{matchAssetGroupIds.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              )}
            </div>
          )}

          {/* Ownership Type */}
          <div className="space-y-2">
            <Label>Ownership Type</Label>
            <Select value={ownershipType} onValueChange={(v: OwnershipType) => setOwnershipType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="stakeholder">Stakeholder</SelectItem>
                <SelectItem value="informed">Informed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="rule-priority">Priority</Label>
            <Input
              id="rule-priority"
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority rules are evaluated first (0-100)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isValid}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditing ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

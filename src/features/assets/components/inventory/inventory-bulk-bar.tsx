'use client'

/**
 * Bulk-action bar for the All-Assets inventory. Appears when ≥1 row is selected
 * and lets an operator apply an action to the whole selection: assign an owner,
 * set criticality, or add a tag. Every mutation is tenant-scoped (it goes
 * through the shared API client) and gated on `assets:write` by the caller.
 *
 * Writes run in small concurrent batches (mirrors bulkDeleteAssets) with
 * Promise.allSettled so a partial failure is surfaced rather than swallowed.
 * On success the parent refetches the list + stats and clears the selection.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  UserPlus,
  ShieldAlert,
  Tag as TagIcon,
  X,
  User,
  Building2,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useDebounce } from '@/hooks/use-debounce'
import { useTenant } from '@/context/tenant-provider'
import { useGroups } from '@/features/access-control/api/use-groups'
import { updateAsset } from '../../hooks/use-assets'
import { addAssetOwner } from '../../hooks/use-asset-owners'
import {
  CRITICALITY_LABELS,
  OWNERSHIP_TYPE_LABELS,
  type Asset,
  type Criticality,
  type OwnershipType,
  type UpdateAssetInput,
} from '../../types/asset.types'

interface BulkBarProps {
  selected: Asset[]
  canWrite: boolean
  onClear: () => void
  /** Called after a successful bulk mutation to refetch + drop the selection. */
  onDone: () => void
}

/** Run an async op over items in small concurrent batches; returns failures. */
async function runBulk<T>(items: T[], fn: (item: T) => Promise<unknown>): Promise<number> {
  const BATCH = 5
  let failed = 0
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(fn))
    failed += results.filter((r) => r.status === 'rejected').length
  }
  return failed
}

/**
 * A full PUT body from the asset's CURRENT values plus the caller's overrides.
 * The update endpoint takes the whole asset, so echoing the existing fields
 * keeps a bulk criticality/tag change from clobbering name, scope, etc.
 */
function fullUpdate(a: Asset, overrides: Partial<UpdateAssetInput>): UpdateAssetInput {
  return {
    name: a.name,
    description: a.description,
    criticality: a.criticality,
    scope: a.scope,
    exposure: a.exposure,
    ownerRef: a.ownerRef,
    tags: a.tags,
    metadata: a.metadata,
    ...overrides,
  }
}

const CRITICALITY_ORDER: Criticality[] = ['critical', 'high', 'medium', 'low']

type PickerOption =
  | { kind: 'user'; id: string; label: string; sublabel?: string }
  | { kind: 'group'; id: string; label: string; sublabel?: string }

interface MemberWithUserResponse {
  user_id: string
  email: string
  name: string
}
interface MembersResponse {
  data: MemberWithUserResponse[]
  total: number
}

export function InventoryBulkBar({ selected, canWrite, onClear, onDone }: BulkBarProps) {
  const count = selected.length
  const [dialog, setDialog] = useState<null | 'owner' | 'criticality' | 'tag'>(null)
  const [submitting, setSubmitting] = useState(false)

  // Set-criticality state
  const [criticality, setCriticality] = useState<Criticality>('high')

  // Add-tag state
  const [tag, setTag] = useState('')

  // Assign-owner state
  const [selectedOption, setSelectedOption] = useState<PickerOption | null>(null)
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('primary')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const debouncedSearch = useDebounce(pickerSearch, 250)

  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? null
  const ownerDialogOpen = dialog === 'owner'

  const membersUrl = (() => {
    if (!ownerDialogOpen || !tenantSlug) return null
    const params = new URLSearchParams({ include: 'user', limit: '50' })
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    return `/api/v1/tenants/${tenantSlug}/members?${params.toString()}`
  })()
  const { data: membersData, isLoading: membersLoading } = useSWR<MembersResponse>(
    membersUrl,
    (url: string) => get<MembersResponse>(url),
    { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
  )
  const { groups: groupsData, isLoading: groupsLoading } = useGroups(
    ownerDialogOpen ? { search: debouncedSearch.trim() || undefined } : undefined
  )

  const userOptions: PickerOption[] = useMemo(
    () =>
      (membersData?.data ?? [])
        .map((m): PickerOption => ({
          kind: 'user',
          id: m.user_id,
          label: m.name?.trim() || m.email || '(unnamed user)',
          sublabel: m.name?.trim() ? m.email : undefined,
        }))
        .filter((o) => o.id),
    [membersData]
  )
  const groupOptions: PickerOption[] = useMemo(
    () =>
      (groupsData ?? [])
        .map((g): PickerOption => ({
          kind: 'group',
          id: g.id,
          label: g.name,
          sublabel: g.description || undefined,
        }))
        .filter((o) => o.id),
    [groupsData]
  )
  const pickerLoading = membersLoading || groupsLoading
  const totalOptions = userOptions.length + groupOptions.length

  const closeDialog = () => {
    setDialog(null)
    setSelectedOption(null)
    setPickerSearch('')
    setTag('')
  }

  const reportResult = (label: string, failed: number) => {
    if (failed === 0) {
      toast.success(`${label} for ${count} asset${count === 1 ? '' : 's'}`)
    } else if (failed < count) {
      toast.warning(`${label} for ${count - failed} of ${count}; ${failed} failed`)
    } else {
      toast.error(`Failed to update ${count} asset${count === 1 ? '' : 's'}`)
    }
  }

  const handleSetCriticality = async () => {
    setSubmitting(true)
    try {
      const failed = await runBulk(selected, (a) =>
        updateAsset(a.id, fullUpdate(a, { criticality }))
      )
      reportResult(`Set criticality to ${CRITICALITY_LABELS[criticality]}`, failed)
      if (failed < count) {
        closeDialog()
        onDone()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to set criticality'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTag = async () => {
    const value = tag.trim()
    if (!value) {
      toast.error('Enter a tag')
      return
    }
    setSubmitting(true)
    try {
      const failed = await runBulk(selected, (a) => {
        const nextTags = Array.from(new Set([...(a.tags ?? []), value]))
        return updateAsset(a.id, fullUpdate(a, { tags: nextTags }))
      })
      reportResult(`Added tag "${value}"`, failed)
      if (failed < count) {
        closeDialog()
        onDone()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add tag'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignOwner = async () => {
    if (!selectedOption) {
      toast.error('Select a user or group')
      return
    }
    setSubmitting(true)
    try {
      const failed = await runBulk(selected, (a) =>
        addAssetOwner(a.id, {
          userId: selectedOption.kind === 'user' ? selectedOption.id : undefined,
          groupId: selectedOption.kind === 'group' ? selectedOption.id : undefined,
          ownershipType,
        })
      )
      // A duplicate owner comes back as a rejection; treat "all failed" as a
      // hint rather than a hard error since some may already be owners.
      reportResult(
        `Assigned ${selectedOption.label} as ${OWNERSHIP_TYPE_LABELS[ownershipType].toLowerCase()} owner`,
        failed
      )
      if (failed < count) {
        closeDialog()
        onDone()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign owner'))
    } finally {
      setSubmitting(false)
    }
  }

  if (count === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="mx-1 h-4 w-px bg-border" />
        {canWrite ? (
          <>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setDialog('owner')}>
              <UserPlus className="me-1.5 h-3.5 w-3.5" />
              Assign owner
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setDialog('criticality')}
            >
              <ShieldAlert className="me-1.5 h-3.5 w-3.5" />
              Set criticality
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setDialog('tag')}>
              <TagIcon className="me-1.5 h-3.5 w-3.5" />
              Add tag
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Read-only — assets:write required</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto h-8"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="me-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Set criticality */}
      <Dialog open={dialog === 'criticality'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set criticality</DialogTitle>
            <DialogDescription>
              Apply a criticality to {count} selected asset{count === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Criticality</Label>
            <Select value={criticality} onValueChange={(v) => setCriticality(v as Criticality)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITICALITY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CRITICALITY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSetCriticality} disabled={submitting}>
              {submitting ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add tag */}
      <Dialog open={dialog === 'tag'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tag</DialogTitle>
            <DialogDescription>
              Add a tag to {count} selected asset{count === 1 ? '' : 's'}. Existing tags are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-tag">Tag</Label>
            <Input
              id="bulk-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. pci, external, team-payments"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) handleAddTag()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddTag} disabled={submitting || !tag.trim()}>
              {submitting ? 'Adding…' : 'Add tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign owner */}
      <Dialog open={dialog === 'owner'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign owner</DialogTitle>
            <DialogDescription>
              Assign a user or group to {count} selected asset{count === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Popover
                open={pickerOpen}
                onOpenChange={(open) => {
                  setPickerOpen(open)
                  if (!open) setPickerSearch('')
                }}
                modal
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className="w-full min-w-0 justify-between overflow-hidden font-normal"
                    title={selectedOption?.label}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm">
                      {selectedOption ? (
                        <>
                          {selectedOption.kind === 'user' ? (
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{selectedOption.label}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Select a user or group…</span>
                      )}
                    </span>
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={pickerSearch}
                      onValueChange={setPickerSearch}
                      placeholder="Search by name, email, or group…"
                    />
                    <CommandList>
                      {pickerLoading ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Loading…
                        </div>
                      ) : totalOptions === 0 ? (
                        <CommandEmpty>
                          {debouncedSearch
                            ? `No users or groups match "${debouncedSearch}".`
                            : 'No users or groups available.'}
                        </CommandEmpty>
                      ) : (
                        <>
                          {userOptions.length > 0 && (
                            <CommandGroup heading="Users">
                              {userOptions.map((option) => (
                                <CommandItem
                                  key={`user:${option.id}`}
                                  value={`user:${option.id}`}
                                  onSelect={() => {
                                    setSelectedOption(option)
                                    setPickerOpen(false)
                                    setPickerSearch('')
                                  }}
                                  className="flex items-start gap-2"
                                >
                                  <Check
                                    className={cn(
                                      'mt-1 h-4 w-4 shrink-0',
                                      selectedOption?.kind === 'user' &&
                                        selectedOption.id === option.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm">{option.label}</p>
                                    {option.sublabel && (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {option.sublabel}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {groupOptions.length > 0 && (
                            <CommandGroup heading="Groups">
                              {groupOptions.map((option) => (
                                <CommandItem
                                  key={`group:${option.id}`}
                                  value={`group:${option.id}`}
                                  onSelect={() => {
                                    setSelectedOption(option)
                                    setPickerOpen(false)
                                    setPickerSearch('')
                                  }}
                                  className="flex items-start gap-2"
                                >
                                  <Check
                                    className={cn(
                                      'mt-1 h-4 w-4 shrink-0',
                                      selectedOption?.kind === 'group' &&
                                        selectedOption.id === option.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <Building2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm">{option.label}</p>
                                    {option.sublabel && (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {option.sublabel}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Ownership role</Label>
              <Select
                value={ownershipType}
                onValueChange={(v) => setOwnershipType(v as OwnershipType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(OWNERSHIP_TYPE_LABELS) as [OwnershipType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAssignOwner} disabled={submitting || !selectedOption}>
              {submitting ? 'Assigning…' : 'Assign owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

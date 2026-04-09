'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Trash2,
  Building2,
  User,
  Pencil,
  Check,
  ChevronsUpDown,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePermissions, Permission } from '@/lib/permissions'
import useSWR from 'swr'
import { useTenant } from '@/context/tenant-provider'
import { get } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useDebounce } from '@/hooks/use-debounce'
import { useGroups } from '@/features/access-control/api/use-groups'

// Backend response shape for GET /tenants/{slug}/members?include=user
// (defined inline because the typed lib hook doesn't support include param yet)
interface MemberWithUserResponse {
  id: string
  user_id: string
  role: string
  email: string
  name: string
  avatar_url?: string
  status?: string
}
interface MembersResponse {
  data: MemberWithUserResponse[]
  total: number
}
import {
  useAssetOwners,
  addAssetOwner,
  updateAssetOwner,
  removeAssetOwner,
} from '../hooks/use-asset-owners'
import type { AssetOwner, OwnershipType } from '../types'
import { OWNERSHIP_TYPE_LABELS, OWNERSHIP_TYPE_COLORS, OWNERSHIP_TYPE_DESCRIPTIONS } from '../types'

// ============================================
// PICKER OPTION TYPE
// ============================================

// Discriminated union: the picker offers BOTH users and groups in a single
// list, so each option carries its own kind. The `kind` drives both the
// rendering (User icon vs Group icon) and the submit payload (userId vs
// groupId).
type PickerOption =
  | { kind: 'user'; id: string; label: string; sublabel?: string }
  | { kind: 'group'; id: string; label: string; sublabel?: string }

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

// Single-row renderer for the unified owner picker. Extracted from the JSX
// because it is reused for both the Users and Groups CommandGroup sections,
// and inlining it twice would force the two branches to drift over time.
function PickerItemRow({
  option,
  selected,
  onSelect,
}: {
  option: PickerOption
  selected: boolean
  onSelect: () => void
}) {
  const Icon = option.kind === 'user' ? User : Building2
  const iconColor = option.kind === 'user' ? 'text-blue-500' : 'text-purple-500'
  return (
    <CommandItem
      // Including kind in the value lets Radix's selection state distinguish
      // a user and a group with the same UUID (shouldn't happen, but cheap
      // belt-and-braces).
      value={`${option.kind}:${option.id}`}
      onSelect={onSelect}
      className="flex items-start gap-2"
    >
      <Check className={cn('mt-1 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
      <Icon className={cn('mt-1 h-4 w-4 shrink-0', iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{option.label}</p>
        {option.sublabel && (
          <p className="text-xs text-muted-foreground truncate">{option.sublabel}</p>
        )}
      </div>
    </CommandItem>
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

  // Add owner form state — `selectedOption` is the chosen user OR group,
  // tagged with its kind. The previous version had a separate "Owner Type"
  // dropdown the user had to set FIRST before the picker would even show
  // any options. Most operators didn't notice the dropdown and assumed
  // they could only assign groups (the option that happened to be
  // visible). Now both kinds are listed in a single picker, grouped into
  // "Users" and "Groups" sections.
  const [selectedOption, setSelectedOption] = useState<PickerOption | null>(null)
  const [addOwnershipType, setAddOwnershipType] = useState<OwnershipType>('primary')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Picker search — debounced so we don't fire a network request on every
  // keystroke. The actual filtering is done server-side via the `search`
  // query parameter on /tenants/{slug}/members and /groups, so this scales
  // to tenants with thousands of members.
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebounce(searchValue, 250)

  // Edit owner state
  const [editOwnershipType, setEditOwnershipType] = useState<OwnershipType>('primary')

  // Fetch options for the picker.
  //
  // Server-side search via `?search=` + `?include=user` so the picker scales
  // to tenants with thousands of members. We fetch a fixed `limit=50` and
  // let the user narrow down with the search input — there is no infinite
  // scroll because in practice the user always types a few characters of
  // the name/email, and 50 results is enough to cover any reasonable typo.
  //
  // Without `include=user` the backend returns only IDs/roles (no name or
  // email), and the picker shows everything as "(no name)". That was the
  // original bug.
  //
  // Both members AND groups are fetched in parallel and ONLY when the
  // dialog is open. This is what powers the unified picker.
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? null
  const PICKER_PAGE_SIZE = 50

  const buildMembersUrl = () => {
    if (!showAddDialog || !tenantSlug) return null
    const params = new URLSearchParams({
      include: 'user',
      limit: String(PICKER_PAGE_SIZE),
    })
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim())
    }
    return `/api/v1/tenants/${tenantSlug}/members?${params.toString()}`
  }

  const { data: membersData, isLoading: membersLoading } = useSWR<MembersResponse>(
    buildMembersUrl(),
    (url: string) => get<MembersResponse>(url),
    { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
  )

  // Groups also support a `search` filter via the existing useGroups hook;
  // pass it through so groups picker also scales. We pass `undefined` (the
  // hook's "skip" signal) when the dialog is closed.
  const { groups: groupsData, isLoading: groupsLoading } = useGroups(
    showAddDialog ? { search: debouncedSearch.trim() || undefined } : undefined
  )

  const pickerLoading = membersLoading || groupsLoading

  // Sets of IDs already assigned to this asset, split by user vs group.
  // Used to filter the picker so the user can't pick someone who's
  // already an owner — picking a duplicate would round-trip to a 409
  // and a "already an owner" toast. Better UX: never offer them.
  // Same approach as the relationship picker (#115 hide-already-related).
  const takenUserIds = useMemo(
    () => new Set(owners.filter((o) => o.userId).map((o) => o.userId as string)),
    [owners]
  )
  const takenGroupIds = useMemo(
    () => new Set(owners.filter((o) => o.groupId).map((o) => o.groupId as string)),
    [owners]
  )

  // Owner list display state — search + sort. The list scales to
  // dozens of owners (typical asset has 1–10, critical infrastructure
  // can have 30+). The list is sorted by ownership type priority so
  // the primary owner is always at the top, then by assigned-at desc
  // so newest assignments surface first within each tier.
  //
  // The search input only appears once the list crosses a small
  // threshold so the typical 1–5 owner case stays uncluttered.
  const SEARCH_THRESHOLD = 5
  const [ownerSearch, setOwnerSearch] = useState('')

  // Lower number = higher priority. Order matches the canonical
  // ownership hierarchy (RACI-ish). Unknown values sort last.
  const ownershipPriority: Record<string, number> = {
    primary: 0,
    secondary: 1,
    stakeholder: 2,
    accountable: 2,
    responsible: 3,
    informed: 4,
    consulted: 4,
    regulatory: 5,
  }

  const sortedOwners = useMemo(() => {
    return [...owners].sort((a, b) => {
      const pa = ownershipPriority[a.ownershipType] ?? 99
      const pb = ownershipPriority[b.ownershipType] ?? 99
      if (pa !== pb) return pa - pb
      // Same priority: newest assignment first.
      const ta = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
      const tb = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
      return tb - ta
    })
    // ownershipPriority is module-level constant; safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owners])

  const visibleOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase()
    if (!q) return sortedOwners
    return sortedOwners.filter((o) => {
      const haystack = [o.userName, o.userEmail, o.groupName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [sortedOwners, ownerSearch])

  // Normalise both sources to the discriminated PickerOption type. Members
  // API returns FLAT fields (m.name, m.email) — see MemberWithUserResponse
  // above. Each option carries `kind` so the renderer can pick the right
  // icon and the submit handler can decide between userId vs groupId.
  const userOptions: PickerOption[] = useMemo(() => {
    return (membersData?.data ?? [])
      .map(
        (m): PickerOption => ({
          kind: 'user',
          id: m.user_id,
          label: m.name?.trim() || m.email || '(unnamed user)',
          sublabel: m.name?.trim() ? m.email : undefined,
        })
      )
      .filter((o) => o.id && !takenUserIds.has(o.id))
  }, [membersData, takenUserIds])

  const groupOptions: PickerOption[] = useMemo(() => {
    return (groupsData ?? [])
      .map(
        (g): PickerOption => ({
          kind: 'group',
          id: g.id,
          label: g.name,
          sublabel: g.description || undefined,
        })
      )
      .filter((o) => o.id && !takenGroupIds.has(o.id))
  }, [groupsData, takenGroupIds])

  const totalOptions = userOptions.length + groupOptions.length
  const totalTaken = takenUserIds.size + takenGroupIds.size

  const resetAddForm = () => {
    setSelectedOption(null)
    setAddOwnershipType('primary')
  }

  const handleAdd = async () => {
    if (!selectedOption) {
      toast.error('Please select a user or group')
      return
    }
    setIsSubmitting(true)
    try {
      await addAssetOwner(assetId, {
        userId: selectedOption.kind === 'user' ? selectedOption.id : undefined,
        groupId: selectedOption.kind === 'group' ? selectedOption.id : undefined,
        ownershipType: addOwnershipType,
      })
      toast.success(
        `${selectedOption.label} added as ${OWNERSHIP_TYPE_LABELS[addOwnershipType].toLowerCase()} owner`
      )
      setShowAddDialog(false)
      resetAddForm()
      mutate()
    } catch (error) {
      // Surface the backend's actual error message instead of a generic
      // "Failed to add owner". The backend returns 409 Conflict with
      // "This owner is already assigned to the asset" for duplicates,
      // 400 Bad Request for invalid IDs, 403 for permission, etc.
      // Special-case the duplicate to give the user an actionable hint
      // (suggest editing the existing owner instead).
      const message = getErrorMessage(error, 'Failed to add owner')
      const isDuplicate =
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('conflict')
      if (isDuplicate) {
        toast.error(`${selectedOption.label} is already an owner of this asset`, {
          description: 'To change their role, edit the existing owner instead.',
        })
      } else {
        toast.error(message)
      }
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
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update owner'))
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
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove owner'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEditClick = (owner: AssetOwner) => {
    setEditOwner(owner)
    setEditOwnershipType(owner.ownershipType)
  }

  // CRITICAL: Do NOT early-return on isLoading. The Add/Edit/Remove dialogs
  // are rendered as children of this component — if we unmount and re-mount
  // the tree on every SWR revalidation (e.g. when the user clicks the Add
  // Owner button and triggers a focus event), the dialog state is lost and
  // the user sees a "flicker". Instead, render the loading state inline and
  // keep the dialogs mounted at all times.

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Owners ({isLoading ? '…' : owners.length})</h3>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Owner
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading owners...
        </div>
      ) : owners.length === 0 ? (
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
          {/*
            Search input only appears when the list grows beyond
            SEARCH_THRESHOLD owners — keeps the typical 1–5 case
            visually clean.
          */}
          {owners.length > SEARCH_THRESHOLD && (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder="Search owners by name, email, or group…"
                  className="pl-8 h-8 text-sm"
                />
                {ownerSearch && (
                  <button
                    type="button"
                    onClick={() => setOwnerSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {ownerSearch && (
                <p className="text-xs text-muted-foreground">
                  Showing {visibleOwners.length} of {owners.length}
                </p>
              )}
            </div>
          )}

          {/*
            Bounded scroll container so a long owner list doesn't push
            other tab content off-screen. ~10 OwnerCards fit before the
            scrollbar appears (each card is ~64px). The Sheet itself
            still scrolls outside this container, so the search bar
            stays visible while the operator scans the list.
          */}
          <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
            {visibleOwners.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No owners match &ldquo;{ownerSearch}&rdquo;.
              </p>
            ) : (
              visibleOwners.map((owner) => (
                <OwnerCard
                  key={owner.id}
                  owner={owner}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEditClick}
                  onRemove={setRemoveOwnerTarget}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Owner Dialog
          NOTE: This dialog is nested inside the AssetDetailSheet (also a Radix
          dialog primitive). Without these guards, clicking inside the inner
          dialog can be interpreted as "outside" by the parent sheet's focus
          guard, causing visual flicker. Closing only happens via Cancel/X. */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) resetAddForm()
        }}
      >
        <DialogContent
          // max-h + overflow-y-auto ensures the footer (Cancel / Add Owner
          // buttons) always remains reachable, even when the dialog content
          // is taller than the viewport. Without this the buttons could be
          // pushed below the visible area on short screens.
          className="max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Add Owner</DialogTitle>
            <DialogDescription>
              Assign a user or group to be responsible for this asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Unified picker — both users and groups in a single list,
                grouped into "Users" and "Groups" sections. The previous
                version had a separate "Owner Type" Select that operators
                kept missing, leading them to believe only groups were
                assignable. */}
            <div className="space-y-2">
              <Label>Owner</Label>
              <Popover
                open={pickerOpen}
                onOpenChange={(open) => {
                  setPickerOpen(open)
                  // Clear search when popover closes so reopening starts fresh
                  if (!open) setSearchValue('')
                }}
                modal
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    // The trigger shows the label plus a small icon hinting
                    // at the kind (User vs Group). Never the sublabel — we
                    // learned the hard way that rendering long emails inline
                    // can blow out the dialog width.
                    className="w-full min-w-0 overflow-hidden justify-between font-normal"
                    title={selectedOption?.label}
                  >
                    <span className="flex-1 min-w-0 flex items-center gap-2 text-left text-sm">
                      {selectedOption ? (
                        <>
                          {selectedOption.kind === 'user' ? (
                            <User className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                          )}
                          <span className="truncate">{selectedOption.label}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Select a user or group…</span>
                      )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                  // Same nested-dialog guards: prevent the parent dialog from
                  // interpreting clicks inside the popover as outside-clicks.
                  onPointerDownOutside={(e) => {
                    const target = e.target as HTMLElement | null
                    if (target?.closest('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault()
                    }
                  }}
                >
                  {/*
                    shouldFilter={false} disables Radix Command's client-side
                    filtering. The server is the authoritative filter — we
                    pass `searchValue` straight to the API. Otherwise Radix
                    would also try to filter the 50 results we fetched,
                    which would HIDE results that matched the server query
                    but didn't happen to match Radix's local fuzzy match.
                  */}
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={searchValue}
                      onValueChange={setSearchValue}
                      placeholder="Search by name, email, or group…"
                    />
                    <CommandList>
                      {pickerLoading ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Loading…
                        </div>
                      ) : totalOptions === 0 ? (
                        <CommandEmpty>
                          <div className="space-y-1">
                            <p>
                              {debouncedSearch
                                ? `No users or groups match "${debouncedSearch}".`
                                : 'No users or groups available.'}
                            </p>
                            {/* Tell the user *why* the picker may be empty
                                when the only reason is "everything is
                                already an owner". Otherwise the empty
                                state looks like a bug. */}
                            {totalTaken > 0 && !debouncedSearch && (
                              <p className="text-[11px]">
                                {totalTaken} owner
                                {totalTaken === 1 ? ' is' : 's are'} already assigned to this asset
                                and therefore hidden.
                              </p>
                            )}
                          </div>
                        </CommandEmpty>
                      ) : (
                        <>
                          {userOptions.length > 0 && (
                            <CommandGroup heading="Users">
                              {userOptions.map((option) => (
                                <PickerItemRow
                                  key={`user:${option.id}`}
                                  option={option}
                                  selected={
                                    selectedOption?.kind === 'user' &&
                                    selectedOption.id === option.id
                                  }
                                  onSelect={() => {
                                    setSelectedOption(option)
                                    setPickerOpen(false)
                                    setSearchValue('')
                                  }}
                                />
                              ))}
                            </CommandGroup>
                          )}
                          {groupOptions.length > 0 && (
                            <CommandGroup heading="Groups">
                              {groupOptions.map((option) => (
                                <PickerItemRow
                                  key={`group:${option.id}`}
                                  option={option}
                                  selected={
                                    selectedOption?.kind === 'group' &&
                                    selectedOption.id === option.id
                                  }
                                  onSelect={() => {
                                    setSelectedOption(option)
                                    setPickerOpen(false)
                                    setSearchValue('')
                                  }}
                                />
                              ))}
                            </CommandGroup>
                          )}
                          {/* Hint when EITHER list is capped at PICKER_PAGE_SIZE
                              — encourages user to refine their search */}
                          {(userOptions.length >= PICKER_PAGE_SIZE ||
                            groupOptions.length >= PICKER_PAGE_SIZE) && (
                            <div className="border-t px-3 py-2 text-[11px] text-muted-foreground text-center">
                              Showing first {PICKER_PAGE_SIZE} per section — type to refine
                            </div>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Show the selected option's sublabel (email for users,
                  description for groups) below the button where it can
                  wrap freely without breaking the dialog layout. */}
              {selectedOption?.sublabel && (
                <p className="text-xs text-muted-foreground break-words">
                  {selectedOption.sublabel}
                </p>
              )}
            </div>

            {/* Ownership role — SelectItem children intentionally show ONLY
                the label (e.g. "Primary"). The description for the currently
                selected role is the single helper line below the dropdown.
                Putting the description inside the SelectItem made Radix
                render it inside the trigger AS WELL, creating a 2-line
                trigger and a duplicate of the helper text. */}
            <div className="space-y-2">
              <Label>Ownership Role</Label>
              <Select
                value={addOwnershipType}
                onValueChange={(v) => setAddOwnershipType(v as OwnershipType)}
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
              <p className="text-xs text-muted-foreground">
                {OWNERSHIP_TYPE_DESCRIPTIONS[addOwnershipType]}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                resetAddForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting || !selectedOption}>
              {isSubmitting ? 'Adding...' : 'Add Owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog — same nested-dialog guards as Add */}
      <Dialog open={!!editOwner} onOpenChange={(open) => !open && setEditOwner(null)}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
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

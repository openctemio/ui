'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  DisabledMenuItem,
  MetricStrip,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import {
  UserPlus,
  Shield,
  CheckCircle,
  MoreHorizontal,
  Trash2,
  Send,
  Ban,
  Search as SearchIcon,
  Eye,
  Pencil,
  Activity,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react'
import { useUrlFilter } from '@/hooks/use-url-param'
import { useTenant } from '@/context/tenant-provider'
import {
  useMembers,
  useInvitations,
  type MemberWithUser,
  type MemberRole,
  type MemberRBACRole,
  STATUS_DISPLAY,
  AddUserDialog,
  InviteUserDialog,
  RoleChecklist,
  SetupLinkDialog,
  issueSetupLink,
  type SetupLinkTarget,
  isPeerAdminLocked,
  PEER_ADMIN_LOCK_REASON,
} from '@/features/organization'
import { PendingSetupBadge } from '@/features/shared'
import { useUserRoles, useRoles, useSetUserRoles, type Role } from '@/features/access-control'
import { createContext, useContext } from 'react'

// Context to pass member roles without N+1 API calls
type MemberRolesMap = Map<string, MemberRBACRole[]>
const MemberRolesContext = createContext<MemberRolesMap>(new Map())
import { fetcherWithOptions } from '@/lib/api/client'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { useUser } from '@/stores/auth-store'
import { MemberMfaBadge } from '@/features/organization/components/member-mfa-badge'

/**
 * The management actions of an administrator row, disabled for a caller who
 * is not the owner, each explaining why on hover or focus.
 */
function PeerAdminLockedItems() {
  return (
    <>
      <DropdownMenuSeparator />
      <DisabledMenuItem label="Change roles" icon={Pencil} reason={PEER_ADMIN_LOCK_REASON} />
      <DisabledMenuItem label="Suspend" icon={Ban} reason={PEER_ADMIN_LOCK_REASON} />
      <DisabledMenuItem label="Remove member" icon={Trash2} reason={PEER_ADMIN_LOCK_REASON} />
    </>
  )
}

// Tab values for the status filter on the members table. Pending
// invitations live in their own section (not in the members list), so
// they are NOT a tab here. The user-level "inactive" status is also
// excluded — it was always 0 in practice and has no admin UI.
type StatusFilter = 'all' | 'active' | 'suspended'
type RoleFilter = 'all' | MemberRole

// Static config
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

// Helper functions
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatLastActive = (lastLoginAt?: string) => {
  if (!lastLoginAt) return 'Never'
  const date = new Date(lastLoginAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(lastLoginAt)
}

// Role chips are neutral: a role is a label, not a state, so it gets no colour of
// its own (the old per-role palette read as severity and broke in dark mode).
const getRoleColor = (role: Role) =>
  role.is_system ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-foreground'

const MEMBER_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
}

function MemberStatusBadge({ status, pendingSetup }: { status: string; pendingSetup?: boolean }) {
  // An admin-created account whose password is not set yet: the membership is
  // active, but the person cannot sign in until they use their setup link.
  if (pendingSetup && status !== 'suspended') return <PendingSetupBadge />
  const label =
    MEMBER_STATUS_LABEL[status] ??
    STATUS_DISPLAY[status as keyof typeof STATUS_DISPLAY]?.label ??
    status
  return (
    <Badge
      variant={status === 'active' ? 'secondary' : 'outline'}
      className={status === 'suspended' ? 'border-destructive/40 text-destructive' : undefined}
    >
      {label}
    </Badge>
  )
}

// Helper to convert MemberRBACRole to Role-like object for styling
const memberRBACRoleToRole = (role: MemberRBACRole): Role => ({
  id: role.id,
  name: role.name,
  slug: role.slug,
  is_system: role.is_system,
  description: '',
  permissions: [],
  hierarchy_level: 0,
  has_full_data_access: false,
  permission_count: 0,
  created_at: '',
  updated_at: '',
})

// Component to display user's RBAC roles (compact for table)
// Uses roles from MemberRolesContext if available, otherwise falls back to useUserRoles hook
function UserRolesCell({ userId }: { userId: string }) {
  const memberRolesMap = useContext(MemberRolesContext)
  const cachedRoles = memberRolesMap.get(userId)

  // Fallback to individual API call if roles not in context (backward compatibility)
  const { roles: fetchedRoles, isLoading } = useUserRoles(
    cachedRoles === undefined ? userId : null // Only fetch if not in cache
  )

  // Use cached roles if available, otherwise use fetched roles
  const roles = cachedRoles !== undefined ? cachedRoles : fetchedRoles

  if (isLoading && cachedRoles === undefined) {
    return <Skeleton className="h-6 w-20" />
  }

  if (!roles || roles.length === 0) {
    return <span className="text-muted-foreground text-xs">No roles</span>
  }

  // Handle both MemberRBACRole (from context) and Role (from useUserRoles) types
  const displayRoles =
    cachedRoles !== undefined ? roles.map(memberRBACRoleToRole) : (roles as Role[])

  return (
    <div className="flex flex-wrap gap-1">
      {displayRoles.slice(0, 2).map((role) => (
        <Badge key={role.id} className={`${getRoleColor(role)} border-0 text-xs`}>
          {role.name}
        </Badge>
      ))}
      {displayRoles.length > 2 && (
        <Badge variant="secondary" className="text-xs">
          +{displayRoles.length - 2}
        </Badge>
      )}
    </div>
  )
}

// Component to display user's roles with details (for sheet)
// Uses roles from MemberRolesContext - NO API call needed for viewing
// API call only happens when user clicks "Manage" to edit roles
function UserRolesDetailCard({
  userId,
  onManageRoles,
}: {
  userId: string
  onManageRoles?: () => void
}) {
  const memberRolesMap = useContext(MemberRolesContext)
  const cachedRoles = memberRolesMap.get(userId)

  // Convert to display format
  const roles = cachedRoles?.map(memberRBACRoleToRole) || []

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Assigned roles</h4>
        {onManageRoles && (
          <Can permission={Permission.RolesWrite}>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onManageRoles}>
              <Pencil className="me-1 h-3 w-3" />
              Manage
            </Button>
          </Can>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-4">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No roles assigned</p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-1.5 rounded-lg ${getRoleColor(role)}`}>
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{role.name}</p>
                  {role.is_system && (
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      System
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {role.description}
                  </p>
                )}
                {role.permission_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {role.permission_count} permissions
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Dialog for editing user roles
function EditUserRolesDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: MemberWithUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  // Only fetch data when dialog is actually open (avoid unnecessary API calls)
  const {
    roles: userRoles,
    isLoading: userRolesLoading,
    mutate: mutateUserRoles,
  } = useUserRoles(open ? member?.user_id || null : null)
  const { roles: allRoles, isLoading: allRolesLoading } = useRoles({ skip: !open })
  const { setUserRoles, isSetting } = useSetUserRoles(open ? member?.user_id || null : null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  // Initialize selected roles ONCE per open session. The previous version
  // re-ran on every userRoles reference change, which meant any SWR
  // revalidate (e.g. after a tab focus or a manual mutate elsewhere)
  // silently wiped the user's in-progress checkbox toggles. Track init
  // with a ref and reset it when the dialog closes.
  const initialized = useRef(false)
  useEffect(() => {
    if (!open) {
      initialized.current = false
      return
    }
    if (!initialized.current && !userRolesLoading && userRoles.length > 0) {
      setSelectedRoleIds(userRoles.map((r) => r.id))
      initialized.current = true
    } else if (!initialized.current && !userRolesLoading) {
      // Loaded with empty result — still mark as initialized so we don't
      // overwrite an explicit "select nothing" state on re-render.
      setSelectedRoleIds([])
      initialized.current = true
    }
  }, [open, userRoles, userRolesLoading])

  const handleSave = async () => {
    try {
      await setUserRoles({ role_ids: selectedRoleIds })
      toast.success('Roles updated successfully')
      mutateUserRoles()
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update roles'))
    }
  }

  const isLoading = userRolesLoading || allRolesLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle>Manage roles</DialogTitle>
          {member && <DialogDescription>{member.name}</DialogDescription>}
        </DialogHeader>

        <div className="py-4">
          <RoleChecklist
            roles={allRoles}
            selected={selectedRoleIds}
            onChange={setSelectedRoleIds}
            loading={isLoading}
            disabled={isSetting}
            className="max-h-[400px]"
          />
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <div className="flex-1 text-start">
            {selectedRoleIds.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedRoleIds.length} role{selectedRoleIds.length > 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSetting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSetting || isLoading}>
            {isSetting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="me-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug
  // Peer administrators are the owner's to manage (the API answers 403 to
  // anyone else); their rows show the actions disabled, with the reason.
  const { isOwner } = usePermissions()
  const currentUser = useUser()
  const caller = { isOwner: isOwner(), userId: currentUser?.id }

  // API Hooks - includeRoles: true to get RBAC roles in single API call (avoids N+1)
  const {
    members,
    isLoading: membersLoading,
    isError: membersError,
    mutate: mutateMembers,
  } = useMembers(tenantSlug, { includeRoles: true })
  // Note: Stats are calculated from members/invitations data to avoid extra API call

  // Build roles map from members data for O(1) lookup in table cells
  const memberRolesMap = useMemo(() => {
    const map: MemberRolesMap = new Map()
    members.forEach((member) => {
      if (member.rbac_roles) {
        map.set(member.user_id, member.rbac_roles)
      }
    })
    return map
  }, [members])
  const { invitations: rawInvitations, mutate: mutateInvitations } = useInvitations(tenantSlug)

  // Filter out expired invitations (safety net - API should already filter)
  const invitations = useMemo(() => {
    const now = new Date()
    return rawInvitations.filter((inv) => new Date(inv.expires_at) > now)
  }, [rawInvitations])

  // UI State
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [setupLinkTarget, setSetupLinkTarget] = useState<SetupLinkTarget | null>(null)
  const [editRolesMember, setEditRolesMember] = useState<MemberWithUser | null>(null)
  const [editRolesDialogOpen, setEditRolesDialogOpen] = useState(false)
  // Track pending roles edit (used when transitioning from sheet to dialog)
  const [pendingRolesEdit, setPendingRolesEdit] = useState<MemberWithUser | null>(null)
  // Suspend confirmation: holds the member awaiting confirmation, plus an
  // in-flight flag so the action button can show a spinner and be disabled
  // while the request is pending.
  const [suspendConfirmMember, setSuspendConfirmMember] = useState<MemberWithUser | null>(null)
  const [isSuspending, setIsSuspending] = useState(false)
  // Remove confirmation: same shape, but for the destructive Remove action.
  // Remove deletes the membership row entirely (and any pending invitations
  // tied to the email) so it deserves at least as much friction as Suspend.
  const [removeConfirmMember, setRemoveConfirmMember] = useState<MemberWithUser | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Track if sheet is fully closed (after animation completes)
  const [isSheetAnimating, setIsSheetAnimating] = useState(false)

  // Effect to open roles dialog after sheet closes with delay for animation
  useEffect(() => {
    if (pendingRolesEdit && !selectedMember) {
      setIsSheetAnimating(true)
      // Wait for sheet close animation to fully complete before opening dialog
      const timeoutId = setTimeout(() => {
        setIsSheetAnimating(false)
        setEditRolesMember(pendingRolesEdit)
        setEditRolesDialogOpen(true)
        setPendingRolesEdit(null)
      }, 400) // Allow extra time for sheet animation to fully complete

      return () => {
        clearTimeout(timeoutId)
        setIsSheetAnimating(false)
      }
    }
  }, [pendingRolesEdit, selectedMember])
  // Search and filters live in the URL so a filtered member list can be linked to.
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [statusParam, setStatusFilter] = useUrlFilter('status', 'all')
  const [roleParam, setRoleFilter] = useUrlFilter('role', 'all')
  const statusFilter: StatusFilter = statusFilters.some((f) => f.value === statusParam)
    ? (statusParam as StatusFilter)
    : 'all'
  const roleFilter: RoleFilter = roleFilters.some((f) => f.value === roleParam)
    ? (roleParam as RoleFilter)
    : 'all'
  // Role names for the pending-invitations table (only fetched when there are any).
  const { roles: availableRolesForInvite } = useRoles({ skip: invitations.length === 0 })

  // Refresh all data
  const refreshData = useCallback(() => {
    if (tenantSlug) {
      mutateMembers()
      mutateInvitations()
    }
  }, [tenantSlug, mutateMembers, mutateInvitations])

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...members]

    if (statusFilter !== 'all') {
      data = data.filter((member) => member.status === statusFilter)
    }

    if (roleFilter !== 'all') {
      data = data.filter((member) => member.role === roleFilter)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      data = data.filter(
        (member) =>
          member.name?.toLowerCase().includes(q) ||
          member.email?.toLowerCase().includes(q) ||
          member.rbac_roles?.some((r) => r.name.toLowerCase().includes(q))
      )
    }

    return data
  }, [members, statusFilter, roleFilter, searchQuery])

  // Status counts from members (for the metric strip). Pending invitations are
  // listed in their own section below the table.
  const statusCounts: Record<StatusFilter, number> = useMemo(
    () => ({
      all: members.length,
      active: members.filter((m) => m.status === 'active').length,
      suspended: members.filter((m) => m.status === 'suspended').length,
    }),
    [members]
  )

  // Table columns. The select-checkbox column was removed alongside the
  // bulk-actions dropdown — there's nothing to do with selected rows now.
  const columns: ColumnDef<MemberWithUser>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Roles',
      enableSorting: false,
      cell: ({ row }) => {
        return <UserRolesCell userId={row.original.user_id} />
      },
    },
    {
      accessorKey: 'joined_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.joined_at)}</span>
      ),
    },
    {
      accessorKey: 'last_login_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last active" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatLastActive(row.original.last_login_at)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <MemberStatusBadge status={row.original.status} pendingSetup={row.original.pending_setup} />
      ),
    },
    // Two-factor status: the API includes it for owners and admins only.
    ...(members.some((m) => m.mfa_status)
      ? [
          {
            id: 'mfa',
            header: '2FA',
            enableSorting: false,
            cell: ({ row }) => <MemberMfaBadge status={row.original.mfa_status} />,
          } satisfies ColumnDef<MemberWithUser>,
        ]
      : []),
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original
        const isOwnerRow = member.role === 'owner'
        const locked = isPeerAdminLocked(member, caller)

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Actions for ${member.name || member.email}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                <Eye className="me-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              {!isOwnerRow && locked && (
                <Can permission={Permission.MembersManage} minRole="admin">
                  <PeerAdminLockedItems />
                </Can>
              )}
              {!isOwnerRow && !locked && (
                <>
                  <Can permission={Permission.RolesAssign}>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditRolesMember(member)
                        setEditRolesDialogOpen(true)
                      }}
                    >
                      <Pencil className="me-2 h-4 w-4" />
                      Change roles
                    </DropdownMenuItem>
                  </Can>
                  <Can permission={Permission.MembersManage} minRole="admin">
                    {member.pending_setup && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setSetupLinkTarget({
                            userId: member.user_id,
                            email: member.email,
                            name: member.name,
                          })
                        }}
                      >
                        <KeyRound className="me-2 h-4 w-4" />
                        Get setup link
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {member.status === 'suspended' ? (
                      <DropdownMenuItem
                        onClick={async () => {
                          if (!tenantSlug) return
                          try {
                            await fetcherWithOptions(
                              tenantEndpoints.reactivateMember(tenantSlug, member.id),
                              { method: 'POST' }
                            )
                            toast.success(`${member.name || member.email} reactivated`)
                            refreshData()
                          } catch {
                            toast.error('Failed to reactivate member')
                          }
                        }}
                      >
                        <CheckCircle className="me-2 h-4 w-4" />
                        Reactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          // Open confirmation dialog instead of firing
                          // immediately. onSelect lets the dropdown close
                          // cleanly before the AlertDialog opens.
                          e.preventDefault()
                          setSuspendConfirmMember(member)
                        }}
                      >
                        <Ban className="me-2 h-4 w-4" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        // Open confirmation instead of firing immediately.
                        // onSelect lets the dropdown close cleanly first.
                        e.preventDefault()
                        setRemoveConfirmMember(member)
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      Remove member
                    </DropdownMenuItem>
                  </Can>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Actions
  // Confirm and execute the pending removal. Called from the AlertDialog
  // action button — keeps removal a deliberate two-click action.
  const handleConfirmRemove = async () => {
    if (!tenantSlug || !removeConfirmMember) return
    setIsRemoving(true)
    try {
      await fetcherWithOptions(tenantEndpoints.removeMember(tenantSlug, removeConfirmMember.id), {
        method: 'DELETE',
      })
      toast.success(
        `Removed ${removeConfirmMember.name || removeConfirmMember.email} from the team`
      )
      setRemoveConfirmMember(null)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove member'))
    } finally {
      setIsRemoving(false)
    }
  }

  // Confirm and execute the pending suspend. Called from the AlertDialog
  // action button — keeps suspension a deliberate two-click action.
  const handleConfirmSuspend = async () => {
    if (!tenantSlug || !suspendConfirmMember) return
    setIsSuspending(true)
    try {
      await fetcherWithOptions(tenantEndpoints.suspendMember(tenantSlug, suspendConfirmMember.id), {
        method: 'POST',
      })
      toast.success(`${suspendConfirmMember.name || suspendConfirmMember.email} suspended`)
      setSuspendConfirmMember(null)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to suspend member'))
    } finally {
      setIsSuspending(false)
    }
  }

  // Pending invitations table. Actions are the per-row menu like every other list.
  type Invitation = (typeof invitations)[number]
  const resendInvite = async (invitation: Invitation) => {
    if (!tenantSlug) return
    try {
      await fetcherWithOptions(tenantEndpoints.resendInvitation(tenantSlug, invitation.id), {
        method: 'POST',
      })
      toast.success('Invitation email resent')
    } catch {
      toast.error('Failed to resend invitation')
    }
  }
  const cancelInvite = async (invitation: Invitation) => {
    if (!tenantSlug) return
    try {
      await fetcherWithOptions(tenantEndpoints.deleteInvitation(tenantSlug, invitation.id), {
        method: 'DELETE',
      })
      toast.success('Invitation cancelled')
      refreshData()
    } catch {
      toast.error('Failed to cancel invitation')
    }
  }

  const invitationColumns: ColumnDef<Invitation>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: false,
      cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
    },
    {
      id: 'roles',
      header: 'Roles',
      enableSorting: false,
      cell: ({ row }) => {
        const invitation = row.original
        // Role names from role_ids (resolved when the role list is loaded).
        const invitedRoles = (invitation.role_ids || [])
          .map((id) => availableRolesForInvite.find((r) => r.id === id))
          .filter((r): r is NonNullable<typeof r> => r != null)
        if (invitedRoles.length > 0) {
          return (
            <div className="flex flex-wrap items-center gap-1">
              {invitedRoles.slice(0, 2).map((role) => (
                <Badge key={role.id} className={`${getRoleColor(role)} border-0 text-xs`}>
                  {role.name}
                </Badge>
              ))}
              {invitedRoles.length > 2 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs cursor-pointer">
                      +{invitedRoles.length - 2}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {invitedRoles
                      .slice(2)
                      .map((r) => r.name)
                      .join(', ')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        }
        /* Invitations created before the RBAC role picker carry only the
           legacy `role` field ("member", "admin", ...) with empty role_ids —
           show that rather than a confusing "No roles". */
        return (
          <Badge variant="secondary" className="text-xs capitalize">
            {invitation.role || 'No roles'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      enableSorting: false,
      cell: ({ row }) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(row.original.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry > 0
        const isExpired = daysUntilExpiry <= 0
        return (
          <span
            className={`text-sm ${isExpired || isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {isExpired
              ? 'Expired'
              : isExpiringSoon
                ? `In ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`
                : formatDate(row.original.expires_at)}
          </span>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            { label: 'Resend email', icon: Send, onClick: () => resendInvite(row.original) },
            {
              label: 'Cancel invitation',
              icon: Trash2,
              destructive: true,
              separatorBefore: true,
              onClick: () => cancelInvite(row.original),
            },
          ]}
        />
      ),
    },
  ]

  const toggleStatus = (next: StatusFilter) => setStatusFilter(statusFilter === next ? 'all' : next)

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
          aria-label="Search users"
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusFilters.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
        <SelectTrigger className="h-9 w-[130px]" aria-label="Membership role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleFilters.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <MemberRolesContext.Provider value={memberRolesMap}>
      <Main>
        <PageHeader
          title="Members"
          description="People in this organization, their roles and pending invitations."
        >
          {/* Accounts are created by owners/admins (no self-registration);
              inviting someone who already has an account stays available. */}
          <Can permission={Permission.MembersInvite} minRole="admin" mode="disable">
            <Button size="sm" variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <Send className="me-2 h-4 w-4" />
              Invite user
            </Button>
          </Can>
          <Can permission={Permission.MembersManage} minRole="admin" mode="disable">
            <Button size="sm" onClick={() => setAddUserOpen(true)}>
              <UserPlus className="me-2 h-4 w-4" />
              Add user
            </Button>
          </Can>
        </PageHeader>

        {membersError && !membersLoading ? (
          <Alert variant="destructive" className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load members</AlertTitle>
            <AlertDescription>
              <p>The member list could not be loaded.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refreshData}>
                <RefreshCw className="me-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <MetricStrip
              className="mt-5"
              loading={membersLoading}
              items={[
                {
                  key: 'all',
                  label: 'Members',
                  value: statusCounts.all,
                  onClick: () => setStatusFilter('all'),
                  active: statusFilter === 'all',
                },
                {
                  key: 'active',
                  label: 'Active',
                  value: statusCounts.active,
                  onClick: () => toggleStatus('active'),
                  active: statusFilter === 'active',
                },
                {
                  key: 'suspended',
                  label: 'Suspended',
                  value: statusCounts.suspended,
                  onClick: () => toggleStatus('suspended'),
                  active: statusFilter === 'suspended',
                },
                {
                  key: 'invites',
                  label: 'Pending invitations',
                  value: invitations.length,
                  onClick: () =>
                    document
                      .getElementById('pending-invitations')
                      ?.scrollIntoView({ behavior: 'smooth' }),
                },
              ]}
            />

            <div className="mt-5">
              {membersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full max-w-sm" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                /*
                  No selection column: the old bulk "Resend / Deactivate /
                  Delete" actions fired toasts without calling any API. Per-row
                  actions are the supported way to suspend / remove a member.
                */
                <DataTable
                  columns={columns}
                  data={filteredData}
                  getRowId={(m) => m.id}
                  showSearch={false}
                  showColumnToggle={false}
                  toolbarStart={toolbarStart}
                  onRowClick={(m) => setSelectedMember(m)}
                  emptyMessage="No users match these filters"
                />
              )}
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <section id="pending-invitations" className="mt-5 scroll-mt-4">
                <h2 className="mb-3 text-base font-semibold">Pending invitations</h2>
                <DataTable
                  columns={invitationColumns}
                  data={invitations}
                  getRowId={(inv) => inv.id}
                  showSearch={false}
                  showColumnToggle={false}
                  showPagination={invitations.length > 10}
                  emptyMessage="No pending invitations"
                />
              </section>
            )}
          </>
        )}
      </Main>

      {/* User Details Sheet */}
      <Sheet open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <SheetContent className="sm:max-w-md p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Member details</SheetTitle>
          </VisuallyHidden>
          {selectedMember && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 pt-14 pb-6 bg-gradient-to-b from-muted/50 to-background">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-xl font-semibold">{selectedMember.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  <div className="mt-2">
                    <MemberStatusBadge
                      status={selectedMember.status}
                      pendingSetup={selectedMember.pending_setup}
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-6 py-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50 text-center">
                    <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {formatDate(selectedMember.joined_at)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 text-center">
                    <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Last active</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {formatLastActive(selectedMember.last_login_at)}
                    </p>
                  </div>
                </div>

                {/* Assigned Roles */}
                <UserRolesDetailCard
                  userId={selectedMember.user_id}
                  onManageRoles={
                    selectedMember.role !== 'owner' && !isPeerAdminLocked(selectedMember, caller)
                      ? () => {
                          // Set pending edit and close sheet - effect will open dialog
                          setPendingRolesEdit(selectedMember)
                          setSelectedMember(null)
                        }
                      : undefined
                  }
                />

                {/* Member ID */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">Member ID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {selectedMember.id.substring(0, 8)}...
                  </code>
                </div>
              </div>

              {/* Footer Actions */}
              <Can permission={Permission.MembersManage} minRole="admin">
                {selectedMember.role !== 'owner' && isPeerAdminLocked(selectedMember, caller) && (
                  <div className="px-6 py-4 border-t bg-muted/30">
                    <p className="text-center text-xs text-muted-foreground">
                      {PEER_ADMIN_LOCK_REASON}
                    </p>
                  </div>
                )}
                {selectedMember.role !== 'owner' && !isPeerAdminLocked(selectedMember, caller) && (
                  <div className="px-6 py-4 border-t bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        // Two-step: close the sheet, then open the
                        // confirmation dialog. The AlertDialog has its own
                        // overlay and would visually fight the sheet if
                        // both were open at once.
                        setRemoveConfirmMember(selectedMember)
                        setSelectedMember(null)
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      Remove from team
                    </Button>
                  </div>
                )}
              </Can>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <InviteUserDialog
        tenantSlug={tenantSlug}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvited={refreshData}
      />

      <AddUserDialog
        tenantSlug={tenantSlug}
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        onCreated={refreshData}
      />

      <SetupLinkDialog
        target={setupLinkTarget}
        onOpenChange={(open) => {
          if (!open) setSetupLinkTarget(null)
        }}
        issue={(userId) => {
          if (!tenantSlug) return Promise.reject(new Error('No organization selected'))
          return issueSetupLink(tenantSlug, userId)
        }}
      />

      {/* Edit User Roles Dialog - Prevent overlap with sheet animation */}
      {!isSheetAnimating && (
        <EditUserRolesDialog
          member={editRolesMember}
          open={editRolesDialogOpen && !selectedMember}
          onOpenChange={(open) => {
            setEditRolesDialogOpen(open)
            if (!open) setEditRolesMember(null)
          }}
          onSuccess={refreshData}
        />
      )}

      {/* Suspend Member Confirmation Dialog */}
      <AlertDialog
        open={!!suspendConfirmMember}
        onOpenChange={(open) => {
          if (!open && !isSuspending) setSuspendConfirmMember(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend member?</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendConfirmMember && (
                <>
                  <span className="font-medium text-foreground">
                    {suspendConfirmMember.name || suspendConfirmMember.email}
                  </span>{' '}
                  will immediately lose access to this team. Active sessions will be invalidated and
                  any pending invitations will be cancelled. You can reactivate them later — the
                  membership and audit trail are preserved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSuspending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent default close so we can keep the dialog open
                // while the request is in flight; close happens in the
                // handler on success.
                e.preventDefault()
                void handleConfirmSuspend()
              }}
              disabled={isSuspending}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
            >
              {isSuspending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <Ban className="me-2 h-4 w-4" />
                  Suspend
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        open={!!removeConfirmMember}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setRemoveConfirmMember(null)
        }}
        title="Remove member from team?"
        desc={
          <>
            {removeConfirmMember && (
              <>
                <span className="font-medium text-foreground">
                  {removeConfirmMember.name || removeConfirmMember.email}
                </span>{' '}
                will be removed from this team. Their membership row, role assignments, and any
                pending invitations addressed to their email will be deleted. This is permanent — to
                undo, you would need to invite them again from scratch. Prefer{' '}
                <span className="font-medium text-foreground">Suspend</span> if you only want to
                pause access temporarily.
              </>
            )}
          </>
        }
        confirmText={
          isRemoving ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <Trash2 className="me-2 h-4 w-4" />
              Remove
            </>
          )
        }
        destructive
        isLoading={isRemoving}
        handleConfirm={() => void handleConfirmRemove()}
      />
    </MemberRolesContext.Provider>
  )
}

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  CheckCircle,
  Mail,
  MoreHorizontal,
  Link,
  Trash2,
  Send,
  Ban,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search as SearchIcon,
  Filter,
  Eye,
  Pencil,
  Activity,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useTenant } from '@/context/tenant-provider'
import {
  useMembers,
  useInvitations,
  useCreateInvitation,
  type MemberWithUser,
  type MemberRole,
  type MemberRBACRole,
  STATUS_DISPLAY,
} from '@/features/organization'
import { useUserRoles, useRoles, useSetUserRoles, type Role } from '@/features/access-control'
import { createContext, useContext } from 'react'

// Context to pass member roles without N+1 API calls
type MemberRolesMap = Map<string, MemberRBACRole[]>
const MemberRolesContext = createContext<MemberRolesMap>(new Map())
import { fetcherWithOptions } from '@/lib/api/client'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'

type StatusFilter = 'all' | 'active' | 'pending' | 'inactive'
type RoleFilter = 'all' | MemberRole

// Static config
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  // Note: "Pending" removed - pending invitations are shown in separate section
]

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Roles' },
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

// Get role color based on type
const getRoleColor = (role: Role) => {
  if (role.is_system) {
    switch (role.slug) {
      case 'owner':
        return 'bg-red-500/20 text-red-400'
      case 'admin':
        return 'bg-purple-500/20 text-purple-400'
      case 'member':
        return 'bg-blue-500/20 text-blue-400'
      case 'viewer':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }
  return 'bg-green-500/20 text-green-400' // Custom roles
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
        <h4 className="text-sm font-medium">Assigned Roles</h4>
        {onManageRoles && (
          <Can permission={Permission.RolesWrite}>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onManageRoles}>
              <Pencil className="mr-1 h-3 w-3" />
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

  // Initialize selected roles when dialog opens
  useEffect(() => {
    if (open && userRoles) {
      setSelectedRoleIds(userRoles.map((r) => r.id))
    }
  }, [open, userRoles])

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

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
  }

  const isLoading = userRolesLoading || allRolesLoading
  // Filter out owner role and roles with invalid data
  const availableRoles = allRoles.filter(
    (r) => r.slug !== 'owner' && r.id && r.name && typeof r.name === 'string'
  )

  // Separate system and custom roles
  const systemRoles = availableRoles.filter((r) => r.is_system)
  const customRoles = availableRoles.filter((r) => !r.is_system)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">Manage Roles</span>
              {member && (
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {member.name}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {/* System Roles */}
              {systemRoles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      System Roles
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {systemRoles.map((role) => {
                      const isSelected = selectedRoleIds.includes(role.id)
                      const roleColor = getRoleColor(role)
                      return (
                        <div
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`
                            flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted'
                            }
                          `}
                        >
                          <div className="pt-0.5">
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                          </div>
                          <div className={`p-2 rounded-lg ${roleColor}`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {role.name || 'System Role'}
                              </span>
                            </div>
                            {role.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {role.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {role.permission_count ?? 0} permissions
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom Roles */}
              {customRoles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Custom Roles
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {customRoles.map((role) => {
                      const isSelected = selectedRoleIds.includes(role.id)
                      const roleColor = getRoleColor(role)
                      // Sanitize role name - truncate and remove potentially problematic chars
                      const displayName = role.name
                        ? role.name.slice(0, 100).replace(/[<>]/g, '')
                        : 'Unnamed Role'
                      const displayDescription = role.description
                        ? role.description.slice(0, 200).replace(/[<>]/g, '')
                        : ''
                      return (
                        <div
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`
                            flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted'
                            }
                          `}
                        >
                          <div className="pt-0.5">
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                          </div>
                          <div className={`p-2 rounded-lg ${roleColor}`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm truncate max-w-[250px]"
                                title={role.name}
                              >
                                {displayName}
                              </span>
                            </div>
                            {displayDescription && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {displayDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {role.permission_count ?? 0} permissions
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {availableRoles.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No roles available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create roles in Access Control settings
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <div className="flex-1 text-left">
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug

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
  const { createInvitation, isCreating } = useCreateInvitation(tenantSlug)

  // Filter out expired invitations (safety net - API should already filter)
  const invitations = useMemo(() => {
    const now = new Date()
    return rawInvitations.filter((inv) => new Date(inv.expires_at) > now)
  }, [rawInvitations])

  // UI State
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editRolesMember, setEditRolesMember] = useState<MemberWithUser | null>(null)
  const [editRolesDialogOpen, setEditRolesDialogOpen] = useState(false)
  // Track pending roles edit (used when transitioning from sheet to dialog)
  const [pendingRolesEdit, setPendingRolesEdit] = useState<MemberWithUser | null>(null)

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
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [inviteForm, setInviteForm] = useState({
    email: '',
    roleIds: [] as string[], // RBAC roles to assign when user joins
  })

  // Lazy load roles - only fetch when invite dialog is open (avoids unnecessary API call on page load)
  const { roles: availableRolesForInvite, isLoading: rolesLoading } = useRoles({
    skip: !inviteDialogOpen,
  })
  const selectableRoles = availableRolesForInvite.filter((r) => r.slug !== 'owner')
  // Separate system and custom roles for invite dialog
  const systemRolesForInvite = selectableRoles.filter((r) => r.is_system)
  const customRolesForInvite = selectableRoles.filter((r) => !r.is_system)

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

    return data
  }, [members, statusFilter, roleFilter])

  // Calculate stats from local data (avoids extra /stats API call)
  const stats = useMemo(() => {
    const activeMembersCount = members.filter((m) => m.status === 'active').length

    // Count unique roles across all members
    const roleSet = new Set<string>()
    members.forEach((member) => {
      if (member.rbac_roles) {
        member.rbac_roles.forEach((role) => roleSet.add(role.id))
      }
    })

    return {
      total_members: members.length,
      active_members: activeMembersCount,
      pending_invites: invitations.length,
      role_counts: Object.fromEntries([...roleSet].map((id) => [id, 1])), // Just need the count of unique roles
    }
  }, [members, invitations])

  // Status counts from members (for tabs)
  const statusCounts = useMemo(
    () => ({
      all: members.length,
      active: members.filter((m) => m.status === 'active').length,
      pending: invitations.length,
      inactive: members.filter((m) => m.status === 'inactive').length,
    }),
    [members, invitations]
  )

  // Table columns
  const columns: ColumnDef<MemberWithUser>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      cell: ({ row }) => {
        return <UserRolesCell userId={row.original.user_id} />
      },
    },
    {
      accessorKey: 'joined_at',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.joined_at)}</span>
      ),
    },
    {
      accessorKey: 'last_login_at',
      header: 'Last Active',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatLastActive(row.original.last_login_at)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusDisplay = STATUS_DISPLAY[row.original.status]
        return (
          <Badge
            className={`${statusDisplay?.bgColor || 'bg-gray-500/20'} ${statusDisplay?.color || 'text-gray-400'} border-0`}
          >
            {statusDisplay?.label || row.original.status}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const member = row.original
        const isOwner = member.role === 'owner'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {!isOwner && (
                <>
                  <Can permission={Permission.RolesAssign}>
                    <DropdownMenuItem
                      onClick={() => {
                        // Directly open dialog - don't use pending mechanism when sheet is closed
                        setEditRolesMember(member)
                        setEditRolesDialogOpen(true)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                  </Can>
                  <Can permission={Permission.MembersManage}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={() => handleRemoveMember(member)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Member
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

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Actions
  const handleRemoveMember = async (member: MemberWithUser) => {
    if (!tenantSlug) return

    try {
      await fetcherWithOptions(tenantEndpoints.removeMember(tenantSlug, member.id), {
        method: 'DELETE',
      })
      toast.success(`Removed ${member.name} from the team`)
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove member'))
    }
  }

  const handleInviteUser = async () => {
    if (!inviteForm.email) {
      toast.error('Please enter an email address')
      return
    }

    if (inviteForm.roleIds.length === 0) {
      toast.error('Please select at least one role')
      return
    }

    try {
      // Create invitation with role_ids only
      // Backend auto-sets membership to "member" - permissions come from RBAC roles
      await createInvitation({
        email: inviteForm.email,
        role_ids: inviteForm.roleIds,
      })

      const rolesCount = inviteForm.roleIds.length
      toast.success(
        `Invitation sent to ${inviteForm.email} with ${rolesCount} role${rolesCount > 1 ? 's' : ''}`
      )

      setInviteDialogOpen(false)
      setInviteForm({ email: '', roleIds: [] })
      refreshData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send invitation'))
    }
  }

  // Active filters count
  const activeFiltersCount = [roleFilter !== 'all'].filter(Boolean).length

  const clearFilters = () => {
    setRoleFilter('all')
    setStatusFilter('all')
  }

  return (
    <MemberRolesContext.Provider value={memberRolesMap}>
      <Main>
        <PageHeader
          title="User Management"
          description="Manage team members and access permissions"
        >
          <Can permission={Permission.MembersInvite} mode="disable">
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </Can>
        </PageHeader>

        {/* Loading State */}
        {membersLoading && (
          <div className="mt-6 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {membersError && !membersLoading && (
          <div className="mt-6 flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-muted-foreground">Failed to load members</p>
            <Button variant="outline" onClick={refreshData}>
              Try Again
            </Button>
          </div>
        )}

        {/* Stats */}
        {!membersLoading && !membersError && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setStatusFilter('all')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Members
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.total_members}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={`cursor-pointer hover:border-green-500 transition-colors ${statusFilter === 'active' ? 'border-green-500' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Active
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-500">{stats.active_members}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className="cursor-pointer hover:border-yellow-500 transition-colors"
                onClick={() => {
                  // Scroll to Pending Invitations section
                  document
                    .getElementById('pending-invitations')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Pending Invites
                  </CardDescription>
                  <CardTitle className="text-3xl text-yellow-500">
                    {stats.pending_invites}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Roles
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {Object.keys(stats.role_counts).length || 4}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Pending Invitations Banner - shown only when there are pending invites */}
            {invitations.length > 0 && (
              <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-500/20 p-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {invitations.length} pending invitation{invitations.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invitations
                          .map((inv) => inv.email)
                          .slice(0, 2)
                          .join(', ')}
                        {invitations.length > 2 && ` and ${invitations.length - 2} more`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const section = document.getElementById('pending-invitations')
                      section?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    View All
                  </Button>
                </div>
              </div>
            )}

            {/* Users Table - Primary Content */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Team Members</CardTitle>
                    <CardDescription>Manage user access and permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Filter Tabs */}
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  className="mb-4"
                >
                  <TabsList>
                    {statusFilters.map((filter) => (
                      <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                        {filter.label}
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {statusCounts[filter.value]}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Search and Filters */}
                <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Filter className="h-4 w-4" />
                          Filters
                          {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 sm:w-80" align="end">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Filters</h4>
                            {activeFiltersCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                onClick={clearFilters}
                              >
                                Clear all
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase">Role</Label>
                            <div className="flex flex-wrap gap-2">
                              {roleFilters.map((filter) => (
                                <Badge
                                  key={filter.value}
                                  variant={roleFilter === filter.value ? 'default' : 'outline'}
                                  className="cursor-pointer"
                                  onClick={() => setRoleFilter(filter.value)}
                                >
                                  {filter.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Can permission={Permission.MembersManage}>
                      {Object.keys(rowSelection).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {Object.keys(rowSelection).length} selected
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.success('Resent invites')}>
                              <Send className="mr-2 h-4 w-4" />
                              Resend Invites
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.success('Deactivated users')}>
                              <Ban className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => toast.success('Deleted users')}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </Can>
                  </div>
                </div>

                {/* Active Filters Display */}
                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {roleFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Role: {roleFilter}
                        <button
                          onClick={() => setRoleFilter('all')}
                          className="ml-1 hover:text-foreground"
                        >
                          x
                        </button>
                      </Badge>
                    )}
                  </div>
                )}

                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer"
                            onClick={(e) => {
                              if (
                                (e.target as HTMLElement).closest('[role="checkbox"]') ||
                                (e.target as HTMLElement).closest('button')
                              ) {
                                return
                              }
                              setSelectedMember(row.original)
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            No users found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations Section */}
            <Card className="mt-6" id="pending-invitations">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Pending Invitations</CardTitle>
                    <CardDescription>Invitations waiting to be accepted</CardDescription>
                  </div>
                  <Can permission={Permission.MembersInvite} mode="disable">
                    <Button size="sm" variant="outline" onClick={() => setInviteDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  </Can>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No pending invitations</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invite someone to join your team
                    </p>
                  </div>
                ) : (
                  invitations.map((invitation) => {
                    // Get role names from role_ids
                    const invitedRoles = (invitation.role_ids || [])
                      .map((id) => availableRolesForInvite.find((r) => r.id === id))
                      .filter(Boolean)

                    // Check if expiring soon (within 3 days)
                    const expiresAt = new Date(invitation.expires_at)
                    const now = new Date()
                    const daysUntilExpiry = Math.ceil(
                      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry > 0
                    const isExpired = daysUntilExpiry <= 0

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm bg-yellow-500/20 text-yellow-500">
                              {invitation.email.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {invitedRoles.length > 0 ? (
                                <>
                                  {invitedRoles.slice(0, 2).map(
                                    (role) =>
                                      role && (
                                        <Badge
                                          key={role.id}
                                          className={`${getRoleColor(role)} border-0 text-xs`}
                                        >
                                          {role.name}
                                        </Badge>
                                      )
                                  )}
                                  {invitedRoles.length > 2 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className="text-xs cursor-pointer"
                                        >
                                          +{invitedRoles.length - 2}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {invitedRoles
                                          .slice(2)
                                          .filter((r): r is NonNullable<typeof r> => r != null)
                                          .map((r) => r.name)
                                          .join(', ')}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              ) : (
                                <Badge className="bg-gray-500/20 text-gray-400 border-0 text-xs">
                                  No roles
                                </Badge>
                              )}
                              <span
                                className={`text-xs ms-1 ${isExpiringSoon ? 'text-orange-500' : isExpired ? 'text-red-500' : 'text-muted-foreground'}`}
                              >
                                {isExpired
                                  ? 'Expired'
                                  : isExpiringSoon
                                    ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`
                                    : `Expires ${formatDate(invitation.expires_at)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy invitation link"
                            onClick={async () => {
                              if (!invitation.token) {
                                toast.error('Invitation token not available')
                                return
                              }
                              const inviteLink = `${window.location.origin}/invitations/${invitation.token}`
                              try {
                                await navigator.clipboard.writeText(inviteLink)
                                toast.success('Invitation link copied to clipboard')
                              } catch {
                                toast.error('Failed to copy link')
                              }
                            }}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={async () => {
                              if (!tenantSlug) return
                              try {
                                await fetcherWithOptions(
                                  tenantEndpoints.deleteInvitation(tenantSlug, invitation.id),
                                  {
                                    method: 'DELETE',
                                  }
                                )
                                toast.success('Invitation cancelled')
                                refreshData()
                              } catch {
                                toast.error('Failed to cancel invitation')
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Main>

      {/* User Details Sheet */}
      <Sheet open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <SheetContent className="sm:max-w-md p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Member Details</SheetTitle>
          </VisuallyHidden>
          {selectedMember && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 pt-14 pb-6 bg-gradient-to-b from-muted/50 to-background">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getInitials(selectedMember.name)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    {selectedMember.status === 'active' && (
                      <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">{selectedMember.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  {/* Status Badge */}
                  <div
                    className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_DISPLAY[selectedMember.status]?.bgColor} ${STATUS_DISPLAY[selectedMember.status]?.color}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedMember.status === 'active'
                          ? 'bg-green-400'
                          : selectedMember.status === 'pending'
                            ? 'bg-yellow-400'
                            : 'bg-gray-400'
                      }`}
                    />
                    {STATUS_DISPLAY[selectedMember.status]?.label}
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
                    <p className="text-xs text-muted-foreground">Last Active</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {formatLastActive(selectedMember.last_login_at)}
                    </p>
                  </div>
                </div>

                {/* Assigned Roles */}
                <UserRolesDetailCard
                  userId={selectedMember.user_id}
                  onManageRoles={
                    selectedMember.role !== 'owner'
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
              <Can permission={Permission.MembersManage}>
                {selectedMember.role !== 'owner' && (
                  <div className="px-6 py-4 border-t bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => {
                        handleRemoveMember(selectedMember)
                        setSelectedMember(null)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from Team
                    </Button>
                  </div>
                )}
              </Can>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Invite User Dialog - Improved Design */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new member to your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Roles Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Assign Roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Select roles to define permissions for this user
                  </p>
                </div>
                {inviteForm.roleIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {inviteForm.roleIds.length} selected
                  </Badge>
                )}
              </div>

              {rolesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {/* System Roles */}
                  {systemRolesForInvite.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          System Roles
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-2">
                        {systemRolesForInvite.map((role) => {
                          const isSelected = inviteForm.roleIds.includes(role.id)
                          const displayName = role.name?.slice(0, 50) || 'System Role'
                          return (
                            <div
                              key={role.id}
                              onClick={() => {
                                setInviteForm((prev) => ({
                                  ...prev,
                                  roleIds: isSelected
                                    ? prev.roleIds.filter((id) => id !== role.id)
                                    : [...prev.roleIds, role.id],
                                }))
                              }}
                              className={`
                                flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted'
                                }
                              `}
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <div className={`p-2 rounded-lg ${getRoleColor(role)}`}>
                                <Shield className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{displayName}</span>
                                </div>
                                {role.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {role.description}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {role.permission_count ?? 0} permissions
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Roles */}
                  {customRolesForInvite.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Custom Roles
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-2">
                        {customRolesForInvite.map((role) => {
                          const isSelected = inviteForm.roleIds.includes(role.id)
                          const displayName =
                            role.name?.slice(0, 50).replace(/[<>]/g, '') || 'Custom Role'
                          return (
                            <div
                              key={role.id}
                              onClick={() => {
                                setInviteForm((prev) => ({
                                  ...prev,
                                  roleIds: isSelected
                                    ? prev.roleIds.filter((id) => id !== role.id)
                                    : [...prev.roleIds, role.id],
                                }))
                              }}
                              className={`
                                flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted'
                                }
                              `}
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <div className={`p-2 rounded-lg ${getRoleColor(role)}`}>
                                <Shield className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {displayName}
                                  </span>
                                </div>
                                {role.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {role.description.slice(0, 100)}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {role.permission_count ?? 0} permissions
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectableRoles.length === 0 && (
                    <div className="text-center py-6">
                      <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No roles available</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create roles in Access Control settings
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setInviteDialogOpen(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={isCreating || !inviteForm.email}
              className="flex-1 sm:flex-none"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </MemberRolesContext.Provider>
  )
}

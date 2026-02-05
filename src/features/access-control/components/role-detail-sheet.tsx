'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Shield,
  Search,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Database,
  Crown,
  ShieldCheck,
  User,
  Lock,
  Key,
  Calendar,
  Layers,
  Mail,
  UserPlus,
  MoreHorizontal,
  UserMinus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useRoleMembers,
  useTenantPermissionModules,
  type Role,
  type RoleMember,
} from '@/features/access-control'
import { AddMemberToRoleDialog } from './add-member-to-role-dialog'

interface RoleDetailSheetProps {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (role: Role) => void
  onDelete?: (role: Role) => void
}

// Permission type colors
const permissionTypeConfig: Record<
  string,
  { color: string; bgColor: string; icon: React.ElementType }
> = {
  read: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950', icon: Eye },
  write: { color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950', icon: Pencil },
  delete: { color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950', icon: Trash2 },
}

function getPermissionType(permissionId: string): string {
  // Extract the action (last part after the last colon)
  // Permission format: {module}:{subfeature}:{action}
  const action = permissionId.split(':').pop() || ''

  if (action === 'delete' || action === 'remove') return 'delete'
  if (
    [
      'write',
      'create',
      'update',
      'manage',
      'assign',
      'trigger',
      'cancel',
      'schedule',
      'invite',
      'bulk',
      'export',
    ].includes(action)
  )
    return 'write'
  return 'read'
}

// Get icon for role based on slug
function getRoleIcon(slug: string, isSystem: boolean) {
  if (!isSystem) return Key
  switch (slug) {
    case 'owner':
      return Crown
    case 'admin':
      return ShieldCheck
    case 'member':
      return User
    case 'viewer':
      return Eye
    default:
      return Shield
  }
}

// Get role config
function getRoleConfig(slug: string, isSystem: boolean) {
  if (!isSystem) {
    return { color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950' }
  }
  switch (slug) {
    case 'owner':
      return { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950' }
    case 'admin':
      return { color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' }
    case 'member':
      return { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950' }
    case 'viewer':
      return { color: 'text-slate-600', bgColor: 'bg-slate-50 dark:bg-slate-900' }
    default:
      return { color: 'text-primary', bgColor: 'bg-primary/10' }
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function RoleDetailSheet({
  role,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: RoleDetailSheetProps) {
  const {
    members: roleMembers,
    isLoading: isLoadingMembers,
    mutate: mutateMembers,
  } = useRoleMembers(role?.id || null)
  const { modules: permissionModules, isLoading: isLoadingModules } = useTenantPermissionModules()

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Reset state when sheet closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('')
      setMemberSearchQuery('')
      setExpandedModules(new Set())
    }
    onOpenChange(open)
  }

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return roleMembers

    const query = memberSearchQuery.toLowerCase()
    return roleMembers.filter(
      (m) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query)
    )
  }, [roleMembers, memberSearchQuery])

  // Remove member from role
  const handleRemoveMember = useCallback(
    async (member: RoleMember) => {
      if (!role) return

      setRemovingMemberId(member.id)
      try {
        const response = await fetch(`/api/v1/users/${member.user_id}/roles/${role.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to remove member')
        }

        toast.success(`${member.name || member.email} removed from role`)
        mutateMembers()
      } catch (error) {
        toast.error(
          `Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } finally {
        setRemovingMemberId(null)
      }
    },
    [role, mutateMembers]
  )

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    if (!role || !permissionModules.length) return []

    const rolePermissionSet = new Set(role.permissions)

    return permissionModules
      .map((module) => ({
        ...module,
        permissions: module.permissions.filter((p) => rolePermissionSet.has(p.id)),
      }))
      .filter((module) => module.permissions.length > 0)
  }, [role, permissionModules])

  // Filter permissions based on search
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return groupedPermissions

    const query = searchQuery.toLowerCase()
    return groupedPermissions
      .map((module) => ({
        ...module,
        permissions: module.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (module) => module.permissions.length > 0 || module.name.toLowerCase().includes(query)
      )
  }, [groupedPermissions, searchQuery])

  // Filtered permission count (based on tenant's modules)
  const filteredPermissionCount = useMemo(() => {
    return groupedPermissions.reduce((sum, m) => sum + m.permissions.length, 0)
  }, [groupedPermissions])

  // Permission stats (based on filtered permissions)
  const permissionStats = useMemo(() => {
    if (!groupedPermissions.length) return { read: 0, write: 0, delete: 0, total: 0 }

    const stats = { read: 0, write: 0, delete: 0, total: 0 }
    for (const permModule of groupedPermissions) {
      for (const perm of permModule.permissions) {
        const type = getPermissionType(perm.id)
        stats[type as keyof typeof stats]++
        stats.total++
      }
    }
    return stats
  }, [groupedPermissions])

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  // Expand all modules
  const expandAll = () => {
    setExpandedModules(new Set(filteredPermissions.map((m) => m.id)))
  }

  // Collapse all modules
  const collapseAll = () => {
    setExpandedModules(new Set())
  }

  if (!role) return null

  const config = getRoleConfig(role.slug, role.is_system)
  const Icon = getRoleIcon(role.slug, role.is_system)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-3xl p-0 flex flex-col h-full max-h-screen">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0 pr-12">
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl shrink-0', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl truncate">{role.name}</SheetTitle>
                {role.is_system && (
                  <Badge variant="outline" className="font-normal shrink-0">
                    <Lock className="mr-1 h-3 w-3" />
                    System
                  </Badge>
                )}
              </div>
              {role.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {role.description}
                </p>
              )}
            </div>
          </div>
          {/* Actions below header for custom roles */}
          {!role.is_system && onEdit && onDelete && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Role
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(role)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* Stats Bar */}
        <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{filteredPermissionCount}</span>
              <span className="text-sm text-muted-foreground">permissions</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Level {role.hierarchy_level}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              {role.has_full_data_access ? (
                <>
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Full Access</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Group-based</span>
                </>
              )}
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formatDate(role.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="permissions" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-2 shrink-0">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="h-4 w-4" />
                Permissions
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {filteredPermissionCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Members
                {!isLoadingMembers && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {roleMembers.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Permissions Tab */}
          <TabsContent
            value="permissions"
            className="flex-1 flex flex-col min-h-0 mt-0 pt-4 data-[state=inactive]:hidden"
          >
            {/* Permission Type Legend */}
            <div className="px-6 pb-4 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Types:</span>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded',
                      permissionTypeConfig.read.bgColor,
                      permissionTypeConfig.read.color
                    )}
                  >
                    <Eye className="inline h-3 w-3 mr-1" />
                    Read ({permissionStats.read})
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded',
                      permissionTypeConfig.write.bgColor,
                      permissionTypeConfig.write.color
                    )}
                  >
                    <Pencil className="inline h-3 w-3 mr-1" />
                    Write ({permissionStats.write})
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded',
                      permissionTypeConfig.delete.bgColor,
                      permissionTypeConfig.delete.color
                    )}
                  >
                    <Trash2 className="inline h-3 w-3 mr-1" />
                    Delete ({permissionStats.delete})
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="px-6 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse
                </Button>
              </div>
            </div>

            {/* Permissions List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full px-6">
                {isLoadingModules ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    {searchQuery ? (
                      <>
                        <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No permissions match your search
                        </p>
                      </>
                    ) : (
                      <>
                        <Shield className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No permissions assigned</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pb-6">
                    {filteredPermissions.map((module) => {
                      const isExpanded = expandedModules.has(module.id) || searchQuery.length > 0

                      return (
                        <Collapsible
                          key={module.id}
                          open={isExpanded}
                          onOpenChange={() => toggleModule(module.id)}
                        >
                          <div className="rounded-lg border bg-card">
                            {/* Module Header */}
                            <CollapsibleTrigger asChild>
                              <button className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 rounded-lg transition-colors">
                                <ChevronRight
                                  className={cn(
                                    'h-4 w-4 text-muted-foreground transition-transform',
                                    isExpanded && 'rotate-90'
                                  )}
                                />
                                <span className="font-medium text-sm flex-1">{module.name}</span>
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {module.permissions.length}
                                </Badge>
                              </button>
                            </CollapsibleTrigger>

                            {/* Module Permissions */}
                            <CollapsibleContent>
                              <div className="px-3 pb-3">
                                {module.description && (
                                  <p className="text-xs text-muted-foreground mb-3 ml-6">
                                    {module.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 ml-6">
                                  {module.permissions.map((permission) => {
                                    const type = getPermissionType(permission.id)
                                    const typeConfig = permissionTypeConfig[type]

                                    return (
                                      <TooltipProvider key={permission.id}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={cn(
                                                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                                                typeConfig.bgColor,
                                                typeConfig.color
                                              )}
                                            >
                                              <typeConfig.icon className="h-3 w-3" />
                                              {permission.name}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-mono text-xs">{permission.id}</p>
                                            {permission.description && (
                                              <p className="text-xs mt-1">
                                                {permission.description}
                                              </p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  })}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent
            value="members"
            className="flex-1 flex flex-col min-h-0 mt-0 pt-4 data-[state=inactive]:hidden"
          >
            {/* Search and Add Button */}
            <div className="px-6 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add Member
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full px-6">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {memberSearchQuery
                        ? 'No members match your search'
                        : 'No members with this role'}
                    </p>
                    {!memberSearchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setAddMemberDialogOpen(true)}
                      >
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Add First Member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pb-6">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {getInitials(member.name, member.email || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.name || member.email}
                          </p>
                          {member.name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {member.email}
                            </p>
                          )}
                        </div>
                        {member.assigned_at && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(member.assigned_at)}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              {removingMemberId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemoveMember(member)}
                              disabled={removingMemberId === member.id}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Add Member Dialog */}
      <AddMemberToRoleDialog
        role={role}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        existingMembers={roleMembers}
        onSuccess={() => mutateMembers()}
      />
    </Sheet>
  )
}

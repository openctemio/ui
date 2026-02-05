'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus,
  Shield,
  Search,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Database,
  Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useCreateRole,
  useTenantPermissionModules,
  generateSlug,
  type PermissionModule,
} from '@/features/access-control'

interface CreateRoleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
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

export function CreateRoleSheet({ open, onOpenChange, onSuccess }: CreateRoleSheetProps) {
  const { createRole, isCreating } = useCreateRole()
  const { modules: permissionModules, isLoading: isLoadingModules } = useTenantPermissionModules()

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    hasFullDataAccess: false,
    permissions: [] as string[],
  })

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Reset form when sheet closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setForm({ name: '', description: '', hasFullDataAccess: false, permissions: [] })
      setSearchQuery('')
      setExpandedModules(new Set())
    }
    onOpenChange(open)
  }

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return permissionModules

    const query = searchQuery.toLowerCase()
    return permissionModules
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
  }, [permissionModules, searchQuery])

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

  // Toggle single permission
  const togglePermission = useCallback((permissionId: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }, [])

  // Toggle all permissions in a module
  const toggleModulePermissions = useCallback((module: PermissionModule, checked: boolean) => {
    const modulePermissionIds = module.permissions.map((p) => p.id)
    setForm((prev) => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...modulePermissionIds])]
        : prev.permissions.filter((p) => !modulePermissionIds.includes(p)),
    }))
  }, [])

  // Quick actions
  const selectAllRead = useCallback(() => {
    const readPermissions = permissionModules.flatMap((m) =>
      m.permissions.filter((p) => getPermissionType(p.id) === 'read').map((p) => p.id)
    )
    setForm((prev) => ({
      ...prev,
      permissions: [...new Set([...prev.permissions, ...readPermissions])],
    }))
  }, [permissionModules])

  const selectAllWrite = useCallback(() => {
    const writePermissions = permissionModules.flatMap((m) =>
      m.permissions.filter((p) => getPermissionType(p.id) === 'write').map((p) => p.id)
    )
    setForm((prev) => ({
      ...prev,
      permissions: [...new Set([...prev.permissions, ...writePermissions])],
    }))
  }, [permissionModules])

  const clearAllPermissions = useCallback(() => {
    setForm((prev) => ({ ...prev, permissions: [] }))
  }, [])

  // Group selected permissions by module for preview
  const groupedSelectedPermissions = useMemo(() => {
    const groups: Record<string, { module: PermissionModule; permissions: string[] }> = {}

    for (const permModule of permissionModules) {
      const selected = permModule.permissions
        .filter((p) => form.permissions.includes(p.id))
        .map((p) => p.id)

      if (selected.length > 0) {
        groups[permModule.id] = { module: permModule, permissions: selected }
      }
    }

    return groups
  }, [permissionModules, form.permissions])

  // Handle create
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a role name')
      return
    }

    try {
      await createRole({
        slug: generateSlug(form.name),
        name: form.name,
        description: form.description || undefined,
        has_full_data_access: form.hasFullDataAccess,
        permissions: form.permissions,
      })
      toast.success(`Role "${form.name}" created successfully`)
      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create role'))
    }
  }

  // Get module selection state
  const getModuleSelectionState = (module: PermissionModule) => {
    const modulePermissionIds = module.permissions.map((p) => p.id)
    const selectedCount = form.permissions.filter((p) => modulePermissionIds.includes(p)).length
    const total = modulePermissionIds.length

    return {
      selectedCount,
      total,
      allSelected: total > 0 && selectedCount === total,
      someSelected: selectedCount > 0 && selectedCount < total,
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-4xl p-0 flex flex-col h-full max-h-screen">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Create Role</SheetTitle>
              <SheetDescription>Create a custom role with specific permissions</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content - Two columns */}
        <div className="flex-1 flex min-h-0">
          {/* Left Column - Form */}
          <div className="flex-1 flex flex-col min-h-0 border-r">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      placeholder="e.g., Security Analyst, DevOps Lead"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description (optional)</Label>
                    <Textarea
                      id="role-description"
                      placeholder="Describe what this role can do..."
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Full Data Access</Label>
                        <p className="text-xs text-muted-foreground">
                          Access all data regardless of group membership
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.hasFullDataAccess}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, hasFullDataAccess: checked }))
                      }
                    />
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Permissions</Label>
                    <Badge variant="secondary" className="font-mono">
                      {form.permissions.length} selected
                    </Badge>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search permissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={selectAllRead}>
                            <Eye className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                            All Read
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select all read permissions</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={selectAllWrite}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                            All Write
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select all write permissions</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllPermissions}
                            disabled={form.permissions.length === 0}
                          >
                            <Eraser className="mr-1.5 h-3.5 w-3.5" />
                            Clear
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear all selected permissions</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Permission Modules */}
                  {isLoadingModules ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredModules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground text-sm">No permissions found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredModules.map((module) => {
                        const { selectedCount, total, allSelected, someSelected } =
                          getModuleSelectionState(module)
                        const isExpanded = expandedModules.has(module.id) || searchQuery.length > 0

                        return (
                          <Collapsible
                            key={module.id}
                            open={isExpanded}
                            onOpenChange={() => toggleModule(module.id)}
                          >
                            <div className="rounded-lg border bg-card">
                              {/* Module Header */}
                              <div className="flex items-center gap-2 p-3">
                                <Checkbox
                                  checked={allSelected || (someSelected && 'indeterminate')}
                                  onCheckedChange={(checked) =>
                                    toggleModulePermissions(module, !!checked)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <CollapsibleTrigger asChild>
                                  <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded -m-1 p-1">
                                    <ChevronRight
                                      className={cn(
                                        'h-4 w-4 text-muted-foreground transition-transform',
                                        isExpanded && 'rotate-90'
                                      )}
                                    />
                                    <span className="font-medium text-sm">{module.name}</span>
                                    <Badge
                                      variant={selectedCount > 0 ? 'default' : 'secondary'}
                                      className="text-xs font-mono ml-auto"
                                    >
                                      {selectedCount}/{total}
                                    </Badge>
                                  </button>
                                </CollapsibleTrigger>
                              </div>

                              {/* Module Permissions */}
                              <CollapsibleContent>
                                <div className="px-3 pb-3 pt-1">
                                  {module.description && (
                                    <p className="text-xs text-muted-foreground mb-3 ml-6">
                                      {module.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2 ml-6">
                                    {module.permissions.map((permission) => {
                                      const type = getPermissionType(permission.id)
                                      const config = permissionTypeConfig[type]
                                      const isSelected = form.permissions.includes(permission.id)
                                      const Icon = config.icon

                                      return (
                                        <TooltipProvider key={permission.id}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => togglePermission(permission.id)}
                                                className={cn(
                                                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border',
                                                  isSelected
                                                    ? `${config.bgColor} ${config.color} border-current`
                                                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                                                )}
                                              >
                                                {isSelected ? (
                                                  <Check className="h-3 w-3" />
                                                ) : (
                                                  <Icon className="h-3 w-3" />
                                                )}
                                                {permission.name}
                                              </button>
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
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Column - Preview */}
          <div className="w-80 flex flex-col min-h-0 bg-muted/30">
            <div className="p-4 border-b shrink-0">
              <h3 className="font-semibold text-sm">Preview</h3>
            </div>
            <ScrollArea className="flex-1 h-full">
              <div className="p-4 space-y-4">
                {/* Role Info Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {form.name || (
                          <span className="text-muted-foreground italic">Enter role name...</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {form.permissions.length} permissions
                      </p>
                    </div>
                  </div>
                  {form.description && (
                    <p className="text-xs text-muted-foreground">{form.description}</p>
                  )}
                  {form.hasFullDataAccess && (
                    <Badge variant="secondary" className="text-xs">
                      <Database className="mr-1 h-3 w-3" />
                      Full Data Access
                    </Badge>
                  )}
                </div>

                {/* Selected Permissions */}
                {form.permissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No permissions selected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Selected Permissions
                    </p>
                    {Object.entries(groupedSelectedPermissions).map(
                      ([moduleId, { module, permissions }]) => (
                        <div key={moduleId} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">{module.name}</p>
                            <Badge variant="outline" className="text-xs h-5">
                              {permissions.length}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {permissions.map((permId) => {
                              const perm = module.permissions.find((p) => p.id === permId)
                              const type = getPermissionType(permId)
                              const config = permissionTypeConfig[type]

                              return (
                                <button
                                  key={permId}
                                  onClick={() => togglePermission(permId)}
                                  className={cn(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                                    config.bgColor,
                                    config.color,
                                    'hover:opacity-80 transition-opacity'
                                  )}
                                >
                                  <span>{perm?.name || permId.split(':')[1]}</span>
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !form.name.trim()}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Role
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

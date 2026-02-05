'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, UserPlus, Search, Mail, Users, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTenant } from '@/context/tenant-provider'
import { useMembers } from '@/features/organization'
import { type Role, type RoleMember, useBulkAssignRoleMembers } from '@/features/access-control'
import { getErrorMessage } from '@/lib/api/error-handler'

interface AddMemberToRoleDialogProps {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
  existingMembers: RoleMember[]
  onSuccess?: () => void
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

export function AddMemberToRoleDialog({
  role,
  open,
  onOpenChange,
  existingMembers,
  onSuccess,
}: AddMemberToRoleDialogProps) {
  const { currentTenant, isLoading: isTenantLoading } = useTenant()
  const {
    members: tenantMembers,
    isLoading: isLoadingMembers,
    isError: isMembersError,
  } = useMembers(currentTenant?.slug)
  const { bulkAssignMembers, isAssigning } = useBulkAssignRoleMembers(role?.id || null)

  // Combined loading state
  const isLoading = isTenantLoading || isLoadingMembers || !currentTenant

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Filter available members (exclude those already in role)
  const existingMemberIds = useMemo(() => {
    return new Set(existingMembers.map((m) => m.user_id))
  }, [existingMembers])

  const availableMembers = useMemo(() => {
    const filtered = tenantMembers.filter((m) => !existingMemberIds.has(m.user_id))

    if (!searchQuery.trim()) return filtered

    const query = searchQuery.toLowerCase()
    return filtered.filter(
      (m) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query)
    )
  }, [tenantMembers, existingMemberIds, searchQuery])

  // Toggle member selection
  const toggleMember = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  // Select all visible
  const selectAll = useCallback(() => {
    setSelectedUserIds(new Set(availableMembers.map((m) => m.user_id)))
  }, [availableMembers])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedUserIds(new Set())
  }, [])

  // Handle add members using bulk endpoint
  const handleAddMembers = async () => {
    if (!role || selectedUserIds.size === 0) return

    try {
      const result = await bulkAssignMembers({
        user_ids: Array.from(selectedUserIds),
      })

      if (result) {
        const { success_count, failed_count } = result

        if (success_count > 0) {
          toast.success(
            success_count === 1
              ? '1 member added to role'
              : `${success_count} members added to role`
          )
        }
        if (failed_count > 0) {
          toast.error(`Failed to add ${failed_count} member(s)`)
        }

        if (success_count > 0) {
          setSelectedUserIds(new Set())
          setSearchQuery('')
          onOpenChange(false)
          onSuccess?.()
        }
      }
    } catch (error) {
      console.error('Failed to bulk assign members:', error)
      toast.error(getErrorMessage(error, 'Failed to add members to role'))
    }
  }

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUserIds(new Set())
      setSearchQuery('')
    }
    onOpenChange(open)
  }

  if (!role) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members to Role
          </DialogTitle>
          <DialogDescription>
            Select team members to add to the &quot;{role.name}&quot; role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selection actions */}
          {availableMembers.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedUserIds.size} of {availableMembers.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                {selectedUserIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Members list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isMembersError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Users className="h-8 w-8 text-red-400/50 mb-2" />
                <p className="text-sm text-red-400">Failed to load team members</p>
              </div>
            ) : tenantMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No team members found</p>
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No members match your search'
                    : 'All team members already have this role'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableMembers.map((member) => {
                  const isSelected = selectedUserIds.has(member.user_id)
                  return (
                    <button
                      key={member.user_id}
                      onClick={() => toggleMember(member.user_id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left',
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center shrink-0',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
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
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddMembers} disabled={isAssigning || selectedUserIds.size === 0}>
            {isAssigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Add {selectedUserIds.size > 0 ? `${selectedUserIds.size} ` : ''}Member
            {selectedUserIds.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

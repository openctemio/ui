'use client'

import { useState, useDeferredValue } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDown, User, Loader2, Check, UserPlus } from 'lucide-react'
import { useTenant } from '@/context/tenant-provider'
import { useMembers } from '@/features/organization/api/use-members'

// Max members to display in dropdown
const MAX_DISPLAY_MEMBERS = 5

export interface AssigneeUser {
  id: string
  name: string
  email?: string
  role?: string
}

interface AssigneeSelectProps {
  /** Current assignee */
  value?: AssigneeUser | null
  /** Called when assignee changes */
  onChange: (user: AssigneeUser | null) => void
  /** Whether the select is disabled */
  disabled?: boolean
  /** Show loading spinner (for external API calls) */
  loading?: boolean
  /** Button size variant */
  size?: 'sm' | 'default'
  /** Button variant */
  variant?: 'outline' | 'ghost'
  /** Show full name or truncated */
  showFullName?: boolean
  /** Custom placeholder when no assignee */
  placeholder?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AssigneeSelect({
  value,
  onChange,
  disabled = false,
  loading = false,
  size = 'sm',
  variant = 'outline',
  showFullName = false,
  placeholder = 'Assign',
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { currentTenant } = useTenant()

  // Debounce search to reduce API calls
  const deferredSearch = useDeferredValue(search)

  // Lazy fetch: Only load members when popover is opened
  const {
    members: dropdownMembers,
    total: dropdownTotal,
    isLoading: isLoadingDropdown,
  } = useMembers(open ? currentTenant?.id : undefined, {
    limit: MAX_DISPLAY_MEMBERS,
  })

  // Fetch members with search (only when popover is open AND searching)
  const isSearchActive = deferredSearch.trim().length > 0
  const {
    members: searchedMembers,
    total: searchedTotal,
    isLoading: isSearching,
  } = useMembers(open && isSearchActive ? currentTenant?.id : undefined, {
    search: deferredSearch.trim(),
    limit: MAX_DISPLAY_MEMBERS,
  })

  // Use searched results if searching, otherwise use dropdown members
  const displayMembers = isSearchActive ? searchedMembers : dropdownMembers
  const totalMembers = isSearchActive ? searchedTotal : dropdownTotal
  const isLoadingMembers = isSearchActive ? isSearching : isLoadingDropdown

  // Check if there are more members than displayed
  const hasMoreMembers = totalMembers > MAX_DISPLAY_MEMBERS

  const handleSelect = (member: { user_id: string; name?: string; email?: string }) => {
    onChange({
      id: member.user_id,
      name: member.name || 'Unknown',
      email: member.email,
    })
    setOpen(false)
    setSearch('')
  }

  const handleUnassign = () => {
    onChange(null)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${size === 'sm' ? 'h-7 px-1.5 gap-1 text-xs' : 'h-9 sm:h-8 gap-2'} min-h-[32px]`}
          disabled={disabled || loading}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {!loading && value ? (
            // Show assignee info - if name is empty (not enriched), show "Assigned" with user icon
            value.name ? (
              <>
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]">{getInitials(value.name)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate">
                  {showFullName ? value.name : value.name.split(' ')[0]}
                </span>
              </>
            ) : (
              // Assigned but name not loaded yet - show placeholder
              <>
                <User className="h-3 w-3" />
                <span className="text-muted-foreground hidden sm:inline">Assigned</span>
              </>
            )
          ) : !loading ? (
            <>
              <UserPlus className="h-3 w-3" />
              <span className="hidden sm:inline">{placeholder}</span>
            </>
          ) : null}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search members..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoadingMembers && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoadingMembers && displayMembers.length === 0 && (
              <CommandEmpty>No members found.</CommandEmpty>
            )}
            {!isLoadingMembers && (
              <>
                {value && !search && (
                  <>
                    <CommandGroup>
                      <CommandItem onSelect={handleUnassign} className="text-muted-foreground">
                        <User className="mr-2 h-4 w-4" />
                        Unassign
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}
                {displayMembers.length > 0 && (
                  <CommandGroup
                    heading={`Team Members${hasMoreMembers ? ` (${totalMembers} total)` : ''}`}
                  >
                    {displayMembers.map((member) => (
                      <CommandItem
                        key={member.user_id}
                        value={member.user_id}
                        onSelect={() => handleSelect(member)}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{member.name || 'Unknown'}</span>
                            {member.role && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded capitalize shrink-0">
                                {member.role}
                              </span>
                            )}
                          </div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </div>
                          )}
                        </div>
                        {value?.id === member.user_id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {hasMoreMembers && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                    Type to search for more members
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

'use client'

/**
 * Team Switcher Component
 *
 * Displays current team and allows switching between teams.
 * - Fetches real tenant data from API
 * - Supports keyboard shortcuts (⌘1, ⌘2, etc.)
 * - Shows loading state during switch
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronsUpDown,
  Plus,
  Check,
  Loader2,
  Command,
  AudioWaveform,
  Building2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTenant } from '@/context/tenant-provider'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

// Team icons based on index or name
const teamIcons = [Command, AudioWaveform, Building2]

function getTeamIcon(index: number) {
  return teamIcons[index % teamIcons.length]
}

export function TeamSwitcher() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { currentTenant, tenants, isLoading, isSwitching, switchTeam, error, loadTenants } =
    useTenant()

  const [isOpen, setIsOpen] = React.useState(false)

  // If API returns empty but we have current tenant, show it in the list
  const displayTenants = React.useMemo(() => {
    if (tenants.length > 0) return tenants

    // Fallback: create a tenant entry from current tenant cookie
    if (currentTenant) {
      return [
        {
          id: currentTenant.id,
          name: currentTenant.name || currentTenant.slug,
          slug: currentTenant.slug,
          plan: (currentTenant.plan || 'free') as 'free' | 'paid',
          role: currentTenant.role,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]
    }

    return []
  }, [tenants, currentTenant])

  // Log errors for debugging
  React.useEffect(() => {
    if (error) {
      console.error('[TeamSwitcher] Error fetching tenants:', error)
    }
  }, [error])

  // Handle team selection
  const handleSelectTeam = React.useCallback(
    async (tenantId: string) => {
      if (isSwitching) return

      try {
        await switchTeam(tenantId)
        setIsOpen(false)
        toast.success('Team switched successfully')
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to switch team'))
      }
    },
    [switchTeam, isSwitching]
  )

  // Keyboard shortcuts for team switching
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle ⌘1-9 or Ctrl+1-9
      if ((event.metaKey || event.ctrlKey) && event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1
        if (index < displayTenants.length) {
          event.preventDefault()
          handleSelectTeam(displayTenants[index].id)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [displayTenants, handleSelectTeam])

  // Get current tenant display info
  const currentTeamName = currentTenant?.name || currentTenant?.slug || 'Select Team'
  const currentIndex = currentTenant
    ? displayTenants.findIndex((t) => t.id === currentTenant.id)
    : 0
  const currentIconIndex = currentIndex >= 0 ? currentIndex : 0

  // Loading state
  if (isLoading && displayTenants.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/50 animate-pulse">
              <Loader2 className="size-4 animate-spin text-sidebar-primary-foreground/50" />
            </div>
            <div className="grid flex-1 gap-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // No teams state
  if (!isLoading && displayTenants.length === 0 && !currentTenant) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" onClick={() => router.push('/settings/tenant/create')}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg border border-dashed">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">Create Team</span>
              <span className="truncate text-xs text-muted-foreground">Get started</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            // Trigger lazy load of tenant list when dropdown is opened
            if (open) {
              loadTenants()
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isSwitching}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {isSwitching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  React.createElement(teamIcons[currentIconIndex % teamIcons.length], {
                    className: 'size-4',
                  })
                )}
              </div>

              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">{currentTeamName}</span>
              </div>

              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-[14rem] rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs flex items-center gap-2">
              Teams
              {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            </DropdownMenuLabel>

            {displayTenants.map((tenant, index) => {
              const Icon = getTeamIcon(index)
              const isActive = currentTenant?.id === tenant.id

              return (
                <DropdownMenuItem
                  key={tenant.id}
                  onClick={() => handleSelectTeam(tenant.id)}
                  className={cn('gap-2 p-2', isActive && 'bg-accent')}
                  disabled={isSwitching}
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Icon className="size-4 shrink-0" />
                  </div>
                  <span className="flex-1">{tenant.name}</span>
                  {isActive && <Check className="size-4 text-primary" />}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              )
            })}

            {/* Show skeleton items while loading additional teams */}
            {isLoading && displayTenants.length <= 1 && (
              <>
                <DropdownMenuItem disabled className="gap-2 p-2 opacity-50">
                  <div className="flex size-6 items-center justify-center rounded-sm border bg-muted animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-2 p-2 opacity-50">
                  <div className="flex size-6 items-center justify-center rounded-sm border bg-muted animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => {
                setIsOpen(false)
                router.push('/settings/tenant/create')
              }}
            >
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

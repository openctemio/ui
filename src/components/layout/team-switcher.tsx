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
import { devLog } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Plus, Check, Loader2 } from 'lucide-react'
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
import { useBootstrapContextSafe } from '@/context/bootstrap-provider'
import { cn } from '@/lib/utils'
import { SIDEBAR_CHIP_CLASS, SIDEBAR_CONTEXT_ROW_CLASS } from './sidebar-brand'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useCanCreateOrganization } from '@/features/auth/hooks/use-can-create-organization'

/** Up to two initials, e.g. "ORG tenant" -> "OT", "acme" -> "AC". */
function orgInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Org avatar: initials on a neutral tile, so each organization is recognisable
 * in the switcher (previously a decorative icon cycled by list index, which
 * told the user nothing and changed when the list order changed).
 */
function OrgAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border',
        size === 'md' ? 'size-7 text-[11px]' : 'size-6 text-[10px]'
      )}
    >
      {orgInitials(name)}
    </span>
  )
}

export function TeamSwitcher() {
  const router = useRouter()
  const { canCreate: canCreateTeam } = useCanCreateOrganization()
  const { isMobile } = useSidebar()
  const { currentTenant, tenants, isLoading, isSwitching, switchTeam, error, loadTenants } =
    useTenant()
  const { isBootstrapped } = useBootstrapContextSafe()

  // Disable switching while an API call or bootstrap is in progress
  const isTransitioning = isSwitching || !isBootstrapped

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
      devLog.error('[TeamSwitcher] Error fetching tenants:', error)
    }
  }, [error])

  // Handle team selection
  const handleSelectTeam = React.useCallback(
    async (tenantId: string) => {
      if (isTransitioning) return

      try {
        await switchTeam(tenantId)
        setIsOpen(false)
        toast.success('Team switched successfully')
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to switch team'))
      }
    },
    [switchTeam, isTransitioning]
  )

  // Keyboard shortcuts for team switching: ⌘⇧1-9 / Ctrl+Shift+1-9.
  //
  // We use Shift as a modifier to AVOID conflicting with the browser's
  // built-in tab-switching shortcuts (⌘1, ⌘2, … in Chrome/Safari/Firefox
  // on macOS; Ctrl+1, Ctrl+2, … on Windows/Linux). The previous version
  // hijacked those shortcuts and made it impossible to switch browser
  // tabs while focused on the dashboard.
  //
  // Implementation note: when Shift is held, `event.key` for `Shift+1` is
  // the *shifted* character (`!`), not `1`. We have to use `event.code`
  // (the physical key, e.g. `Digit1`) so the shortcut works regardless of
  // keyboard layout.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      const match = event.code.match(/^Digit([1-9])$/)
      if (!match) return
      const index = parseInt(match[1], 10) - 1
      if (index < displayTenants.length) {
        event.preventDefault()
        handleSelectTeam(displayTenants[index].id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [displayTenants, handleSelectTeam])

  // Get current tenant display info
  const currentTeamName = currentTenant?.name || currentTenant?.slug || 'Select Team'

  // Loading state
  if (isLoading && displayTenants.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className={SIDEBAR_CONTEXT_ROW_CLASS} disabled>
            <div className={cn(SIDEBAR_CHIP_CLASS, 'animate-pulse')}>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
            <div className="h-4 w-24 rounded bg-muted animate-pulse group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // No teams state. Nothing to offer when only the platform administrator
  // creates organizations.
  if (!isLoading && displayTenants.length === 0 && !currentTenant) {
    if (!canCreateTeam) return null
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={SIDEBAR_CONTEXT_ROW_CLASS}
            tooltip="Create team"
            onClick={() => router.push('/settings/tenant/create')}
          >
            <div className={cn(SIDEBAR_CHIP_CLASS, 'bg-transparent ring-0 border border-dashed')}>
              <Plus className="size-4" />
            </div>
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
              Create team
            </span>
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
              className={cn(
                SIDEBAR_CONTEXT_ROW_CLASS,
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              )}
              tooltip={currentTeamName}
              disabled={isTransitioning}
            >
              <div className={SIDEBAR_CHIP_CLASS}>
                {isTransitioning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  orgInitials(currentTeamName)
                )}
              </div>

              <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{currentTeamName}</span>
              </div>

              <ChevronsUpDown className="ms-auto size-4 group-data-[collapsible=icon]:hidden" />
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
              const isActive = currentTenant?.id === tenant.id

              return (
                <DropdownMenuItem
                  key={tenant.id}
                  onClick={() => handleSelectTeam(tenant.id)}
                  className={cn('gap-2 p-2', isActive && 'bg-accent')}
                  disabled={isTransitioning}
                >
                  <OrgAvatar name={tenant.name} size="sm" />
                  <span className="flex-1">{tenant.name}</span>
                  {isActive && <Check className="size-4 text-primary" />}
                  {/* ⌘⇧1-9 / Ctrl+Shift+1-9. Shift is required to avoid
                      hijacking the browser's tab-switching shortcuts. */}
                  <DropdownMenuShortcut>⌘⇧{index + 1}</DropdownMenuShortcut>
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

            {canCreateTeam && (
              <>
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
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

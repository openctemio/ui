'use client'

/**
 * Organization context row (sidebar header).
 *
 * Names the current organization and its plan. Clicking it always opens the
 * organization card (org-card.tsx): role, member count, ID, the API keys link,
 * and, when there is a choice, the other organizations and "Create
 * organization". The chevron only shows when there is something to do
 * (switch or create); the card itself is informative and opens regardless.
 *
 * ⌘⇧1-9 / Ctrl+Shift+1-9 switch to the n-th organization.
 */

import * as React from 'react'
import { devLog } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  useSidebarActions,
} from '@/components/ui/sidebar'
import { useTenant } from '@/context/tenant-provider'
import { useBootstrapContextSafe } from '@/context/bootstrap-provider'
import { useTranslation } from '@/context/i18n-provider'
import { cn } from '@/lib/utils'
import { SIDEBAR_CHIP_CLASS, SIDEBAR_CONTEXT_ROW_CLASS } from './sidebar-brand'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useCanCreateOrganization } from '@/features/auth/hooks/use-can-create-organization'
import { useMemberStats } from '@/features/organization/api/use-members'
import { useSettingsNav } from '@/hooks/use-settings-nav'
import { useDisplayUser } from '@/hooks/use-display-user'
import { OrgCard, orgInitials, useOrgLabels, type OrgCardOrganization } from './org-card'

const CREATE_ORGANIZATION_URL = '/settings/tenant/create'

function isClipboardTextarea(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement && target.getAttribute('aria-hidden') === 'true'
}

export function TeamSwitcher() {
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useOrgLabels()
  const { canCreate } = useCanCreateOrganization()
  const { isMobile } = useSidebar()
  const { setOpenMobile } = useSidebarActions()
  const { currentTenant, tenants, isLoading, isSwitching, switchTeam, error, loadTenants } =
    useTenant()
  const { isBootstrapped } = useBootstrapContextSafe()
  const user = useDisplayUser()
  const settingsNav = useSettingsNav()

  // Disable switching while an API call or bootstrap is in progress
  const isTransitioning = isSwitching || !isBootstrapped

  const [isOpen, setIsOpen] = React.useState(false)

  // The settings pages the card links to, when the user may open them (the
  // same permission/module decision as the settings rail).
  const { membersLink, apiKeysLink } = React.useMemo(() => {
    const items = settingsNav.flatMap((g) => g.items)
    const link = (id: string) => {
      const item = items.find((i) => i.id === id)
      return item ? { label: item.label, url: item.url } : undefined
    }
    return { membersLink: link('members'), apiKeysLink: link('api-keys') }
  }, [settingsNav])

  // Member count: one cheap stats call, only once the card is open and only
  // when the user may read members (the hook also checks the permission).
  const { stats: memberStats, isLoading: memberStatsLoading } = useMemberStats(
    isOpen && membersLink ? currentTenant?.id : undefined
  )

  // The organizations to list. If the API returned none but we know the
  // current one (from the cookie), list that.
  const organizations = React.useMemo<OrgCardOrganization[]>(() => {
    if (tenants.length > 0) return tenants.map((o) => ({ id: o.id, name: o.name, role: o.role }))
    if (currentTenant) {
      return [
        {
          id: currentTenant.id,
          name: currentTenant.name || currentTenant.slug,
          role: currentTenant.role,
        },
      ]
    }
    return []
  }, [tenants, currentTenant])

  React.useEffect(() => {
    if (error) devLog.error('[TeamSwitcher] Error fetching tenants:', error)
  }, [error])

  const handleSelect = React.useCallback(
    async (tenantId: string) => {
      if (isTransitioning) return
      const target = organizations.find((o) => o.id === tenantId)
      try {
        await switchTeam(tenantId)
        setIsOpen(false)
        toast.success(t('org.switched', 'Switched to {name}', { name: target?.name ?? '' }))
      } catch (err) {
        toast.error(getErrorMessage(err, t('org.switchFailed', 'Could not switch organization')))
      }
    },
    [switchTeam, isTransitioning, organizations, t]
  )

  // Keyboard shortcuts: ⌘⇧1-9 / Ctrl+Shift+1-9.
  //
  // Shift avoids the browser's own tab shortcuts (⌘1… on macOS, Ctrl+1… on
  // Windows/Linux). With Shift held, `event.key` is the shifted character
  // (`!`), so match the physical key (`event.code`, e.g. `Digit1`).
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      const match = event.code.match(/^Digit([1-9])$/)
      if (!match) return
      const index = parseInt(match[1], 10) - 1
      if (index < organizations.length) {
        event.preventDefault()
        handleSelect(organizations[index].id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [organizations, handleSelect])

  // Load the organization list once the app is ready (one cached request), so
  // the row knows whether there is anything to switch to before it is opened.
  React.useEffect(() => {
    if (isBootstrapped) loadTenants()
  }, [isBootstrapped, loadTenants])

  const closeAll = React.useCallback(() => {
    setIsOpen(false)
    setOpenMobile(false)
  }, [setOpenMobile])

  const goCreate = React.useCallback(() => {
    closeAll()
    router.push(CREATE_ORGANIZATION_URL)
  }, [closeAll, router])

  const currentName = currentTenant?.name || currentTenant?.slug || ''
  // The tenant cookie carries no plan; the membership list does.
  const currentPlan =
    currentTenant?.plan ?? tenants.find((o) => o.id === currentTenant?.id)?.plan ?? undefined
  const plan = labels.plan(currentPlan)
  // Something to do besides reading: another organization, or creating one.
  const hasActions = tenants.length > 1 || canCreate

  // Loading state
  if (isLoading && organizations.length === 0) {
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

  // No organization. Nothing to offer when only the platform administrator
  // creates organizations.
  if (!currentTenant) {
    if (isLoading || organizations.length > 0 || !canCreate) return null
    const createLabel = t('org.create', 'Create organization')
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={SIDEBAR_CONTEXT_ROW_CLASS}
            tooltip={createLabel}
            onClick={goCreate}
          >
            <div className={cn(SIDEBAR_CHIP_CLASS, 'bg-transparent ring-0 border border-dashed')}>
              <Plus className="size-4" />
            </div>
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
              {createLabel}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (open) loadTenants()
          }}
        >
          <PopoverTrigger asChild>
            <SidebarMenuButton
              className={cn(
                SIDEBAR_CONTEXT_ROW_CLASS,
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              )}
              tooltip={currentName}
              aria-label={t('org.details', 'Organization details') + `: ${currentName}`}
              disabled={isTransitioning}
              data-testid="team-switcher-trigger"
            >
              <div className={SIDEBAR_CHIP_CLASS}>
                {isTransitioning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  orgInitials(currentName)
                )}
              </div>

              <span className="min-w-0 flex-1 truncate text-start text-sm font-semibold group-data-[collapsible=icon]:hidden">
                {currentName}
              </span>
              {plan && (
                <span className="shrink-0 text-xs font-normal text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {plan}
                </span>
              )}
              {hasActions && (
                <ChevronsUpDown
                  className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
                  data-testid="team-switcher-chevron"
                  aria-hidden
                />
              )}
            </SidebarMenuButton>
          </PopoverTrigger>

          <PopoverContent
            className="w-80 max-w-[calc(100vw-2rem)] p-0"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={isMobile ? 4 : 8}
            collisionPadding={16}
            aria-label={t('org.details', 'Organization details')}
            // Copying over plain HTTP focuses a hidden textarea on <body>
            // (src/lib/clipboard.ts); that is not the user leaving the card.
            onFocusOutside={(event) => {
              if (isClipboardTextarea(event.target)) event.preventDefault()
            }}
          >
            <OrgCard
              current={{
                id: currentTenant.id,
                name: currentName,
                plan: currentPlan,
                role: currentTenant.role,
              }}
              organizations={organizations}
              membersLink={membersLink}
              memberCount={memberStats?.total_members}
              memberCountLoading={memberStatsLoading}
              apiKeysLink={apiKeysLink}
              canCreate={canCreate}
              email={user?.email}
              isSwitching={isTransitioning}
              onSwitch={handleSelect}
              onCreate={goCreate}
              onNavigate={closeAll}
            />
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

'use client'

/**
 * Sidebar User Component
 *
 * Displays current user info in sidebar footer with compact dropdown
 * - Fetches user data from local storage or server
 * - Shows avatar, name, and email
 * - Provides quick access to Settings and Sign out
 *
 * Note: Full account/settings menu is in ProfileDropdown (header)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
}

interface SidebarUserProps {
  /**
   * Initial user data passed from server
   */
  initialUser?: UserData | null
}

export function SidebarUser({ initialUser }: SidebarUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const [user, setUser] = useState<UserData | null>(initialUser || null)

  // Try to get user from localStorage on mount (for local auth) - syncing with external storage
  useEffect(() => {
    if (!user) {
      try {
        const storedUser = localStorage.getItem('app_user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [user])

  // Don't render if no user
  if (!user) {
    return null
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name || 'User'}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/settings/tenant" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

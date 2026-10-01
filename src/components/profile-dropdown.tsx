'use client'

import { useDisplayUser } from '@/hooks/use-display-user'
import Link from 'next/link'
import { Bell, Building2, History, LogOut, Settings, Shield, User, Users } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Can, Permission } from '@/lib/permissions'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const user = useDisplayUser()

  // Generate initials from name or email
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-none font-medium">{user?.name || 'User'}</p>
              <p className="text-muted-foreground text-xs leading-none">{user?.email || ''}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Personal Account Section */}
          <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
            Personal
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/activity" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Language */}
          <LanguageSwitcher />

          <DropdownMenuSeparator />

          {/* Organization section: only the links the user can open, gated on
              the same permissions as the route guard, so the menu never leads
              to Access Denied. Members without either see no section. */}
          <Can permission={[Permission.TeamUpdate, Permission.MembersRead]}>
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
              Organization
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <Can permission={Permission.TeamUpdate}>
                <DropdownMenuItem asChild>
                  <Link href="/settings/tenant" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    General settings
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission={Permission.MembersRead}>
                <DropdownMenuItem asChild>
                  <Link href="/settings/users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members
                  </Link>
                </DropdownMenuItem>
              </Can>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </Can>

          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <LogOut className="me-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

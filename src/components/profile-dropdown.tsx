'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Building2,
  History,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react'
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'

interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
}

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const [user, setUser] = useState<UserData | null>(null)

  // Get user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('app_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

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
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
                <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
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
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Organization Section */}
          <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
            Organization
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/settings/tenant" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                General Settings
                <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
            <DropdownMenuShortcut className="text-current">⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

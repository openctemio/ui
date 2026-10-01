'use client'

import { useDisplayUser } from '@/hooks/use-display-user'
import Link from 'next/link'
import { LogOut, Settings } from 'lucide-react'
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
import { useTranslation } from '@/context/i18n-provider'
import { useSettingsNav } from '@/hooks/use-settings-nav'

/**
 * The user menu (header avatar). The only one: the sidebar no longer has its
 * own. Its personal links are the "My account" group of
 * src/config/settings-nav.ts, so the menu, the settings rail and the /settings
 * overview list the same pages under the same names. Organization settings
 * are one click away through "All settings".
 */
export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const user = useDisplayUser()
  const { t } = useTranslation()
  const account = useSettingsNav().find((g) => g.id === 'account')

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
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full"
            aria-label={t('userMenu.open', 'Open user menu')}
          >
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

          {account && (
            <>
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                {account.label}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {account.items.map((item) => (
                  <DropdownMenuItem key={item.id} asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('userMenu.allSettings', 'All settings')}
            </Link>
          </DropdownMenuItem>
          <LanguageSwitcher />

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <LogOut className="me-2 h-4 w-4" />
            {t('userMenu.signOut', 'Sign out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

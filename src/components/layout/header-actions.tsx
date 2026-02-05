'use client'

/**
 * Header Actions Component
 *
 * Centralized header actions for dashboard pages.
 * Includes: Search, NotificationBell, ThemeSwitch, ProfileDropdown
 *
 * Usage:
 * ```tsx
 * <Header fixed>
 *   <HeaderActions />
 * </Header>
 * ```
 */

import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { NotificationBell } from '@/components/notification-bell'

interface HeaderActionsProps {
  /**
   * Hide search component
   */
  hideSearch?: boolean
  /**
   * Hide notification bell
   */
  hideNotifications?: boolean
  /**
   * Hide theme switch
   */
  hideThemeSwitch?: boolean
  /**
   * Hide profile dropdown
   */
  hideProfile?: boolean
}

export function HeaderActions({
  hideSearch = false,
  hideNotifications = false,
  hideThemeSwitch = false,
  hideProfile = false,
}: HeaderActionsProps) {
  return (
    <div className="ms-auto flex items-center gap-2 sm:gap-4">
      {!hideSearch && <Search />}
      {!hideNotifications && <NotificationBell />}
      {!hideThemeSwitch && <ThemeSwitch />}
      {!hideProfile && <ProfileDropdown />}
    </div>
  )
}

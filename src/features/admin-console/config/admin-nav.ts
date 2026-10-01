import {
  Building2,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import type { AdminRole } from '../types'

export interface AdminNavItem {
  title: string
  url: string
  icon: LucideIcon
  /** Minimum admin role to see the item; omitted = any admin. */
  minRole?: AdminRole
}

export interface AdminNavSection {
  /** Section label; omitted for the top group. */
  title?: string
  items: AdminNavItem[]
}

/**
 * Console navigation, modeled on Tenable Security Center's administrator menu
 * (Organizations, Users, System). Only pages that exist are listed. Add an
 * item together with its page, never ahead of it.
 */
export const adminNav: AdminNavSection[] = [
  {
    items: [{ title: 'Overview', url: '/admin', icon: LayoutDashboard }],
  },
  {
    title: 'Manage',
    items: [
      { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
      {
        title: 'Administrators',
        url: '/admin/administrators',
        icon: UserCog,
        minRole: 'super_admin',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Admin sign-in',
        url: '/admin/system/admin-sign-in',
        icon: KeyRound,
        minRole: 'super_admin',
      },
      { title: 'System logs', url: '/admin/system-logs', icon: ScrollText },
    ],
  },
]

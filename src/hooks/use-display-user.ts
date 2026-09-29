'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useProfile } from '@/features/account/api/use-profile'

export interface DisplayUser {
  id: string
  name: string
  email: string
  avatar?: string
}

/**
 * The signed-in user as shown in account menus (sidebar footer, header avatar).
 *
 * The source of truth is the profile API (`/users/me`, shared SWR key with the
 * Account page, so a name/avatar edit shows up here immediately). While it loads
 * we fall back to `app_user` in sessionStorage (written at login) and then to
 * the auth store. Reading only `app_user` — as these menus used to — broke every
 * tab other than the one you signed in from: sessionStorage is per-tab, and the
 * auth store is only filled by a client-side login or token refresh, so a new
 * tab had no account menu at all (no profile, no sign out).
 */
export function useDisplayUser(initialUser?: DisplayUser | null): DisplayUser | null {
  const { profile } = useProfile()
  const authUser = useAuthStore((s) => s.user)
  const [storedUser, setStoredUser] = useState<DisplayUser | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('app_user')
      if (raw) setStoredUser(JSON.parse(raw) as DisplayUser)
    } catch {
      // Storage unavailable or malformed — the other sources cover it.
    }
  }, [])

  if (initialUser) return initialUser
  if (profile) {
    return {
      id: profile.id,
      name: profile.name || profile.email,
      email: profile.email,
      avatar: profile.avatar_url,
    }
  }
  if (storedUser) return storedUser
  if (!authUser) return null
  const fullName = [authUser.firstName, authUser.lastName].filter(Boolean).join(' ')
  return {
    id: authUser.id,
    name: authUser.name || fullName || authUser.email,
    email: authUser.email,
    avatar: authUser.avatar,
  }
}

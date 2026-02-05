/**
 * Sign Out Dialog Component
 *
 * Confirmation dialog for user logout
 * - Shows confirmation before logging out
 * - Preserves return URL for re-login
 */

'use client'

import { useTransition } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { localLogoutAction } from '@/features/auth/actions/local-auth-actions'
import { clearWebSocketToken } from '@/context/websocket-provider'

// ============================================
// TYPES
// ============================================

interface SignOutDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Optional custom redirect URL after logout
   * If not provided, redirects to sign-in page
   */
  redirectTo?: string
}

// ============================================
// COMPONENT
// ============================================

export function SignOutDialog({ open, onOpenChange, redirectTo }: SignOutDialogProps) {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [isPending, startTransition] = useTransition()

  /**
   * Handle sign out confirmation
   * Calls server action to clear cookies and redirect
   */
  const handleSignOut = () => {
    // Close dialog first
    onOpenChange(false)

    // Clear localStorage user data and WebSocket token cache
    try {
      localStorage.removeItem('app_user')
      clearWebSocketToken()
    } catch {
      // Ignore localStorage errors
    }

    // Clear client-side state first
    clearAuth()

    // Call server action to clear cookies and redirect
    startTransition(async () => {
      await localLogoutAction(redirectTo || '/login')
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out"
      desc="Are you sure you want to sign out? You will need to sign in again to access your account."
      confirmText={isPending ? 'Signing out...' : 'Sign out'}
      cancelBtnText="Cancel"
      destructive
      handleConfirm={handleSignOut}
      className="sm:max-w-sm"
    />
  )
}

// ============================================
// SIMPLE SIGN OUT BUTTON (No Dialog)
// ============================================

/**
 * Simple sign out button without confirmation dialog
 * Use this when you want immediate logout without confirmation
 */
export function SignOutButton({
  children,
  className,
  redirectTo,
}: {
  children?: React.ReactNode
  className?: string
  redirectTo?: string
}) {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    // Clear localStorage user data and WebSocket token cache
    try {
      localStorage.removeItem('app_user')
      clearWebSocketToken()
    } catch {
      // Ignore localStorage errors
    }

    clearAuth()
    startTransition(async () => {
      await localLogoutAction(redirectTo || '/login')
    })
  }

  return (
    <button onClick={handleClick} className={className} disabled={isPending}>
      {isPending ? 'Signing out...' : children || 'Sign out'}
    </button>
  )
}

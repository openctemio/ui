'use client'

import { SignOutButton } from '@/components/sign-out-dialog'
import { LogOut } from 'lucide-react'

/**
 * Logout button for onboarding pages
 * Allows users to sign out and use a different account
 */
export function OnboardingLogout() {
    return (
        <SignOutButton
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3"
            redirectTo="/login"
        >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
        </SignOutButton>
    )
}

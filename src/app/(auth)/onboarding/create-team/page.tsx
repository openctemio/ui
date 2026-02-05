/**
 * Onboarding - Create First Team Page
 *
 * This page is shown after login when user has no teams.
 * Part of the auth flow: Login → No teams → Create Team → Dashboard
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { CreateTeamForm, OnboardingLogout } from '@/features/tenant'

// Helper to get suggested name from cookie
async function getSuggestedName(): Promise<string> {
  const cookieStore = await cookies()
  const userInfoCookie = cookieStore.get(env.cookies.userInfo)

  if (userInfoCookie?.value) {
    try {
      const userInfo = JSON.parse(userInfoCookie.value)
      return userInfo.name || ''
    } catch {
      return ''
    }
  }
  return ''
}

export default async function CreateFirstTeamPage() {
  // Check if user is authenticated (has refresh token)
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(env.auth.refreshCookieName)

  if (!refreshToken?.value) {
    // Not logged in - redirect to login
    redirect('/login')
  }

  // Check if user already has a team
  const tenantCookie = cookieStore.get(env.cookies.tenant)
  if (tenantCookie?.value) {
    // Already has team - redirect to dashboard
    redirect('/')
  }

  const suggestedName = await getSuggestedName()

  return (
    <div className="mx-auto max-w-lg">
      {/* Logout button in top right */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <OnboardingLogout />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to Rediver
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create your first team to get started with security management
        </p>
      </div>

      <CreateTeamForm
        showCancel={false}
        isFirstTeam={true}
        suggestedName={suggestedName}
      />
    </div>
  )
}


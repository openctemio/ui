/**
 * Onboarding - Create Team Page
 *
 * Two contexts share this page:
 *   1. First-team onboarding (user has zero tenants, came from /login)
 *   2. Additional-team flow (user came from /select-tenant — they already
 *      have tenants but want to create another one)
 *
 * The two contexts are distinguished by the presence of the
 * `pendingTenants` cookie: if it's set, the user already has tenants and
 * we're in the additional-team flow. Heading copy and back-link adjust
 * accordingly. Both flows reuse `createFirstTeamAction` because that
 * action only requires the refresh_token, which both states have.
 */

import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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

  // Check if user already has a team SELECTED (active tenant cookie).
  // If so, they're not in the unselected-tenant flow — bounce to dashboard.
  const tenantCookie = cookieStore.get(env.cookies.tenant)
  if (tenantCookie?.value) {
    redirect('/')
  }

  // Detect "additional team" context: user has pendingTenants cookie,
  // meaning they came from /select-tenant rather than from a fresh login
  // with zero tenants.
  const hasPendingTenants = !!cookieStore.get(env.cookies.pendingTenants)?.value

  const suggestedName = await getSuggestedName()

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Logout button in top right */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <OnboardingLogout />
      </div>

      {/* Back link — only shown when the user came from /select-tenant
          (i.e., they already have other teams to go back to). For first-team
          onboarding there's nowhere to go back to. */}
      {hasPendingTenants && (
        <div className="mb-4">
          <Link
            href="/select-tenant"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to team selection
          </Link>
        </div>
      )}

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {hasPendingTenants ? 'Create another team' : 'Set up your first team'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasPendingTenants
            ? 'A new team is its own workspace. You can switch between teams from the sidebar at any time.'
            : 'A team is your workspace for managing exposure across an organisation. You can invite teammates after this.'}
        </p>
      </div>

      <CreateTeamForm showCancel={false} isFirstTeam={true} suggestedName={suggestedName} />
    </div>
  )
}

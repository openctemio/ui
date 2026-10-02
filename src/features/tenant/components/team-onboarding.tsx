'use client'

import { Loader2 } from 'lucide-react'

import { useCanCreateOrganization } from '@/features/auth/hooks/use-can-create-organization'

import { CreateTeamForm } from './create-team-form'
import { NoOrganizationNotice } from './no-organization-notice'

interface TeamOnboardingProps {
  /** The user already has teams (came from /select-tenant). */
  hasOtherTeams: boolean
}

/**
 * Body of /onboarding/create-team: the create-team form when the installation
 * allows self-service organizations, otherwise a notice telling the user to ask
 * their administrator. The page keeps its sign-out button either way.
 */
export function TeamOnboarding({ hasOtherTeams }: TeamOnboardingProps) {
  const { canCreate, isLoading } = useCanCreateOrganization()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canCreate) {
    // Sign-out is the page's top-right button (OnboardingLogout).
    return <NoOrganizationNotice hasOtherTeams={hasOtherTeams} />
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {hasOtherTeams ? 'Create another team' : 'Set up your first team'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasOtherTeams
            ? 'A new team is its own workspace. You can switch between teams from the sidebar at any time.'
            : 'A team is your workspace for managing exposure across an organisation. You can invite teammates after this.'}
        </p>
      </div>

      <CreateTeamForm showCancel={false} isFirstTeam={true} />
    </>
  )
}

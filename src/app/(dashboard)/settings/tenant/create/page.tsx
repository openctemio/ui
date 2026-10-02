'use client'

/**
 * Create Team Page
 *
 * Page for creating a new team/tenant. When only the platform administrator
 * creates organizations (TENANT_CREATION_MODE=admin_only), it says so instead
 * of showing a form the server would refuse.
 */

import { Loader2 } from 'lucide-react'

import { Main } from '@/components/layout'
import { useCanCreateOrganization } from '@/features/auth/hooks/use-can-create-organization'
import { PageHeader } from '@/features/shared'
import { CreateTeamForm, NoOrganizationNotice } from '@/features/tenant'

export default function CreateTeamPage() {
  const { canCreate, isLoading } = useCanCreateOrganization()

  return (
    <>
      <Main>
        <PageHeader
          title="Create New Team"
          description="Set up a new team to organize your security assets and collaborate with others"
        />

        <div className="mt-6 flex justify-center">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
          ) : canCreate ? (
            <CreateTeamForm />
          ) : (
            <NoOrganizationNotice hasOtherTeams className="w-full max-w-lg" />
          )}
        </div>
      </Main>
    </>
  )
}

'use client'

import { Building2 } from 'lucide-react'

import { EmptyState } from '@/features/shared/components/empty-state'

interface NoOrganizationNoticeProps {
  /**
   * The user already belongs to other organizations (they came from team
   * selection or the dashboard): say only that they cannot create one here.
   */
  hasOtherTeams?: boolean
  className?: string
}

/**
 * Shown instead of the create-team form when the installation lets only the
 * platform administrator create organizations (`TENANT_CREATION_MODE=admin_only`).
 */
export function NoOrganizationNotice({
  hasOtherTeams = false,
  className,
}: NoOrganizationNoticeProps) {
  return (
    <EmptyState
      icon={Building2}
      className={className}
      title={
        hasOtherTeams
          ? 'Organizations are created by your administrator'
          : 'You are not a member of any organization yet'
      }
      description={
        hasOtherTeams
          ? 'On this installation only the platform administrator can create organizations. Ask them to create the organization you need.'
          : 'Ask your administrator to add you to an organization or to send you an invitation. If you received an invitation email, open its link to join.'
      }
    />
  )
}

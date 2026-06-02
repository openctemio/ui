'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { Main } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/features/shared'
import { usePermissions } from '@/context/permission-provider'
import { Permission } from '@/lib/permissions'

/**
 * `/settings` has no content of its own — every section lives under a child
 * route, each gated by its own permission. Previously this path 404'd. Rather
 * than redirect to a fixed section (which would bounce non-admins to an
 * access-denied page), send the user to the first section they can actually
 * reach, in the same order the sidebar lists them.
 */
const SETTINGS_SECTIONS: { path: string; permission: string }[] = [
  { path: '/settings/tenant', permission: Permission.TeamUpdate },
  { path: '/settings/users', permission: Permission.MembersRead },
  { path: '/settings/roles', permission: Permission.RolesRead },
  { path: '/settings/access-control/groups', permission: Permission.GroupsRead },
  { path: '/settings/access-control/assignment-rules', permission: Permission.AssignmentRulesRead },
  { path: '/settings/audit', permission: Permission.AuditRead },
  { path: '/settings/scoring', permission: Permission.TeamUpdate },
  { path: '/settings/asset-lifecycle', permission: Permission.TeamUpdate },
  { path: '/settings/modules', permission: Permission.TeamUpdate },
  { path: '/settings/pentest', permission: Permission.PentestWrite },
  { path: '/settings/integrations', permission: Permission.IntegrationsRead },
  { path: '/settings/sla-policies', permission: Permission.SLARead },
]

export default function SettingsIndexPage() {
  const router = useRouter()
  const { hasPermission, isLoading } = usePermissions()

  const target = useMemo(
    () =>
      isLoading ? undefined : SETTINGS_SECTIONS.find((s) => hasPermission(s.permission))?.path,
    [isLoading, hasPermission]
  )

  useEffect(() => {
    if (target) router.replace(target)
  }, [target, router])

  // No accessible section — show an honest message instead of bouncing.
  if (!isLoading && !target) {
    return (
      <Main>
        <EmptyState
          icon={Settings}
          title="No settings available"
          description="You don't have access to any settings sections. Contact your administrator if you need access."
        />
      </Main>
    )
  }

  // Loading permissions, or redirect in flight.
  return (
    <Main>
      <div className="space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    </Main>
  )
}

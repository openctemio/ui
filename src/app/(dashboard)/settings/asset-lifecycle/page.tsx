'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  LifecycleSettingsForm,
  useAssetLifecycleSettings,
  DEFAULT_LIFECYCLE_SETTINGS,
} from '@/features/asset-lifecycle'
import { usePermissions, Permission } from '@/lib/permissions'

export default function AssetLifecycleSettingsPage() {
  const { can } = usePermissions()
  const canRead = can(Permission.TeamUpdate)
  const { data, error, isLoading } = useAssetLifecycleSettings()

  return (
    <Main>
      <PageHeader
        title="Asset Lifecycle"
        description="Automatically transition stale assets out of active inventory so operators can focus on fresh exposure signal."
        className="mb-6"
      />

      {!canRead ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient permissions</AlertTitle>
          <AlertDescription>
            You need the team:update permission to view or change asset lifecycle settings.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load settings</AlertTitle>
          <AlertDescription>
            Try refreshing the page. If the problem persists the lifecycle endpoint may not be
            available on this environment.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <LifecycleSettingsForm initial={data ?? DEFAULT_LIFECYCLE_SETTINGS} />
      )}
    </Main>
  )
}

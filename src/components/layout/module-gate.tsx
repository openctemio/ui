'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'

interface ModuleGateProps {
  /** Parent module ID (e.g., 'assets', 'findings') */
  moduleId: string
  /** Sub-module slug to check (e.g., 'cloud-resources', 'domains') */
  subModuleSlug?: string
  /** Back link URL (defaults to parent page) */
  backUrl?: string
  /** Back link label */
  backLabel?: string
  children: ReactNode
}

/**
 * Gates page access based on module/sub-module visibility.
 * Shows "module not enabled" page when the module is disabled for the tenant.
 */
export function ModuleGate({
  moduleId,
  subModuleSlug,
  backUrl = '/assets',
  backLabel = 'Back',
  children,
}: ModuleGateProps) {
  const { moduleIds, subModules, isLoading } = useTenantModules()

  if (isLoading) {
    return (
      <Main>
        <div className="space-y-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </Main>
    )
  }

  // If no modules data (OSS edition), allow access
  if (moduleIds.length === 0) {
    return <>{children}</>
  }

  // Check parent module
  if (!moduleIds.includes(moduleId)) {
    return (
      <ModuleDisabledPage
        message={`The ${moduleId} module is not enabled for your organization.`}
        backUrl={backUrl}
        backLabel={backLabel}
      />
    )
  }

  // Check sub-module if specified
  if (subModuleSlug) {
    const parentSubModules = subModules[moduleId] || []

    // If parent has sub-modules configured, check visibility
    if (parentSubModules.length > 0) {
      const subModule = parentSubModules.find((m) => m.slug === subModuleSlug)
      if (subModule && (!subModule.is_active || subModule.release_status === 'disabled')) {
        return (
          <ModuleDisabledPage
            message="This feature is not enabled for your organization."
            backUrl={backUrl}
            backLabel={backLabel}
          />
        )
      }
    }
  }

  return <>{children}</>
}

function ModuleDisabledPage({
  message,
  backUrl,
  backLabel,
}: {
  message: string
  backUrl: string
  backLabel: string
}) {
  return (
    <Main>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-muted p-4">
          <ShieldOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Module Not Available</h2>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact your administrator to enable this module.
        </p>
        <Link href={backUrl} className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
      </div>
    </Main>
  )
}

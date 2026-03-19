import { type ReactNode } from 'react'
import { ModuleGate } from '@/components/layout/module-gate'

/**
 * Cloud Resources Layout - gates access based on sub-module visibility
 */
export default function CloudResourcesLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleGate moduleId="assets" subModuleSlug="cloud-resources" backUrl="/assets">
      {children}
    </ModuleGate>
  )
}

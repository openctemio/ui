'use client'

import type { ReactNode } from 'react'
import { PlatformAdminGate } from '@/features/shared'

/**
 * Application Administration area.
 *
 * Modeled on Tenable Security Center's system-level Configuration: everything
 * under /admin is for the application (platform) administrator, not tenant
 * users. One guard here covers every current and future page in the area; the
 * API enforces the same boundary (RequirePlatformAdmin).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformAdminGate
      title="Administration"
      description="Application-level configuration managed by the application administrator."
    >
      {children}
    </PlatformAdminGate>
  )
}

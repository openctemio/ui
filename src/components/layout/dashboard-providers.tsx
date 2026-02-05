'use client'

/**
 * Dashboard Providers
 *
 * Client-side providers for the dashboard layout.
 *
 * Provider order:
 * 1. TenantProvider - Team/tenant management (provides currentTenant)
 * 2. BootstrapProvider - Fetches all initial data in ONE API call
 * 3. PermissionProvider - Real-time permission sync (uses bootstrap for initial load)
 * 4. WebSocketProvider - Real-time WebSocket connection for activities, triage updates
 *
 * This setup reduces initial API calls from 4+ to 1:
 * - /me/permissions/sync → included in bootstrap
 * - /me/modules → included in bootstrap
 * - /me/subscription → included in bootstrap
 * - /dashboard/stats → included in bootstrap
 */

import { TenantProvider } from '@/context/tenant-provider'
import { BootstrapProvider } from '@/context/bootstrap-provider'
import { PermissionProvider } from '@/context/permission-provider'
import { WebSocketProvider } from '@/context/websocket-provider'

interface DashboardProvidersProps {
  children: React.ReactNode
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <TenantProvider>
      <BootstrapProvider>
        <PermissionProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </PermissionProvider>
      </BootstrapProvider>
    </TenantProvider>
  )
}

import type { ReactNode } from 'react'
import { AdminConsoleShell } from '@/features/admin-console/components/admin-console-shell'

/**
 * Platform administration console (RFC-022). A separate shell from the
 * tenant app: its own session, sidebar and navigation, and no tenant.
 */
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminConsoleShell>{children}</AdminConsoleShell>
}

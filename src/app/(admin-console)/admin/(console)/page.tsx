'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { MetricStrip, PageHeader, type MetricStripItem } from '@/features/shared'
import { useOrganizations } from '@/features/admin-console/api/use-admin-organizations'
import { useAdminUsers } from '@/features/admin-console/api/use-admin-users'
import { useAdminAuditLogs } from '@/features/admin-console/api/use-admin-audit'
import { useAdmin } from '@/features/admin-console/components/admin-console-shell'
import { AdminActivityTable } from '@/features/admin-console/components/admin-activity-table'
import { adminCan } from '@/features/admin-console/types'

export default function AdminOverviewPage() {
  const admin = useAdmin()
  const isSuper = adminCan(admin.role, 'super_admin')
  const orgs = useOrganizations({ perPage: 1 })
  // The administrator roster is super-admin only; don't ask for it otherwise.
  const admins = useAdminUsers(1, isSuper)
  const activity = useAdminAuditLogs({ page: 1 })

  const items: MetricStripItem[] = [
    { key: 'orgs', label: 'Organizations', value: orgs.data?.total ?? '—' },
    ...(isSuper
      ? [{ key: 'admins', label: 'Administrators', value: admins.data?.total ?? '—' }]
      : []),
    {
      key: 'failed',
      label: 'Failed admin actions (latest 50)',
      value: activity.data ? activity.data.data.filter((e) => !e.success).length : '—',
      tone: 'danger' as const,
    },
  ]

  return (
    <Main>
      <PageHeader
        title="Overview"
        description="Platform-wide administration: organizations, administrators and the administrator audit trail."
      >
        <Button asChild size="sm">
          <Link href="/admin/organizations">
            Organizations
            <ArrowRight className="ms-2 size-4" />
          </Link>
        </Button>
      </PageHeader>
      <div className="mt-5 space-y-5">
        <MetricStrip items={items} loading={orgs.isLoading} />
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent administrator activity</h2>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/admin/system-logs">View all</Link>
            </Button>
          </div>
          <AdminActivityTable
            entries={(activity.data?.data ?? []).slice(0, 10)}
            isLoading={activity.isLoading}
          />
        </section>
      </div>
    </Main>
  )
}

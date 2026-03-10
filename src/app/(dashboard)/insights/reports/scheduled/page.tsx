'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, Mail, FileText, CheckCircle, AlertTriangle, Pause } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6">
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </Main>
  )
}

export default function ScheduledReportsPage() {
  const { currentTenant } = useTenant()
  const { isLoading } = useDashboardStats(currentTenant?.id || null)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="Scheduled Reports"
        description="Manage automated report generation schedules"
      >
        <Button disabled>
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Active Schedules"
          value={0}
          icon={CheckCircle}
          changeType="neutral"
          description="No schedules configured"
        />
        <StatsCard
          title="Paused"
          value={0}
          icon={Pause}
          changeType="neutral"
          description="Currently paused"
        />
        <StatsCard
          title="Errors"
          value={0}
          icon={AlertTriangle}
          changeType="neutral"
          description="Need attention"
        />
        <StatsCard
          title="Total Recipients"
          value={0}
          icon={Mail}
          description="Across all schedules"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Schedules
          </CardTitle>
          <CardDescription>
            Configure automated report generation. Reports are generated at the scheduled time and
            distributed to configured recipients via email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-1 text-lg font-semibold">Coming Soon</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-center text-sm">
              This feature requires dedicated API endpoints. Configure via API to see data here.
            </p>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Report Types
          </CardTitle>
          <CardDescription>
            Choose from these report templates when creating a new schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: 'Executive Summary',
                desc: 'High-level risk posture overview with key metrics and trends. Best for leadership and stakeholders.',
                formats: ['PDF'],
              },
              {
                name: 'Technical Deep-Dive',
                desc: 'Detailed vulnerability data with remediation guidance. Best for security and engineering teams.',
                formats: ['PDF', 'CSV', 'JSON'],
              },
              {
                name: 'Compliance Status',
                desc: 'Framework compliance assessment with control status. Best for compliance and audit teams.',
                formats: ['PDF', 'CSV'],
              },
              {
                name: 'Asset Inventory',
                desc: 'Complete asset listing with risk scores and finding counts. Best for asset management.',
                formats: ['CSV', 'JSON'],
              },
            ].map((template) => (
              <div key={template.name} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">{template.name}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{template.desc}</p>
                <div className="mt-2 flex items-center gap-1">
                  {template.formats.map((fmt) => (
                    <Badge key={fmt} variant="secondary" className="text-xs">
                      {fmt}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}

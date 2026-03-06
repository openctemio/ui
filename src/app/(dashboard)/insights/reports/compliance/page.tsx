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
import {
  ClipboardCheck,
  Download,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </Main>
  )
}

export default function ComplianceReportsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="Compliance Reports"
        description="Generate and view compliance assessment reports"
      >
        <div className="flex items-center gap-2">
          <Button disabled>
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Frameworks Tracked"
          value={0}
          icon={Shield}
          description="No frameworks configured"
        />
        <StatsCard
          title="Overall Compliance"
          value="N/A"
          icon={ClipboardCheck}
          changeType="neutral"
          description="Across all frameworks"
        />
        <StatsCard
          title="Controls Passing"
          value={0}
          icon={CheckCircle}
          changeType="neutral"
          description="No controls assessed"
        />
        <StatsCard
          title="Controls Failing"
          value={0}
          icon={AlertTriangle}
          changeType="neutral"
          description="Require remediation"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Compliance Frameworks
            </CardTitle>
            <CardDescription>
              Configure compliance frameworks and run assessments to track control status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-1 text-lg font-semibold">Coming Soon</h3>
              <p className="text-muted-foreground mb-4 max-w-sm text-center text-sm">
                This feature requires dedicated API endpoints. Configure via API to see data here.
              </p>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Posture Impact
            </CardTitle>
            <CardDescription>
              How your compliance status relates to overall security posture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Total Findings</div>
                <div className="text-2xl font-bold">{stats.findings.total}</div>
                <p className="text-muted-foreground text-xs">
                  Findings that may impact compliance status
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Overdue Remediation</div>
                <div className="text-2xl font-bold">{stats.findings.overdue}</div>
                <p className="text-muted-foreground text-xs">
                  Findings past SLA that affect compliance scoring
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Average CVSS</div>
                <div className="text-2xl font-bold">{stats.findings.averageCvss.toFixed(1)}</div>
                <p className="text-muted-foreground text-xs">
                  Average severity across all findings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

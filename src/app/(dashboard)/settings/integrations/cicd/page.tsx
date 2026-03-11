'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  GitBranch,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  GitPullRequest,
  Shield,
  Settings,
  Play,
  BarChart3,
  Terminal,
} from 'lucide-react'

interface PipelineConfig {
  id: string
  name: string
  provider: string
  repository: string
  status: 'active' | 'inactive' | 'error'
  lastRun: string | null
  scansPassed: number
  scansFailed: number
  securityGate: 'enabled' | 'disabled'
}

const PLACEHOLDER_PIPELINES: PipelineConfig[] = [
  {
    id: '1',
    name: 'Main Branch Scanner',
    provider: 'GitHub Actions',
    repository: 'org/web-app',
    status: 'active',
    lastRun: '2026-03-06T08:45:00Z',
    scansPassed: 142,
    scansFailed: 8,
    securityGate: 'enabled',
  },
  {
    id: '2',
    name: 'PR Security Check',
    provider: 'GitHub Actions',
    repository: 'org/api-service',
    status: 'active',
    lastRun: '2026-03-05T22:10:00Z',
    scansPassed: 89,
    scansFailed: 3,
    securityGate: 'enabled',
  },
  {
    id: '3',
    name: 'Nightly Full Scan',
    provider: 'GitLab CI',
    repository: 'org/infrastructure',
    status: 'error',
    lastRun: '2026-03-04T02:00:00Z',
    scansPassed: 45,
    scansFailed: 12,
    securityGate: 'disabled',
  },
]

function PipelineStatusBadge({ status }: { status: PipelineConfig['status'] }) {
  const config: Record<string, { className: string; label: string }> = {
    active: { className: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Active' },
    inactive: { className: 'bg-muted text-muted-foreground', label: 'Inactive' },
    error: { className: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Error' },
  }
  const { className, label } = config[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

function PipelineRow({ pipeline }: { pipeline: PipelineConfig }) {
  const totalScans = pipeline.scansPassed + pipeline.scansFailed
  const passRate = totalScans > 0 ? Math.round((pipeline.scansPassed / totalScans) * 100) : 0

  return (
    <div className="flex items-center justify-between border-b px-4 py-4 last:border-b-0">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{pipeline.name}</span>
          <PipelineStatusBadge status={pipeline.status} />
          {pipeline.securityGate === 'enabled' && (
            <Badge variant="secondary" className="text-xs">
              <Shield className="mr-1 h-3 w-3" />
              Security Gate
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">{pipeline.provider}</span>
          <span className="text-muted-foreground text-xs">{pipeline.repository}</span>
          {pipeline.lastRun && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {new Date(pipeline.lastRun).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Progress value={passRate} className="h-1.5 w-24" />
          <span className="text-muted-foreground text-xs">{passRate}% pass rate</span>
          <span className="text-muted-foreground text-xs">
            ({pipeline.scansPassed} passed, {pipeline.scansFailed} failed)
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled title="Run now">
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
        <Button variant="outline" size="sm" disabled title="Configure">
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <GitBranch className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No CI/CD Pipelines Configured</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Integrate security scanning into your development pipelines.
        </p>
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Pipeline
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CICDIntegrationPage() {
  const { currentTenant } = useTenant()
  const { isLoading } = useDashboardStats(currentTenant?.id || null)

  const summaryStats = useMemo(() => {
    const active = PLACEHOLDER_PIPELINES.filter((p) => p.status === 'active').length
    const withGate = PLACEHOLDER_PIPELINES.filter((p) => p.securityGate === 'enabled').length
    const totalPassed = PLACEHOLDER_PIPELINES.reduce((s, p) => s + p.scansPassed, 0)
    const totalFailed = PLACEHOLDER_PIPELINES.reduce((s, p) => s + p.scansFailed, 0)
    return { active, withGate, totalPassed, totalFailed, total: PLACEHOLDER_PIPELINES.length }
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="CI/CD Integration"
        description="Configure continuous integration and deployment pipelines"
      >
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Pipeline
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Active Pipelines"
          value={summaryStats.active}
          icon={GitBranch}
          changeType="positive"
          description={`of ${summaryStats.total} configured`}
        />
        <StatsCard
          title="Security Gates"
          value={summaryStats.withGate}
          icon={Shield}
          description="Pipelines with gates"
        />
        <StatsCard
          title="Scans Passed"
          value={summaryStats.totalPassed}
          icon={CheckCircle}
          changeType="positive"
          description="Total successful scans"
        />
        <StatsCard
          title="Scans Failed"
          value={summaryStats.totalFailed}
          icon={XCircle}
          changeType={summaryStats.totalFailed > 0 ? 'negative' : 'neutral'}
          description="Blocked by security gate"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Pipeline Configurations
          </CardTitle>
          <CardDescription>
            Manage security scanning pipelines across your CI/CD platforms. Security gates can block
            deployments when critical vulnerabilities are detected.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {PLACEHOLDER_PIPELINES.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {PLACEHOLDER_PIPELINES.map((pipeline) => (
                <PipelineRow key={pipeline.id} pipeline={pipeline} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Setup
          </CardTitle>
          <CardDescription>
            Add security scanning to your pipelines with these supported platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'GitHub Actions', desc: 'Scan on push and pull request events' },
              { name: 'GitLab CI', desc: 'Integrate with .gitlab-ci.yml pipelines' },
              { name: 'Jenkins', desc: 'Use the OpenCTEM Jenkins plugin' },
              { name: 'Azure DevOps', desc: 'Add to Azure Pipelines YAML' },
              { name: 'CircleCI', desc: 'Add as an orb to your config' },
              { name: 'Bitbucket Pipelines', desc: 'Integrate with pipe configuration' },
            ].map((platform) => (
              <div key={platform.name} className="bg-muted/50 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{platform.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}

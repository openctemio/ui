'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { FileText, Layers, Copy, GitBranch, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const STATUS_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#6b7280']

export default function WorkflowTemplatesPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [stats.findings.byStatus])

  const templateCategories = useMemo(() => {
    const critical = stats.findings.bySeverity?.['critical'] ?? 0
    const high = stats.findings.bySeverity?.['high'] ?? 0
    const medium = stats.findings.bySeverity?.['medium'] ?? 0
    return [
      {
        name: 'Critical Response',
        count: critical,
        severity: 'critical' as const,
        description: 'Templates for critical vulnerability remediation',
      },
      {
        name: 'High Priority',
        count: high,
        severity: 'high' as const,
        description: 'Templates for high-severity finding workflows',
      },
      {
        name: 'Standard Remediation',
        count: medium,
        severity: 'medium' as const,
        description: 'Templates for routine remediation processes',
      },
    ]
  }, [stats.findings.bySeverity])

  const severityBadgeVariant = (severity: string): 'destructive' | 'secondary' | 'outline' => {
    if (severity === 'critical') return 'destructive'
    if (severity === 'high') return 'secondary'
    return 'outline'
  }

  if (isLoading) {
    return (
      <Main>
        <PageHeader title="Workflow Templates" description="Browse and manage workflow templates" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader title="Workflow Templates" description="Browse and manage workflow templates" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={FileText}
          description="Requiring workflows"
        />
        <StatsCard
          title="Severity Levels"
          value={Object.keys(stats.findings.bySeverity).length}
          icon={Layers}
          description="Template categories"
        />
        <StatsCard
          title="Asset Types"
          value={Object.keys(stats.assets.byType).length}
          icon={Copy}
          description="Distinct types"
        />
        <StatsCard
          title="Repositories"
          value={stats.repositories.total}
          icon={GitBranch}
          description="Code repositories"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template Coverage by Severity</CardTitle>
            <CardDescription>Finding distribution to guide template creation</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No severity data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Status Overview</CardTitle>
            <CardDescription>Current finding statuses across all workflows</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Template Categories</CardTitle>
            <CardDescription>
              Suggested workflow templates based on finding patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templateCategories.every((c) => c.count === 0) ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No findings to categorize into templates
              </div>
            ) : (
              <div className="space-y-3">
                {templateCategories.map((category) => (
                  <div key={category.name} className="flex items-start gap-3 rounded-lg border p-4">
                    {category.severity === 'critical' ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    ) : category.severity === 'high' ? (
                      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{category.name}</p>
                        <Badge variant={severityBadgeVariant(category.severity)}>
                          {category.count} findings
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

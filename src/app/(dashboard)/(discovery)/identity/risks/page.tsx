'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import { cn } from '@/lib/utils'
import { Fingerprint, ShieldAlert, AlertTriangle, KeyRound, UserX, Lock } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
}

const RISK_CATEGORIES = [
  { name: 'Weak Passwords', icon: KeyRound, color: 'text-red-500' },
  { name: 'Missing MFA', icon: Lock, color: 'text-orange-500' },
  { name: 'Stale Accounts', icon: UserX, color: 'text-yellow-500' },
  { name: 'Permission Drift', icon: ShieldAlert, color: 'text-blue-500' },
]

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

export default function IdentityRisksPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: value,
    }))
  }, [stats.assets.byType])

  const identityRiskScore = useMemo(() => {
    const total = stats.findings.total
    if (total === 0) return 0
    const critical = stats.findings.bySeverity['critical'] || 0
    const high = stats.findings.bySeverity['high'] || 0
    return Math.min(100, Math.round(((critical * 4 + high * 2) / Math.max(total, 1)) * 25))
  }, [stats.findings])

  if (isLoading) {
    return (
      <Main>
        <PageHeader title="Identity Risks" description="Assess identity-related security risks" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </Main>
    )
  }

  const hasData = stats.findings.total > 0 || stats.assets.total > 0

  return (
    <Main>
      <PageHeader title="Identity Risks" description="Assess identity-related security risks" />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Identity Findings"
          value={stats.findings.total}
          icon={Fingerprint}
          description="Across all identity assets"
        />
        <StatsCard
          title="Critical Risks"
          value={stats.findings.bySeverity['critical'] || 0}
          icon={AlertTriangle}
          changeType="negative"
          description="Require immediate attention"
        />
        <StatsCard
          title="Overdue Remediations"
          value={stats.findings.overdue}
          icon={ShieldAlert}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past remediation deadline"
        />
        <StatsCard
          title="Identity Risk Score"
          value={`${identityRiskScore}/100`}
          icon={KeyRound}
          description="Composite risk index"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Fingerprint className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Identity Risks Found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Identity risk data will appear here once assets and findings are ingested.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Severity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Breakdown by Severity</CardTitle>
                <CardDescription>Distribution of identity risks by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
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
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Identity Asset Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identity Asset Distribution</CardTitle>
                <CardDescription>Assets contributing to identity risk</CardDescription>
              </CardHeader>
              <CardContent>
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={assetTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No asset data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Categories */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Risk Categories</CardTitle>
              <CardDescription>Identity risk breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {RISK_CATEGORIES.map((category) => {
                  const Icon = category.icon
                  const count = Math.round(stats.findings.total / RISK_CATEGORIES.length)
                  const pct =
                    stats.findings.total > 0 ? Math.round((count / stats.findings.total) * 100) : 0
                  return (
                    <div key={category.name} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', category.color)} />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="text-2xl font-bold">{count}</div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-muted-foreground text-xs">{pct}% of total risks</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}

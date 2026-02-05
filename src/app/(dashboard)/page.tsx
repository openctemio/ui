'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout'
import { ProcessStepper, StatsCard } from '@/features/shared'
import { ActivityItem, QuickStat, useDashboardStats } from '@/features/dashboard'
import { Can, Permission } from '@/lib/permissions'
import {
  Server,
  AlertTriangle,
  ShieldAlert,
  ListChecks,
  Plus,
  FileWarning,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from '@/components/charts'
import { Skeleton } from '@/components/ui/skeleton'
import { PlatformStatsCard } from '@/features/platform'

// Severity colors for charts
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

// TODO: Replace with real API data when endpoint is available
// API endpoint needed: GET /api/v1/analytics/finding-trend?period=6m
const MOCK_FINDING_TRENDS = [
  { date: 'Jul', critical: 4, high: 12, medium: 18, low: 25 },
  { date: 'Aug', critical: 3, high: 15, medium: 22, low: 28 },
  { date: 'Sep', critical: 5, high: 14, medium: 20, low: 24 },
  { date: 'Oct', critical: 6, high: 18, medium: 25, low: 30 },
  { date: 'Nov', critical: 4, high: 16, medium: 23, low: 27 },
  { date: 'Dec', critical: 3, high: 12, medium: 19, low: 22 },
]

// Inline skeleton for stats cards section
function StatsCardsSkeleton() {
  return (
    <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

// Inline skeleton for charts section
function ChartsSkeleton() {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-7">
      <Card className="col-span-1 lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </section>
  )
}

// Inline skeleton for bottom sections
function BottomSectionsSkeleton() {
  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}

import { useTenant } from '@/context/tenant-provider'

export default function Dashboard() {
  const { currentTenant } = useTenant()
  const { stats, isLoading, error } = useDashboardStats(currentTenant?.id || null)

  // Calculate active findings count
  const activeFindings = Object.entries(stats.findings.byStatus)
    .filter(([status]) => !['resolved', 'closed', 'false_positive'].includes(status))
    .reduce((sum, [, count]) => sum + count, 0)

  // Prepare severity distribution for pie chart
  const severityData = Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
  }))

  // Prepare asset distribution for bar chart
  const assetDistribution = Object.entries(stats.assets.byType).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
    count,
  }))

  return (
    <>
      <Main>
        {/* Quick Actions & Process Stepper */}
        <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Quick Actions */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Can
                permission={Permission.ScansWrite}
                mode="disable"
                disabledTooltip="You don't have permission to create scans"
              >
                <Button asChild className="w-full justify-start" size="sm">
                  <Link href="/scans">
                    <Plus className="mr-2 h-4 w-4" />
                    New Scan
                  </Link>
                </Button>
              </Can>
              <Can
                permission={Permission.FindingsRead}
                mode="disable"
                disabledTooltip="You don't have permission to view findings"
              >
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/findings">
                    <FileWarning className="mr-2 h-4 w-4" />
                    View Findings
                  </Link>
                </Button>
              </Can>
              <Can
                permission={Permission.RemediationRead}
                mode="disable"
                disabledTooltip="You don't have permission to view remediation tasks"
              >
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/remediation">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Remediation Tasks
                  </Link>
                </Button>
              </Can>
              <Can
                permission={Permission.ReportsRead}
                mode="disable"
                disabledTooltip="You don't have permission to generate reports"
              >
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/reports">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Generate Report
                  </Link>
                </Button>
              </Can>
            </CardContent>
          </Card>

          {/* Process Stepper */}
          <Card className="md:col-span-1 lg:col-span-3 overflow-x-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CTEM Process</CardTitle>
              <CardDescription>Continuous Threat Exposure Management lifecycle</CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessStepper currentStep={1} />
            </CardContent>
          </Card>
        </section>

        {/* Error State - show inline error banner instead of blocking */}
        {error && (
          <Card className="mb-6 border-yellow-500/50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - Show inline skeletons while loading */}
        {isLoading ? (
          <StatsCardsSkeleton />
        ) : (
          !error && (
            <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatsCard
                title="Total Assets"
                value={stats.assets.total}
                change={
                  Object.keys(stats.assets.byType).length > 0
                    ? `${Object.keys(stats.assets.byType).length} types`
                    : 'No data'
                }
                changeType="neutral"
                icon={Server}
              />
              <StatsCard
                title="Active Findings"
                value={activeFindings}
                change={
                  stats.findings.overdue > 0 ? `${stats.findings.overdue} overdue` : 'None overdue'
                }
                changeType={stats.findings.overdue > 0 ? 'negative' : 'neutral'}
                icon={AlertTriangle}
              />
              <StatsCard
                title="Avg CVSS Score"
                value={stats.findings.averageCvss.toFixed(1)}
                change={
                  stats.findings.total > 0 ? `${stats.findings.total} findings` : 'No findings'
                }
                changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
                icon={ShieldAlert}
              />
              <StatsCard
                title="Repositories"
                value={stats.repositories.total}
                change={
                  stats.repositories.withFindings > 0
                    ? `${stats.repositories.withFindings} with findings`
                    : 'None with findings'
                }
                changeType={stats.repositories.withFindings > 0 ? 'negative' : 'neutral'}
                icon={ListChecks}
              />
              {/* Platform Agents - shows cloud scan capacity */}
              <PlatformStatsCard />
            </section>
          )
        )}

        {/* Charts Row - Show inline skeletons while loading */}
        {isLoading ? (
          <ChartsSkeleton />
        ) : (
          !error && (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-7">
              {/* Findings Trend Chart - TODO: Replace MOCK_FINDING_TRENDS with real API data */}
              <Card className="col-span-1 lg:col-span-4">
                <CardHeader>
                  <CardTitle>Findings Trend</CardTitle>
                  <CardDescription>Security findings over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={MOCK_FINDING_TRENDS}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.8}
                        name="Critical"
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="#f97316"
                        fill="#f97316"
                        fillOpacity={0.8}
                        name="High"
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke="#eab308"
                        fill="#eab308"
                        fillOpacity={0.8}
                        name="Medium"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.8}
                        name="Low"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                  <CardDescription>Findings by severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  {severityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-muted-foreground">No findings data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )
        )}

        {/* Asset Distribution & Recent Activity - Show inline skeletons while loading */}
        {isLoading ? (
          <BottomSectionsSkeleton />
        ) : (
          !error && (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Asset Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Distribution</CardTitle>
                    <CardDescription>{stats.assets.total} total assets by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assetDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={assetDistribution.length * 40}>
                        <BarChart data={assetDistribution} layout="vertical" barCategoryGap="20%">
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                          />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[250px] items-center justify-center">
                        <p className="text-muted-foreground">No asset data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest security events and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {stats.recentActivity.slice(0, 5).map((activity, index) => (
                          <ActivityItem
                            key={index}
                            icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            title={activity.title}
                            description={activity.description}
                            time={new Date(activity.timestamp).toLocaleDateString()}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center">
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Quick Stats */}
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Key metrics overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <QuickStat
                        label="Total Findings"
                        value={stats.findings.total}
                        subtext={`Avg CVSS: ${stats.findings.averageCvss.toFixed(1)}`}
                      />
                      <QuickStat
                        label="Critical Findings"
                        value={stats.findings.bySeverity.critical || 0}
                        subtext={`${stats.findings.bySeverity.high || 0} high severity`}
                      />
                      <QuickStat
                        label="Overdue"
                        value={stats.findings.overdue}
                        subtext="Require immediate attention"
                      />
                      <QuickStat
                        label="Repositories with Issues"
                        value={stats.repositories.withFindings}
                        subtext={`${stats.repositories.total} total repositories`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          )
        )}
      </Main>
    </>
  )
}

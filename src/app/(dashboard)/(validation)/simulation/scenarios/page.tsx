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
import { Route, Layers, Swords, Server, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function SimulationScenariosPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const scenarioCoverage = useMemo(() => {
    const totalTypes = Object.keys(stats.assets.byType).length
    if (totalTypes === 0) return 0
    return Math.min(100, totalTypes * 20)
  }, [stats.assets.byType])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [stats.assets.byType])

  const scenarioSuggestions = useMemo(() => {
    const suggestions = []
    const critical = stats.findings.bySeverity?.['critical'] ?? 0
    const high = stats.findings.bySeverity?.['high'] ?? 0

    if (critical > 0) {
      suggestions.push({
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        title: 'Critical Vulnerability Exploitation',
        text: `${critical} critical findings suggest scenarios targeting known vulnerability exploitation paths.`,
        badge: 'High Priority',
        badgeVariant: 'destructive' as const,
      })
    }
    if (high > 0) {
      suggestions.push({
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
        title: 'Lateral Movement Scenarios',
        text: `${high} high-severity findings indicate potential lateral movement paths that should be tested.`,
        badge: 'Recommended',
        badgeVariant: 'secondary' as const,
      })
    }
    if (stats.repositories.withFindings > 0) {
      suggestions.push({
        icon: Info,
        iconColor: 'text-blue-500',
        title: 'Supply Chain Attack Scenarios',
        text: `${stats.repositories.withFindings} repositories with findings should be tested for supply chain attack vectors.`,
        badge: 'Suggested',
        badgeVariant: 'outline' as const,
      })
    }
    if (suggestions.length === 0) {
      suggestions.push({
        icon: CheckCircle2,
        iconColor: 'text-green-500',
        title: 'Baseline Coverage',
        text: 'No critical gaps identified. Consider expanding scenarios to cover emerging threat patterns.',
        badge: 'On Track',
        badgeVariant: 'outline' as const,
      })
    }
    return suggestions
  }, [stats.findings.bySeverity, stats.repositories.withFindings])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Simulation Scenarios"
          description="Configure and manage attack simulation scenarios"
        />
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
      <PageHeader
        title="Simulation Scenarios"
        description="Configure and manage attack simulation scenarios"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Scenario Coverage"
          value={`${scenarioCoverage}%`}
          icon={Route}
          changeType={scenarioCoverage > 60 ? 'positive' : 'negative'}
          description="Asset types covered"
        />
        <StatsCard
          title="Asset Types"
          value={Object.keys(stats.assets.byType).length}
          icon={Layers}
          description="Distinct categories"
        />
        <StatsCard
          title="Attack Vectors"
          value={stats.findings.total}
          icon={Swords}
          description="Known findings"
        />
        <StatsCard
          title="Target Assets"
          value={stats.assets.total}
          icon={Server}
          description="In simulation scope"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scenario Targets by Severity</CardTitle>
            <CardDescription>Finding severity guiding scenario priority</CardDescription>
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
            <CardTitle>Asset Type Distribution</CardTitle>
            <CardDescription>Scenario targets across asset categories</CardDescription>
          </CardHeader>
          <CardContent>
            {assetTypeData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No asset type data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assetTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scenario Recommendations</CardTitle>
            <CardDescription>Suggested scenarios based on current threat landscape</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scenarioSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3 rounded-lg border p-4">
                  <suggestion.icon
                    className={cn('mt-0.5 h-5 w-5 shrink-0', suggestion.iconColor)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{suggestion.title}</p>
                      <Badge variant={suggestion.badgeVariant}>{suggestion.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.text}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">Scenario Coverage</p>
                <Progress value={scenarioCoverage} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {scenarioCoverage}% of asset types have associated simulation scenarios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

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
  Gauge,
  Save,
  RotateCcw,
  AlertTriangle,
  Shield,
  Target,
  Info,
  SlidersHorizontal,
} from 'lucide-react'

const SEVERITY_THRESHOLDS = [
  { label: 'Critical', min: 9.0, max: 10.0, color: '#dc2626' },
  { label: 'High', min: 7.0, max: 8.9, color: '#ea580c' },
  { label: 'Medium', min: 4.0, max: 6.9, color: '#ca8a04' },
  { label: 'Low', min: 0.1, max: 3.9, color: '#2563eb' },
  { label: 'Info', min: 0.0, max: 0.0, color: '#6b7280' },
]

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </Main>
  )
}

export default function ScoringConfigurationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="Scoring Configuration"
        description="Configure risk scoring weights and parameters"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button disabled>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Gauge}
          changeType={
            stats.assets.riskScore > 70
              ? 'negative'
              : stats.assets.riskScore > 40
                ? 'neutral'
                : 'positive'
          }
          description="Current portfolio score"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={Target}
          description="Average finding CVSS"
        />
        <StatsCard
          title="Weight Total"
          value="N/A"
          icon={SlidersHorizontal}
          changeType="neutral"
          description="No weights configured"
        />
        <StatsCard
          title="Critical Findings"
          value={stats.findings.bySeverity['critical'] || 0}
          icon={AlertTriangle}
          changeType={(stats.findings.bySeverity['critical'] || 0) > 0 ? 'negative' : 'positive'}
          description="Highest risk items"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Scoring Weights
          </CardTitle>
          <CardDescription>
            Adjust the weight of each factor in the overall risk score calculation. Weights must sum
            to 100%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <SlidersHorizontal className="text-muted-foreground mb-4 h-12 w-12" />
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
            <Shield className="h-5 w-5" />
            Severity Thresholds
          </CardTitle>
          <CardDescription>
            Define the score ranges that map to each severity level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            {SEVERITY_THRESHOLDS.map((threshold) => (
              <div key={threshold.label} className="rounded-lg border p-3 text-center">
                <div
                  className="mx-auto mb-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: threshold.color }}
                />
                <div className="text-sm font-semibold">{threshold.label}</div>
                <div className="text-muted-foreground text-xs">
                  {threshold.min.toFixed(1)} - {threshold.max.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Scoring Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              The risk score is calculated as a weighted sum of multiple factors. Each finding is
              evaluated against all configured weights to produce a normalized score between 0 and
              10.
            </p>
            <p>
              <strong className="text-foreground">Formula:</strong> Risk Score = Sum(Factor Score x
              Weight) / 100
            </p>
            <p>
              Asset-level scores aggregate the highest individual finding scores, adjusted by asset
              criticality and exposure level. Portfolio-level scores represent the weighted average
              across all assets.
            </p>
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}

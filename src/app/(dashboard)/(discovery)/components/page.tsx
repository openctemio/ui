'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, StatsCard } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Package,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Download,
  ArrowRight,
  Clock,
  GitBranch,
} from 'lucide-react'
import {
  useComponentStatsApi,
  useEcosystemStatsApi,
  useVulnerableComponentsApi,
} from '@/features/components/api/use-components-api'
import { EcosystemBadge } from '@/features/components'
import { SEVERITY_BADGE_SOFT } from '@/lib/severity-colors'
import { CRITICALITY_BADGE_SOFT, type CriticalityLevel } from '@/lib/criticality-colors'
import { cn } from '@/lib/utils'

const LICENSE_RISK_ORDER = ['critical', 'high', 'medium', 'low', 'unknown']

/** A section card whose header carries a "View all" link to the full list. */
function SectionCard({
  title,
  description,
  href,
  children,
}: {
  title: string
  description: ReactNode
  href: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={href}>
            View all
            <ArrowRight className="ms-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function RowsSkeleton({ rows = 3, height = 'h-10' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn(height, 'w-full')} />
      ))}
    </div>
  )
}

export default function ComponentsOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useComponentStatsApi()
  const { data: ecosystemStats, isLoading: ecosystemLoading } = useEcosystemStatsApi()
  const { data: vulnerableData, isLoading: vulnerableLoading } = useVulnerableComponentsApi(1, 5)
  const vulnerableComponents = vulnerableData?.data

  const totalComponents = stats?.total_components ?? 0
  const directDeps = stats?.direct_dependencies ?? 0
  const transitiveDeps = stats?.transitive_dependencies ?? 0
  const vulnerableCount = stats?.vulnerable_components ?? 0
  const totalVulns = stats?.total_vulnerabilities ?? 0
  const outdatedCount = stats?.outdated_components ?? 0
  const kevCount = stats?.cisa_kev_components ?? 0

  const criticalVulns = stats?.vuln_by_severity?.critical ?? 0
  const highVulns = stats?.vuln_by_severity?.high ?? 0

  const licenseRiskHigh = (stats?.license_risks?.high ?? 0) + (stats?.license_risks?.critical ?? 0)

  // License distribution for the compliance card. `license_risks` is always
  // returned as an object, so emptiness must be derived from the values, not
  // the object's presence: there is nothing worth showing when every bucket is
  // 0, or when the only populated bucket is "unknown" (a 100%-unknown breakdown
  // conveys no compliance signal — show the empty state instead).
  const licenseRiskEntries = Object.entries(stats?.license_risks ?? {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => LICENSE_RISK_ORDER.indexOf(a) - LICENSE_RISK_ORDER.indexOf(b))
  const hasMeaningfulLicenseData = licenseRiskEntries.some(([risk]) => risk !== 'unknown')

  const outdatedShare = totalComponents > 0 ? (outdatedCount / totalComponents) * 100 : 0

  return (
    <Main>
      <PageHeader
        title="Components"
        description="Your software bill of materials: the packages you depend on, their vulnerabilities and their licenses."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/components/all">
            <Package className="me-2 h-4 w-4" />
            All components
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/components/sbom-export">
            <Download className="me-2 h-4 w-4" />
            Export SBOM
          </Link>
        </Button>
      </PageHeader>

      {kevCount > 0 && (
        <Alert variant="destructive" className="mt-5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Known exploited vulnerabilities</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {kevCount.toLocaleString()}{' '}
            {kevCount === 1 ? 'component contains' : 'components contain'} vulnerabilities from the
            CISA KEV catalog and need immediate attention.
            <Button variant="outline" size="sm" asChild>
              <Link href="/components/vulnerable?cisaKev=true">
                View KEV components
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[104px] w-full rounded-xl" />)
        ) : (
          <>
            <StatsCard
              title="Total components"
              value={totalComponents.toLocaleString()}
              description={`${directDeps.toLocaleString()} direct, ${transitiveDeps.toLocaleString()} transitive`}
              icon={Package}
            />
            <StatsCard
              title="Vulnerabilities"
              value={totalVulns.toLocaleString()}
              valueClassName={criticalVulns > 0 ? 'text-destructive' : undefined}
              description={`${criticalVulns.toLocaleString()} critical, ${highVulns.toLocaleString()} high`}
              icon={ShieldAlert}
            />
            <StatsCard
              title="License risks"
              value={licenseRiskHigh.toLocaleString()}
              description="Components with high or critical license risk"
              icon={Scale}
            />
            <StatsCard
              title="Outdated"
              value={outdatedCount.toLocaleString()}
              description={`${outdatedShare.toFixed(0)}% of components`}
              icon={Clock}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Vulnerable components"
          description={`${vulnerableCount.toLocaleString()} ${vulnerableCount === 1 ? 'component needs' : 'components need'} attention`}
          href="/components/vulnerable"
        >
          {vulnerableLoading ? (
            <RowsSkeleton rows={4} height="h-12" />
          ) : vulnerableComponents && vulnerableComponents.length > 0 ? (
            <ul className="divide-y">
              {vulnerableComponents.map((component) => (
                <li
                  key={component.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{component.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {component.version}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <EcosystemBadge ecosystem={component.ecosystem ?? 'unknown'} size="sm" />
                      {component.in_cisa_kev && (
                        <Badge variant="destructive" className="text-xs">
                          KEV
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(component.critical_count ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className={cn('tabular-nums', SEVERITY_BADGE_SOFT.critical)}
                        title="Critical vulnerabilities"
                      >
                        {component.critical_count} critical
                      </Badge>
                    )}
                    {(component.high_count ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className={cn('tabular-nums', SEVERITY_BADGE_SOFT.high)}
                        title="High vulnerabilities"
                      >
                        {component.high_count} high
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              card={false}
              icon={ShieldCheck}
              title="No vulnerable components"
              description="None of your components has a known vulnerability."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Ecosystems"
          description="Components by package manager"
          href="/components/ecosystems"
        >
          {ecosystemLoading ? (
            <RowsSkeleton />
          ) : ecosystemStats && ecosystemStats.length > 0 ? (
            <div className="space-y-3">
              {ecosystemStats.slice(0, 5).map((eco) => (
                <div key={eco.ecosystem} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <EcosystemBadge ecosystem={eco.ecosystem ?? 'unknown'} />
                      <span className="text-sm font-medium tabular-nums">
                        {(eco.total ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      {(eco.vulnerable ?? 0) > 0 && (
                        <span className="text-destructive">{eco.vulnerable} vulnerable</span>
                      )}
                      {(eco.outdated ?? 0) > 0 && <span>{eco.outdated} outdated</span>}
                    </div>
                  </div>
                  <Progress
                    value={totalComponents > 0 ? ((eco.total ?? 0) / totalComponents) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              card={false}
              icon={GitBranch}
              title="No ecosystem data yet"
              description="Ecosystems appear once components are ingested from an SBOM or scan."
            />
          )}
        </SectionCard>

        <SectionCard
          title="License compliance"
          description="Components by license risk"
          href="/components/licenses"
        >
          {statsLoading ? (
            <RowsSkeleton height="h-8" />
          ) : hasMeaningfulLicenseData ? (
            <ul className="divide-y">
              {licenseRiskEntries.map(([risk, count]) => (
                <li
                  key={risk}
                  className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <Badge
                    variant={risk === 'unknown' ? 'secondary' : 'outline'}
                    className={
                      risk in CRITICALITY_BADGE_SOFT
                        ? CRITICALITY_BADGE_SOFT[risk as CriticalityLevel]
                        : undefined
                    }
                  >
                    {risk.charAt(0).toUpperCase() + risk.slice(1)} risk
                  </Badge>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {count.toLocaleString()} component{count !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              card={false}
              icon={Scale}
              title="No license data yet"
              description="License compliance populates once SBOM ingestion captures component licenses."
            />
          )}
        </SectionCard>
      </div>
    </Main>
  )
}

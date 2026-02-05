'use client'

import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Package,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Download,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  GitBranch,
  Loader2,
} from 'lucide-react'
import {
  useComponentStatsApi,
  useEcosystemStatsApi,
  useVulnerableComponentsApi,
} from '@/features/components/api/use-components-api'
import { EcosystemBadge } from '@/features/components'

export default function ComponentsOverviewPage() {
  // Fetch data from real API
  const { data: stats, isLoading: statsLoading } = useComponentStatsApi()
  const { data: ecosystemStats, isLoading: ecosystemLoading } = useEcosystemStatsApi()
  const { data: vulnerableComponents, isLoading: vulnerableLoading } = useVulnerableComponentsApi(5)

  const _isLoading = statsLoading || ecosystemLoading || vulnerableLoading

  // Extract values with defaults
  const totalComponents = stats?.total_components ?? 0
  const directDeps = stats?.direct_dependencies ?? 0
  const transitiveDeps = stats?.transitive_dependencies ?? 0
  const vulnerableCount = stats?.vulnerable_components ?? 0
  const totalVulns = stats?.total_vulnerabilities ?? 0
  const outdatedCount = stats?.outdated_components ?? 0
  const kevCount = stats?.cisa_kev_components ?? 0

  // Vulnerability severity breakdown
  const criticalVulns = stats?.vuln_by_severity?.critical ?? 0
  const highVulns = stats?.vuln_by_severity?.high ?? 0

  // License risks
  const licenseRiskHigh = (stats?.license_risks?.high ?? 0) + (stats?.license_risks?.critical ?? 0)

  return (
    <>
      <Main>
        <PageHeader
          title="Software Components"
          description="Software Bill of Materials (SBOM) and supply chain security"
        >
          <Link href="/components/sbom-export">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export SBOM
            </Button>
          </Link>
        </PageHeader>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Components</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalComponents}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {directDeps} direct, {transitiveDeps} transitive
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={criticalVulns > 0 ? 'border-red-500/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
              <ShieldAlert
                className={`h-4 w-4 ${criticalVulns > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${criticalVulns > 0 ? 'text-red-500' : ''}`}>
                    {totalVulns}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {criticalVulns > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalVulns}C
                      </Badge>
                    )}
                    {highVulns > 0 && (
                      <Badge className="bg-orange-500/15 text-orange-600 text-xs">
                        {highVulns}H
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">License Risks</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{licenseRiskHigh}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Components with compliance risks
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outdated</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-yellow-600">{outdatedCount}</div>
                  <Progress
                    value={totalComponents > 0 ? (outdatedCount / totalComponents) * 100 : 0}
                    className="mt-2 h-1.5"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Vulnerable Components */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Vulnerable Components
                </CardTitle>
                <CardDescription>{vulnerableCount} components need attention</CardDescription>
              </div>
              <Link href="/components/vulnerable">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {vulnerableLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {vulnerableComponents && vulnerableComponents.length > 0 ? (
                    vulnerableComponents.map((component) => (
                      <div
                        key={component.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium truncate">{component.name}</span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {component.version}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <EcosystemBadge ecosystem={component.ecosystem} size="sm" />
                              {component.in_cisa_kev && (
                                <Badge className="bg-red-600 text-white text-xs">CISA KEV</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {component.critical_count > 0 && (
                            <Badge variant="destructive">{component.critical_count}C</Badge>
                          )}
                          {component.high_count > 0 && (
                            <Badge className="bg-orange-500/15 text-orange-600">
                              {component.high_count}H
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No vulnerable components found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ecosystems Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Ecosystem Distribution
                </CardTitle>
                <CardDescription>Components by package manager</CardDescription>
              </div>
              <Link href="/components/ecosystems">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {ecosystemLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {ecosystemStats && ecosystemStats.length > 0 ? (
                    ecosystemStats.slice(0, 5).map((eco) => (
                      <div key={eco.ecosystem} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <EcosystemBadge ecosystem={eco.ecosystem} />
                            <span className="text-sm font-medium">{eco.total}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {eco.vulnerable > 0 && (
                              <span className="text-red-500">{eco.vulnerable} vulns</span>
                            )}
                            {eco.outdated > 0 && (
                              <span className="text-yellow-500">{eco.outdated} outdated</span>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={totalComponents > 0 ? (eco.total / totalComponents) * 100 : 0}
                          className="h-1.5"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No ecosystem data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* License Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  License Compliance
                </CardTitle>
                <CardDescription>License distribution and risks</CardDescription>
              </div>
              <Link href="/components/licenses">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : stats?.license_risks ? (
                <div className="space-y-3">
                  {Object.entries(stats.license_risks)
                    .filter(([_, count]) => count > 0)
                    .sort(([a], [b]) => {
                      const order = ['critical', 'high', 'medium', 'low', 'unknown']
                      return order.indexOf(a) - order.indexOf(b)
                    })
                    .map(([risk, count]) => (
                      <div
                        key={risk}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                      >
                        <Badge
                          variant={
                            risk === 'critical' || risk === 'high' ? 'destructive' : 'outline'
                          }
                          className={
                            risk === 'medium'
                              ? 'bg-yellow-500/15 text-yellow-600'
                              : risk === 'low'
                                ? 'bg-green-500/15 text-green-600'
                                : risk === 'unknown'
                                  ? 'bg-gray-500/15 text-gray-600'
                                  : ''
                          }
                        >
                          {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} component{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No license data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/components/all">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    View All Components
                  </Button>
                </Link>
                <Link href="/components/vulnerable">
                  <Button variant="outline" className="w-full justify-start">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Review Vulnerable Components
                    {vulnerableCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {vulnerableCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/components/licenses">
                  <Button variant="outline" className="w-full justify-start">
                    <Scale className="mr-2 h-4 w-4" />
                    License Compliance Report
                    {licenseRiskHigh > 0 && (
                      <Badge className="ml-auto bg-orange-500/15 text-orange-600">
                        {licenseRiskHigh}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/components/sbom-export">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Export SBOM
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CISA KEV Alert */}
        {kevCount > 0 && (
          <Card className="mt-6 border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                CISA Known Exploited Vulnerabilities
              </CardTitle>
              <CardDescription>
                {kevCount} component(s) contain vulnerabilities listed in CISA KEV catalog. These
                require immediate attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/components/vulnerable?cisaKev=true">
                <Button variant="destructive">
                  View KEV Components
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}

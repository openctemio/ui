'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Scale,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Download,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { LicenseRiskBadge, LicenseCategoryBadge } from '@/features/components'
import {
  useComponentStatsApi,
  useLicenseStatsApi,
} from '@/features/components/api/use-components-api'
import type { LicenseRisk, LicenseCategory } from '@/features/components'
import { toast } from 'sonner'

export default function LicensesPage() {
  // Fetch data from real API
  const { data: stats, isLoading: statsLoading } = useComponentStatsApi()
  const { data: licenseStats, isLoading: licensesLoading } = useLicenseStatsApi()

  const isLoading = statsLoading || licensesLoading

  // Calculate total components (fallback to sum of license counts if stats not available)
  const totalComponents = useMemo(() => {
    if (stats?.total_components) return stats.total_components
    if (licenseStats) return licenseStats.reduce((sum, l) => sum + l.count, 0)
    return 0
  }, [stats, licenseStats])

  // Group by license category
  const categoryStats = useMemo(() => {
    const categories: Record<LicenseCategory, { count: number; components: string[] }> = {
      permissive: { count: 0, components: [] },
      copyleft: { count: 0, components: [] },
      'weak-copyleft': { count: 0, components: [] },
      proprietary: { count: 0, components: [] },
      'public-domain': { count: 0, components: [] },
      unknown: { count: 0, components: [] },
    }

    if (!licenseStats) return categories

    licenseStats.forEach((l) => {
      const category = (l.category || 'unknown') as LicenseCategory
      if (categories[category]) {
        categories[category].count += l.count
        if (categories[category].components.length < 5) {
          categories[category].components.push(l.license_id)
        }
      }
    })

    return categories
  }, [licenseStats])

  // Count by risk level
  const riskStats = useMemo(() => {
    const risks: Record<LicenseRisk, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
      unknown: 0,
    }

    if (!licenseStats) return risks

    licenseStats.forEach((l) => {
      const risk = (l.risk || 'unknown') as LicenseRisk
      if (risks[risk] !== undefined) {
        risks[risk] += l.count
      }
    })

    return risks
  }, [licenseStats])

  const handleExport = () => {
    if (!licenseStats || licenseStats.length === 0) {
      toast.error('No license data to export')
      return
    }

    const csv = [
      ['License', 'Name', 'Category', 'Risk', 'URL', 'Component Count'].join(','),
      ...licenseStats.map((l) =>
        [`"${l.license_id}"`, `"${l.name}"`, l.category, l.risk, `"${l.url || ''}"`, l.count].join(
          ','
        )
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'license-report.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('License report exported')
  }

  const totalHighRisk = riskStats.critical + riskStats.high
  const uniqueLicenseCount = licenseStats?.length ?? 0

  return (
    <>
      <Main>
        <PageHeader
          title="License Compliance"
          description={
            isLoading
              ? 'Loading...'
              : `${uniqueLicenseCount} unique licenses across ${totalComponents} components`
          }
        >
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || uniqueLicenseCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </PageHeader>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Unique Licenses
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{uniqueLicenseCount}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across all components</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Permissive
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-500">
                  {categoryStats.permissive.count}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">MIT, Apache, BSD</p>
            </CardContent>
          </Card>

          <Card className={totalHighRisk > 0 ? 'border-orange-500/50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${totalHighRisk > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}
                />
                Copyleft / High Risk
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className={`text-3xl ${totalHighRisk > 0 ? 'text-orange-500' : ''}`}>
                  {categoryStats.copyleft.count + categoryStats['weak-copyleft'].count}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">GPL, LGPL, AGPL</p>
            </CardContent>
          </Card>

          <Card className={riskStats.unknown > 0 ? 'border-yellow-500/50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <HelpCircle
                  className={`h-4 w-4 ${riskStats.unknown > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}
                />
                Unknown
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className={`text-3xl ${riskStats.unknown > 0 ? 'text-yellow-500' : ''}`}>
                  {categoryStats.unknown.count}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Requires review</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Alert */}
        {!isLoading && totalHighRisk > 0 && (
          <Card className="mt-4 border-orange-500/50 bg-orange-500/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-600">
                    {totalHighRisk} component(s) with high-risk licenses
                  </p>
                  <p className="text-sm text-muted-foreground">
                    These licenses may have compliance implications for your organization
                  </p>
                </div>
              </div>
              <Link href="/components/all?licenseRisk=high">
                <Button variant="outline" size="sm">
                  Review Components
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* License Categories */}
          <Card>
            <CardHeader>
              <CardTitle>License Categories</CardTitle>
              <CardDescription>Distribution by license type</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(
                    Object.entries(categoryStats) as [
                      LicenseCategory,
                      { count: number; components: string[] },
                    ][]
                  ).map(([category, data]) => {
                    if (data.count === 0) return null
                    const percentage =
                      totalComponents > 0 ? (data.count / totalComponents) * 100 : 0
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <LicenseCategoryBadge category={category} />
                          <span className="text-sm font-medium">{data.count}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of components
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>Components by license risk level</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      risk: 'critical' as LicenseRisk,
                      count: riskStats.critical,
                      icon: XCircle,
                      color: 'text-red-500',
                      bg: 'bg-red-500',
                    },
                    {
                      risk: 'high' as LicenseRisk,
                      count: riskStats.high,
                      icon: AlertTriangle,
                      color: 'text-orange-500',
                      bg: 'bg-orange-500',
                    },
                    {
                      risk: 'medium' as LicenseRisk,
                      count: riskStats.medium,
                      icon: AlertTriangle,
                      color: 'text-yellow-500',
                      bg: 'bg-yellow-500',
                    },
                    {
                      risk: 'low' as LicenseRisk,
                      count: riskStats.low,
                      icon: CheckCircle,
                      color: 'text-blue-500',
                      bg: 'bg-blue-500',
                    },
                    {
                      risk: 'none' as LicenseRisk,
                      count: riskStats.none,
                      icon: CheckCircle,
                      color: 'text-green-500',
                      bg: 'bg-green-500',
                    },
                    {
                      risk: 'unknown' as LicenseRisk,
                      count: riskStats.unknown,
                      icon: HelpCircle,
                      color: 'text-slate-500',
                      bg: 'bg-slate-500',
                    },
                  ].map(({ risk, count, icon: Icon, color, bg }) => {
                    const percentage = totalComponents > 0 ? (count / totalComponents) * 100 : 0
                    return (
                      <div key={risk} className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize">{risk}</span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${bg}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* License Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Licenses</CardTitle>
            <CardDescription>Complete list of licenses in use</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : licenseStats && licenseStats.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Components</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenseStats.map((license) => (
                      <TableRow key={license.license_id}>
                        <TableCell>
                          <div>
                            {license.url ? (
                              <a
                                href={license.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                              >
                                {license.license_id}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-medium">{license.license_id}</span>
                            )}
                            {license.name && license.name !== license.license_id && (
                              <p className="text-xs text-muted-foreground">{license.name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LicenseCategoryBadge category={license.category as LicenseCategory} />
                        </TableCell>
                        <TableCell>
                          <LicenseRiskBadge
                            risk={license.risk as LicenseRisk}
                            showTooltip={false}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{license.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No license data available</p>
                <p className="text-sm mt-1">
                  License information will appear once components are scanned
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}

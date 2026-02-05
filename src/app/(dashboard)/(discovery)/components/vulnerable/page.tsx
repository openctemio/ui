'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  Shield,
  Zap,
  Target,
  Search as SearchIcon,
  Download,
  Loader2,
} from 'lucide-react'
import {
  ComponentTable,
  ComponentDetailSheet,
  transformVulnerableComponents,
} from '@/features/components'
import { useVulnerableComponentsApi } from '@/features/components/api/use-components-api'
import type { Component } from '@/features/components'
import { toast } from 'sonner'

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'kev'

export default function VulnerableComponentsPage() {
  // Fetch vulnerable components from API (no limit to get all)
  const { data: apiVulnerableComponents, isLoading } = useVulnerableComponentsApi(100)

  // Transform API data to UI Component type
  const vulnerableComponents = useMemo(() => {
    if (!apiVulnerableComponents) return []
    return transformVulnerableComponents(apiVulnerableComponents)
  }, [apiVulnerableComponents])

  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  // Calculate stats
  const stats = useMemo(() => {
    let criticalCount = 0
    let highCount = 0
    let kevCount = 0

    vulnerableComponents.forEach((c) => {
      if (c.vulnerabilityCount.critical > 0) criticalCount++
      if (c.vulnerabilityCount.high > 0) highCount++
      if (c.vulnerabilities.some((v) => v.inCisaKev)) kevCount++
    })

    return {
      total: vulnerableComponents.length,
      critical: criticalCount,
      high: highCount,
      // Note: exploitable count requires additional API data we don't have yet
      exploitable: 0,
      kev: kevCount,
    }
  }, [vulnerableComponents])

  // Filter components
  const filteredComponents = useMemo(() => {
    let result = [...vulnerableComponents]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.version.toLowerCase().includes(query) ||
          c.purl.toLowerCase().includes(query)
      )
    }

    // Apply severity filter
    switch (severityFilter) {
      case 'critical':
        result = result.filter((c) => c.vulnerabilityCount.critical > 0)
        break
      case 'high':
        result = result.filter((c) => c.vulnerabilityCount.high > 0)
        break
      case 'medium':
        result = result.filter((c) => c.vulnerabilityCount.medium > 0)
        break
      case 'kev':
        result = result.filter((c) => c.vulnerabilities.some((v) => v.inCisaKev))
        break
    }

    // Sort by risk score
    result.sort((a, b) => b.riskScore - a.riskScore)

    return result
  }, [vulnerableComponents, searchQuery, severityFilter])

  // Filter counts
  const filterCounts = useMemo(
    () => ({
      all: vulnerableComponents.length,
      critical: vulnerableComponents.filter((c) => c.vulnerabilityCount.critical > 0).length,
      high: vulnerableComponents.filter((c) => c.vulnerabilityCount.high > 0).length,
      medium: vulnerableComponents.filter((c) => c.vulnerabilityCount.medium > 0).length,
      kev: vulnerableComponents.filter((c) => c.vulnerabilities.some((v) => v.inCisaKev)).length,
    }),
    [vulnerableComponents]
  )

  const handleExport = () => {
    if (filteredComponents.length === 0) {
      toast.error('No components to export')
      return
    }

    const csv = [
      [
        'Name',
        'Version',
        'Ecosystem',
        'PURL',
        'Critical',
        'High',
        'Medium',
        'Low',
        'Risk Score',
        'CISA KEV',
      ].join(','),
      ...filteredComponents.map((c) =>
        [
          `"${c.name}"`,
          c.version,
          c.ecosystem,
          `"${c.purl}"`,
          c.vulnerabilityCount.critical,
          c.vulnerabilityCount.high,
          c.vulnerabilityCount.medium,
          c.vulnerabilityCount.low,
          c.riskScore,
          c.vulnerabilities.some((v) => v.inCisaKev) ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vulnerable-components.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Vulnerable components exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Vulnerable Components"
          description={
            isLoading
              ? 'Loading...'
              : `${stats.total} components with known security vulnerabilities`
          }
        >
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || filteredComponents.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className={`cursor-pointer hover:border-red-500 transition-colors ${
              severityFilter === 'all' ? 'border-red-500' : ''
            }`}
            onClick={() => setSeverityFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Total Vulnerable
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-red-500">{stats.total}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Components with CVEs</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:border-purple-500 transition-colors ${
              severityFilter === 'critical' ? 'border-purple-500' : ''
            }`}
            onClick={() => setSeverityFilter('critical')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                Critical Severity
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-purple-500">{stats.critical}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">CVSS 9.0+ vulnerabilities</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-orange-500 transition-colors"
            onClick={() => toast.info('Filter by exploitable coming soon')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Exploitable
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-orange-500">{stats.exploitable}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Public exploits available</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:border-red-600 transition-colors ${
              severityFilter === 'kev' ? 'border-red-600 bg-red-500/5' : ''
            }`}
            onClick={() => setSeverityFilter('kev')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-600" />
                CISA KEV
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-red-600">{stats.kev}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Known Exploited Vulnerabilities</p>
            </CardContent>
          </Card>
        </div>

        {/* CISA KEV Alert */}
        {!isLoading && stats.kev > 0 && severityFilter !== 'kev' && (
          <Card className="mt-4 border-red-500/50 bg-red-500/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-600">
                    {stats.kev} component(s) in CISA Known Exploited Vulnerabilities catalog
                  </p>
                  <p className="text-sm text-muted-foreground">
                    These vulnerabilities are actively exploited and require immediate attention
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setSeverityFilter('kev')}>
                View KEV Components
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Vulnerable Components
                </CardTitle>
                <CardDescription>
                  {isLoading
                    ? 'Loading...'
                    : `${filteredComponents.length} components requiring remediation`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <Tabs
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  All
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {isLoading ? '-' : filterCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="critical" className="gap-1.5">
                  Critical
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {isLoading ? '-' : filterCounts.critical}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="high" className="gap-1.5">
                  High
                  <Badge className="h-5 px-1.5 text-xs bg-orange-500/15 text-orange-600">
                    {isLoading ? '-' : filterCounts.high}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="medium" className="gap-1.5">
                  Medium
                  <Badge className="h-5 px-1.5 text-xs bg-yellow-500/15 text-yellow-600">
                    {isLoading ? '-' : filterCounts.medium}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="kev" className="gap-1.5">
                  CISA KEV
                  <Badge className="h-5 px-1.5 text-xs bg-red-600 text-white">
                    {isLoading ? '-' : filterCounts.kev}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, version, or PURL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ComponentTable data={filteredComponents} onViewDetails={setSelectedComponent} />
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Component Detail Sheet */}
      <ComponentDetailSheet
        component={selectedComponent}
        open={!!selectedComponent}
        onOpenChange={() => setSelectedComponent(null)}
      />
    </>
  )
}

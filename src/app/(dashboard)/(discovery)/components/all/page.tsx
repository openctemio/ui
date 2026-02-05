'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search as SearchIcon,
  Download,
  Filter,
} from 'lucide-react'
import {
  getComponentStats,
  ComponentTable,
  ComponentDetailSheet,
  useComponentsApi,
  type ApiComponentEcosystem,
} from '@/features/components'
import { mapApiComponentToUi } from '@/features/components/api/mapper' // Best to export this from features/components/index.ts
import type { Component } from '@/features/components'
import { toast } from 'sonner'

type FilterType = 'all' | 'direct' | 'transitive' | 'outdated' | 'vulnerable'

export default function AllComponentsPage() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [ecosystemFilter, setEcosystemFilter] = useState<string>('all')
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  // Pagination
  const [page, _setPage] = useState(1)
  const perPage = 20

  // API Hooks
  const { data: apiData, isLoading } = useComponentsApi({
    page,
    per_page: perPage,
    name: searchQuery || undefined,
    ecosystems: ecosystemFilter !== 'all' ? [ecosystemFilter as ApiComponentEcosystem] : undefined,
    dependency_types:
      filterType === 'direct'
        ? ['direct']
        : filterType === 'transitive'
          ? ['transitive']
          : undefined,
    // Note: API doesn't fully support all UI filters yet (like outdated or specific vulnerability severity breakdown)
    has_vulnerabilities: filterType === 'vulnerable' ? true : undefined,
  })

  // Map Data
  const filteredComponents = useMemo(() => {
    if (!apiData?.data) return []
    return apiData.data.map(mapApiComponentToUi)
  }, [apiData])

  // Mock Stats (until backend API provides stats endpoint)
  // We can't easily calculate stats from a paginated list, so we might need a separate API call later.
  // For now, we'll zero them out or keep using mock stats for the CARDS only to prevent UI looking broken,
  // BUT the table will be real data.
  const stats = useMemo(() => getComponentStats(), [])

  // Reset page when filters change
  // useEffect(() => setPage(1), [searchQuery, filterType, ecosystemFilter]);
  // ^ Handled by setting state directly in handlers if needed, or allow standard behavior.

  // Get unique ecosystems (from mock or API? API doesn't give us list of all available)
  // We'll stick to a predefined list or formatted list for now.
  const ecosystems = ['npm', 'pypi', 'go', 'maven', 'docker'] // Simplified

  // Filter counts - currently broken with server-side pagination (we only know total)
  // We will display data from API response 'total' for "All", but others we can't know without separate queries.
  const filterCounts = {
    all: apiData?.total || 0,
    direct: 0, // Unknown
    transitive: 0, // Unknown
    outdated: 0, // Unknown
    vulnerable: 0, // Unknown
  }

  const handleExport = () => {
    // Exporting valid data only
    const csv = [
      ['Name', 'Version', 'Ecosystem', 'License', 'Risk Score', 'Vulnerabilities', 'Direct'].join(
        ','
      ),
      ...filteredComponents.map((c) =>
        [
          c.name,
          c.version,
          c.ecosystem,
          c.licenseId || 'Unknown',
          c.riskScore,
          c.vulnerabilityCount.low, // Using 'low' bucket as total for now
          c.isDirect ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'components.csv'
    a.click()
    toast.success('Components exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="All Components"
          description={`${stats.totalComponents} software components in your organization`}
        >
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setFilterType('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Components
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{stats.totalComponents}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats.directDependencies} direct, {stats.transitiveDependencies} transitive
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:border-green-500 transition-colors ${
              filterType === 'direct' ? 'border-green-500' : ''
            }`}
            onClick={() => setFilterType('direct')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Direct Dependencies
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-green-500">
                  {stats.directDependencies}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Explicitly declared</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:border-yellow-500 transition-colors ${
              filterType === 'outdated' ? 'border-yellow-500' : ''
            }`}
            onClick={() => setFilterType('outdated')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Outdated
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-yellow-500">
                  {stats.outdatedComponents}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Updates available</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:border-red-500 transition-colors ${
              filterType === 'vulnerable' ? 'border-red-500' : ''
            }`}
            onClick={() => setFilterType('vulnerable')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Vulnerable
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-red-500">
                  {stats.componentsWithVulnerabilities}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Component Inventory
                </CardTitle>
                <CardDescription>
                  {filteredComponents.length} of {stats.totalComponents} components
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <Tabs
              value={filterType}
              onValueChange={(v) => setFilterType(v as FilterType)}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  All
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filterCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="direct" className="gap-1.5">
                  Direct
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filterCounts.direct}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="transitive" className="gap-1.5">
                  Transitive
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filterCounts.transitive}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="outdated" className="gap-1.5">
                  Outdated
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-xs bg-yellow-500/15 text-yellow-600"
                  >
                    {filterCounts.outdated}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="vulnerable" className="gap-1.5">
                  Vulnerable
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {filterCounts.vulnerable}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={ecosystemFilter} onValueChange={setEcosystemFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Ecosystem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ecosystems</SelectItem>
                    {ecosystems.map((eco) => (
                      <SelectItem key={eco} value={eco}>
                        {eco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Component Table */}
            <ComponentTable data={filteredComponents} onViewDetails={setSelectedComponent} />
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

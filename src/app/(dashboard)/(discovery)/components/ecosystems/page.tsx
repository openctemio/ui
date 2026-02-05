'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  FileCode,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  useEcosystemStatsApi,
  useComponentStatsApi,
  useComponentsApi,
  EcosystemBadge,
  COMPONENT_ECOSYSTEM_LABELS,
} from '@/features/components'
import type { ComponentEcosystem } from '@/features/components'

const ITEMS_PER_PAGE = 15
const TOP_ECOSYSTEMS_COUNT = 6 // Number of ecosystems to show as cards

type SortOption = 'count' | 'vulnerabilities' | 'name'
type ViewMode = 'cards' | 'table'

interface EcosystemData {
  ecosystem: ComponentEcosystem
  count: number
  vulnerabilities: number
  outdated: number
}

export default function EcosystemsPage() {
  const { data: ecosystemStatsData, isLoading: isLoadingEcosystems } = useEcosystemStatsApi()
  const { data: statsData, isLoading: isLoadingStats } = useComponentStatsApi()
  const [selectedEcosystem, setSelectedEcosystem] = useState<ComponentEcosystem | null>(null)

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('count')
  const [showAllEcosystems, setShowAllEcosystems] = useState(false)

  // Sheet state
  const [sheetSearchQuery, setSheetSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [securityFilter, setSecurityFilter] = useState<'all' | 'vulnerable' | 'secure'>('all')

  // Reset sheet state when ecosystem changes
  const handleSelectEcosystem = (ecosystem: ComponentEcosystem) => {
    setSelectedEcosystem(ecosystem)
    setSheetSearchQuery('')
    setCurrentPage(1)
    setSecurityFilter('all')
  }

  const handleCloseSheet = () => {
    setSelectedEcosystem(null)
    setSheetSearchQuery('')
    setCurrentPage(1)
    setSecurityFilter('all')
  }

  // Fetch components when an ecosystem is selected
  const { data: ecosystemComponentsData, isLoading: isLoadingComponents } = useComponentsApi(
    selectedEcosystem
      ? { ecosystems: [selectedEcosystem as string] as never[], per_page: 100 }
      : undefined
  )

  // Filter and paginate components in sheet
  const filteredComponents = useMemo(() => {
    if (!ecosystemComponentsData?.data) return []

    let filtered = ecosystemComponentsData.data

    // Apply search filter
    if (sheetSearchQuery.trim()) {
      const query = sheetSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.version.toLowerCase().includes(query) ||
          c.purl?.toLowerCase().includes(query)
      )
    }

    // Apply security filter
    if (securityFilter === 'vulnerable') {
      filtered = filtered.filter((c) => c.vulnerability_count > 0)
    } else if (securityFilter === 'secure') {
      filtered = filtered.filter((c) => c.vulnerability_count === 0)
    }

    return filtered
  }, [ecosystemComponentsData?.data, sheetSearchQuery, securityFilter])

  // Pagination
  const totalPages = Math.ceil(filteredComponents.length / ITEMS_PER_PAGE)
  const paginatedComponents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredComponents.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredComponents, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sheetSearchQuery, securityFilter])

  // Transform and sort API data
  const ecosystemStats = useMemo((): EcosystemData[] => {
    if (!ecosystemStatsData) return []
    return ecosystemStatsData.map((e) => ({
      ecosystem: e.ecosystem as ComponentEcosystem,
      count: e.total,
      vulnerabilities: e.vulnerable,
      outdated: e.outdated,
    }))
  }, [ecosystemStatsData])

  // Filter and sort ecosystems
  const processedEcosystems = useMemo(() => {
    let result = [...ecosystemStats]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((e) => {
        const label =
          COMPONENT_ECOSYSTEM_LABELS[e.ecosystem]?.toLowerCase() || e.ecosystem.toLowerCase()
        return label.includes(query) || e.ecosystem.toLowerCase().includes(query)
      })
    }

    // Apply sorting
    switch (sortBy) {
      case 'count':
        result.sort((a, b) => b.count - a.count)
        break
      case 'vulnerabilities':
        result.sort((a, b) => b.vulnerabilities - a.vulnerabilities)
        break
      case 'name':
        result.sort((a, b) => {
          const nameA = COMPONENT_ECOSYSTEM_LABELS[a.ecosystem] || a.ecosystem
          const nameB = COMPONENT_ECOSYSTEM_LABELS[b.ecosystem] || b.ecosystem
          return nameA.localeCompare(nameB)
        })
        break
    }

    return result
  }, [ecosystemStats, searchQuery, sortBy])

  // Split into top ecosystems and remaining
  const topEcosystems = useMemo(() => {
    return processedEcosystems.slice(0, TOP_ECOSYSTEMS_COUNT)
  }, [processedEcosystems])

  const remainingEcosystems = useMemo(() => {
    return processedEcosystems.slice(TOP_ECOSYSTEMS_COUNT)
  }, [processedEcosystems])

  const stats = useMemo(
    () => ({
      totalComponents: statsData?.total_components ?? 0,
      directDependencies: statsData?.direct_dependencies ?? 0,
      transitiveDependencies: statsData?.transitive_dependencies ?? 0,
      vulnerableComponents: statsData?.vulnerable_components ?? 0,
    }),
    [statsData]
  )

  const isLoading = isLoadingEcosystems || isLoadingStats

  // Render ecosystem card
  const renderEcosystemCard = (eco: EcosystemData) => {
    const percentage = stats.totalComponents > 0 ? (eco.count / stats.totalComponents) * 100 : 0
    return (
      <Card
        key={eco.ecosystem}
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => handleSelectEcosystem(eco.ecosystem)}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <EcosystemBadge ecosystem={eco.ecosystem} />
            <Badge variant="secondary">{eco.count}</Badge>
          </div>
          <CardTitle className="text-lg">
            {COMPONENT_ECOSYSTEM_LABELS[eco.ecosystem] || eco.ecosystem}
          </CardTitle>
          <CardDescription>{percentage.toFixed(1)}% of total components</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold">{eco.count}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${eco.vulnerabilities > 0 ? 'text-red-500' : 'text-green-500'}`}
              >
                {eco.vulnerabilities}
              </p>
              <p className="text-xs text-muted-foreground">Vulnerable</p>
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${eco.outdated > 0 ? 'text-yellow-500' : 'text-green-500'}`}
              >
                {eco.outdated}
              </p>
              <p className="text-xs text-muted-foreground">Outdated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render ecosystem table row
  const renderEcosystemTableRow = (eco: EcosystemData) => {
    const percentage = stats.totalComponents > 0 ? (eco.count / stats.totalComponents) * 100 : 0
    return (
      <TableRow
        key={eco.ecosystem}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSelectEcosystem(eco.ecosystem)}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            <EcosystemBadge ecosystem={eco.ecosystem} />
            <span className="font-medium">
              {COMPONENT_ECOSYSTEM_LABELS[eco.ecosystem] || eco.ecosystem}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium">{eco.count}</span>
            <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant={eco.vulnerabilities > 0 ? 'destructive' : 'outline'}
            className={
              eco.vulnerabilities === 0
                ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800'
                : ''
            }
          >
            {eco.vulnerabilities}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={
              eco.outdated > 0
                ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800'
                : ''
            }
          >
            {eco.outdated}
          </Badge>
        </TableCell>
        <TableCell>
          <Progress value={percentage} className="h-2 w-24" />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Package Ecosystems"
          description={`Components distributed across ${ecosystemStats.length} package ecosystems`}
        >
          <Link href="/components/all">
            <Button variant="outline">
              View All Components
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </PageHeader>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ecosystems
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <CardTitle className="text-3xl">{ecosystemStats.length}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Unique package managers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Total Components
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{stats.totalComponents}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across all ecosystems</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                With Vulnerabilities
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <CardTitle className="text-3xl text-red-500">
                  {ecosystemStats.reduce((acc, e) => acc + e.vulnerabilities, 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Total vulnerable components</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Outdated
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <CardTitle className="text-3xl text-yellow-500">
                  {ecosystemStats.reduce((acc, e) => acc + e.outdated, 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Updates available</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls: Search, Sort, View Toggle */}
        {!isLoading && ecosystemStats.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ecosystems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Sort by Count</SelectItem>
                  <SelectItem value="vulnerabilities">Sort by Vulnerabilities</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-24 mt-2" />
                  <Skeleton className="h-4 w-32 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full mb-4" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : processedEcosystems.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              {searchQuery ? (
                <>
                  <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Ecosystems Found</h3>
                  <p className="text-muted-foreground">
                    No ecosystems match &quot;{searchQuery}&quot;
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Components Found</h3>
                  <p className="text-muted-foreground">
                    Components will appear here once discovered from your assets.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Ecosystems</CardTitle>
              <CardDescription>
                {processedEcosystems.length} ecosystems
                {searchQuery && ` matching "${searchQuery}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ecosystem</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead>Vulnerable</TableHead>
                      <TableHead>Outdated</TableHead>
                      <TableHead>Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{processedEcosystems.map(renderEcosystemTableRow)}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card View */
          <>
            {/* Top Ecosystems */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topEcosystems.map(renderEcosystemCard)}
            </div>

            {/* Remaining Ecosystems (Collapsible) */}
            {remainingEcosystems.length > 0 && (
              <Collapsible
                open={showAllEcosystems}
                onOpenChange={setShowAllEcosystems}
                className="mt-6"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {showAllEcosystems ? 'Hide' : 'Show'} {remainingEcosystems.length} more
                      ecosystem{remainingEcosystems.length !== 1 ? 's' : ''}
                    </span>
                    {showAllEcosystems ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {remainingEcosystems.map(renderEcosystemCard)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Quick summary of collapsed ecosystems */}
            {!showAllEcosystems && remainingEcosystems.length > 0 && (
              <Card className="mt-4 bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {remainingEcosystems.length}
                      </span>{' '}
                      additional ecosystems with{' '}
                      <span className="font-medium text-foreground">
                        {remainingEcosystems.reduce((acc, e) => acc + e.count, 0)}
                      </span>{' '}
                      total components
                      {remainingEcosystems.reduce((acc, e) => acc + e.vulnerabilities, 0) > 0 && (
                        <span className="text-red-500 ml-1">
                          ({remainingEcosystems.reduce((acc, e) => acc + e.vulnerabilities, 0)}{' '}
                          vulnerable)
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAllEcosystems(true)}>
                      View All
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Main>

      {/* Ecosystem Detail Sheet */}
      <Sheet open={!!selectedEcosystem} onOpenChange={handleCloseSheet}>
        <SheetContent className="sm:max-w-4xl flex flex-col p-0">
          {selectedEcosystem && (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b bg-muted/30">
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="flex items-center gap-2 text-xl">
                        {COMPONENT_ECOSYSTEM_LABELS[selectedEcosystem] ?? selectedEcosystem}{' '}
                        Components
                      </SheetTitle>
                      <SheetDescription className="mt-1">
                        {ecosystemComponentsData?.data?.length ?? 0} components found in this
                        ecosystem
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setSecurityFilter('all')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      securityFilter === 'all'
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Total</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold">
                      {ecosystemComponentsData?.data?.length ?? 0}
                    </p>
                  </button>
                  <button
                    onClick={() => setSecurityFilter('vulnerable')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      securityFilter === 'vulnerable'
                        ? 'border-red-500 bg-red-500/5'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Vulnerable</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-red-500">
                      {ecosystemComponentsData?.data?.filter((c) => c.vulnerability_count > 0)
                        .length ?? 0}
                    </p>
                  </button>
                  <button
                    onClick={() => setSecurityFilter('secure')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      securityFilter === 'secure'
                        ? 'border-green-500 bg-green-500/5'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Secure</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-green-500">
                      {ecosystemComponentsData?.data?.filter((c) => c.vulnerability_count === 0)
                        .length ?? 0}
                    </p>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mt-4 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search packages by name or version..."
                    value={sheetSearchQuery}
                    onChange={(e) => setSheetSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {isLoadingComponents ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">Loading components...</p>
                    </div>
                  ) : paginatedComponents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Package</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>License</TableHead>
                          <TableHead className="text-right">Security</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedComponents.map((comp) => (
                          <TableRow key={comp.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted group-hover:bg-muted/80 transition-colors">
                                  <FileCode className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="font-medium truncate max-w-[250px] cursor-default">
                                          {comp.name}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <p className="break-all">{comp.purl || comp.name}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {comp.namespace && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {comp.namespace}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {comp.version}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {comp.license ? (
                                <Badge variant="secondary" className="text-xs">
                                  {comp.license}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {comp.vulnerability_count > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="destructive" className="gap-1">
                                        <ShieldAlert className="h-3 w-3" />
                                        {comp.vulnerability_count}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {comp.vulnerability_count} known{' '}
                                      {comp.vulnerability_count === 1
                                        ? 'vulnerability'
                                        : 'vulnerabilities'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Secure
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        {sheetSearchQuery || securityFilter !== 'all' ? (
                          <SearchIcon className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium">
                        {sheetSearchQuery || securityFilter !== 'all'
                          ? 'No Matches Found'
                          : 'No Components Found'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {sheetSearchQuery || securityFilter !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No components have been discovered for this ecosystem yet.'}
                      </p>
                      {(sheetSearchQuery || securityFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setSheetSearchQuery('')
                            setSecurityFilter('all')
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer with Pagination */}
              {filteredComponents.length > 0 && (
                <div className="border-t px-6 py-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredComponents.length)} of{' '}
                      {filteredComponents.length}
                      {(sheetSearchQuery || securityFilter !== 'all') && (
                        <span className="ml-1">
                          (filtered from {ecosystemComponentsData?.data?.length ?? 0})
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-sm font-medium">{currentPage}</span>
                            <span className="text-sm text-muted-foreground">/</span>
                            <span className="text-sm text-muted-foreground">{totalPages}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Link href={`/components/all?ecosystem=${selectedEcosystem}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          View All
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

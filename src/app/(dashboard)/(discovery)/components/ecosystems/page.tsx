'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, DataTable, DataTableColumnHeader } from '@/features/shared'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  FileCode,
  Search as SearchIcon,
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

const TOP_ECOSYSTEMS_COUNT = 6 // Number of ecosystems to show as cards

type SortOption = 'count' | 'vulnerabilities' | 'name'
type ViewMode = 'cards' | 'table'

type EcosystemComponent = NonNullable<
  NonNullable<ReturnType<typeof useComponentsApi>['data']>['data']
>[number]

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
  const [securityFilter, setSecurityFilter] = useState<'all' | 'vulnerable' | 'secure'>('all')

  // Reset sheet state when ecosystem changes
  const handleSelectEcosystem = (ecosystem: ComponentEcosystem) => {
    setSelectedEcosystem(ecosystem)
    setSheetSearchQuery('')
    setSecurityFilter('all')
  }

  const handleCloseSheet = () => {
    setSelectedEcosystem(null)
    setSheetSearchQuery('')
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
          c.name?.toLowerCase().includes(query) ||
          c.version?.toLowerCase().includes(query) ||
          c.purl?.toLowerCase().includes(query)
      )
    }

    // Apply security filter
    if (securityFilter === 'vulnerable') {
      filtered = filtered.filter((c) => (c.vulnerability_count ?? 0) > 0)
    } else if (securityFilter === 'secure') {
      filtered = filtered.filter((c) => (c.vulnerability_count ?? 0) === 0)
    }

    return filtered
  }, [ecosystemComponentsData?.data, sheetSearchQuery, securityFilter])

  // Transform and sort API data
  const ecosystemStats = useMemo((): EcosystemData[] => {
    if (!ecosystemStatsData) return []
    return ecosystemStatsData.map((e) => ({
      ecosystem: e.ecosystem as ComponentEcosystem,
      count: e.total ?? 0,
      vulnerabilities: e.vulnerable ?? 0,
      outdated: e.outdated ?? 0,
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

  // Table view columns. Every value is on the client, so every header sorts.
  const ecosystemColumns = useMemo<ColumnDef<EcosystemData>[]>(() => {
    const share = (count: number) =>
      stats.totalComponents > 0 ? (count / stats.totalComponents) * 100 : 0
    return [
      {
        id: 'ecosystem',
        accessorFn: (e) => COMPONENT_ECOSYSTEM_LABELS[e.ecosystem] || e.ecosystem,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ecosystem" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <EcosystemBadge ecosystem={row.original.ecosystem} />
            <span className="font-medium">
              {COMPONENT_ECOSYSTEM_LABELS[row.original.ecosystem] || row.original.ecosystem}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Components" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 tabular-nums">
            <span className="font-medium">{row.original.count}</span>
            <span className="text-xs text-muted-foreground">
              ({share(row.original.count).toFixed(1)}%)
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'vulnerabilities',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vulnerable" />,
        cell: ({ row }) => (
          <Badge
            variant={row.original.vulnerabilities > 0 ? 'destructive' : 'outline'}
            className={cn(
              'tabular-nums',
              row.original.vulnerabilities === 0 && 'text-muted-foreground'
            )}
          >
            {row.original.vulnerabilities}
          </Badge>
        ),
      },
      {
        accessorKey: 'outdated',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Outdated" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              'tabular-nums',
              row.original.outdated > 0
                ? 'border-warning/30 bg-warning/15 text-warning'
                : 'text-muted-foreground'
            )}
          >
            {row.original.outdated}
          </Badge>
        ),
      },
      {
        id: 'distribution',
        header: 'Distribution',
        cell: ({ row }) => <Progress value={share(row.original.count)} className="h-2 w-24" />,
      },
    ]
  }, [stats.totalComponents])

  // Components of the ecosystem open in the sheet.
  const componentColumns = useMemo<ColumnDef<EcosystemComponent>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Package" />,
        cell: ({ row }) => {
          const comp = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="max-w-[250px] cursor-default truncate font-medium">{comp.name}</p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="break-all">{comp.purl || comp.name}</p>
                  </TooltipContent>
                </Tooltip>
                {comp.namespace && (
                  <p className="truncate text-xs text-muted-foreground">{comp.namespace}</p>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'version',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs tabular-nums">
            {row.original.version}
          </Badge>
        ),
      },
      {
        accessorKey: 'license',
        header: ({ column }) => <DataTableColumnHeader column={column} title="License" />,
        cell: ({ row }) =>
          row.original.license ? (
            <Badge variant="secondary" className="text-xs">
              {row.original.license}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
      {
        id: 'security',
        accessorFn: (c) => c.vulnerability_count ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Security" />,
        cell: ({ row }) => {
          const count = row.original.vulnerability_count ?? 0
          return count > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="gap-1 tabular-nums">
                  <ShieldAlert className="h-3 w-3" />
                  {count}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {count} known {count === 1 ? 'vulnerability' : 'vulnerabilities'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Badge variant="outline" className="gap-1 border-success/30 bg-success/15 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Secure
            </Badge>
          )
        },
      },
    ],
    []
  )

  const searchBox = (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search ecosystems…"
        aria-label="Search ecosystems"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9 ps-9"
      />
    </div>
  )

  const viewToggle = (
    <div className="flex items-center rounded-md border">
      <Button
        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-e-none"
        aria-label="Card view"
        aria-pressed={viewMode === 'cards'}
        onClick={() => setViewMode('cards')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-s-none"
        aria-label="Table view"
        aria-pressed={viewMode === 'table'}
        onClick={() => setViewMode('table')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )

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
              <ArrowRight className="ms-2 h-4 w-4" />
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

        {/* Controls for the card view (the table view carries them in its toolbar,
            and sorts from its column headers). */}
        {!isLoading && ecosystemStats.length > 0 && viewMode === 'cards' && (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {searchBox}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px]" aria-label="Sort ecosystems">
                  <ArrowUpDown className="h-4 w-4 me-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Sort by count</SelectItem>
                  <SelectItem value="vulnerabilities">Sort by vulnerabilities</SelectItem>
                  <SelectItem value="name">Sort by name</SelectItem>
                </SelectContent>
              </Select>
              {viewToggle}
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
          searchQuery ? (
            <EmptyState
              className="mt-6"
              icon={SearchIcon}
              title="No Ecosystems Found"
              description={`No ecosystems match "${searchQuery}"`}
              action={
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              }
            />
          ) : (
            <EmptyState
              className="mt-6"
              icon={Package}
              title="No Components Found"
              description="Components will appear here once discovered from your assets."
            />
          )
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="mt-6">
            <DataTable
              columns={ecosystemColumns}
              data={processedEcosystems}
              getRowId={(e) => e.ecosystem}
              showSearch={false}
              toolbarStart={searchBox}
              toolbarEnd={viewToggle}
              onRowClick={(e) => handleSelectEcosystem(e.ecosystem)}
              emptyMessage="No ecosystems match this search"
            />
          </div>
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
                        <span className="text-red-500 ms-1">
                          ({remainingEcosystems.reduce((acc, e) => acc + e.vulnerabilities, 0)}{' '}
                          vulnerable)
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAllEcosystems(true)}>
                      View All
                      <ChevronDown className="ms-2 h-4 w-4" />
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
                        {/* Use API total (full ecosystem count), not the
                            current page (.data.length is capped at per_page=100). */}
                        {ecosystemComponentsData?.total ?? 0} components found in this ecosystem
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setSecurityFilter('all')}
                    className={`rounded-lg border p-3 text-start transition-colors ${
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
                      {/* Total = API total for this ecosystem, not the 100-item page */}
                      {ecosystemComponentsData?.total ?? 0}
                    </p>
                  </button>
                  <button
                    onClick={() => setSecurityFilter('vulnerable')}
                    className={`rounded-lg border p-3 text-start transition-colors ${
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
                      {ecosystemComponentsData?.data?.filter(
                        (c) => (c.vulnerability_count ?? 0) > 0
                      ).length ?? 0}
                    </p>
                  </button>
                  <button
                    onClick={() => setSecurityFilter('secure')}
                    className={`rounded-lg border p-3 text-start transition-colors ${
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
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <DataTable
                    columns={componentColumns}
                    data={filteredComponents}
                    getRowId={(c) => c.id ?? c.name ?? ''}
                    isLoading={isLoadingComponents}
                    showSearch={false}
                    showColumnToggle={false}
                    toolbarStart={
                      <div className="relative min-w-0 flex-1">
                        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search packages by name or version…"
                          aria-label="Search packages"
                          value={sheetSearchQuery}
                          onChange={(e) => setSheetSearchQuery(e.target.value)}
                          className="h-9 ps-9"
                        />
                      </div>
                    }
                    toolbarEnd={
                      <Link href={`/components/all?ecosystem=${selectedEcosystem}`}>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                          View all
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    }
                    emptyMessage={
                      sheetSearchQuery || securityFilter !== 'all'
                        ? 'No packages match these filters'
                        : 'No components found'
                    }
                    emptyDescription={
                      sheetSearchQuery || securityFilter !== 'all'
                        ? 'Try adjusting your search or filter'
                        : 'No components have been discovered for this ecosystem yet'
                    }
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

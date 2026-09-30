'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { AlertTriangle, Download, Eye, Package, Search } from 'lucide-react'
import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
  type MetricStripItem,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  ErrorState,
  RiskScoreBadge,
} from '@/features/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ComponentDetailSheet,
  EcosystemBadge,
  transformVulnerableComponents,
} from '@/features/components'
import {
  useAllVulnerableComponentsApi,
  VULNERABLE_FETCH_LIMIT,
} from '@/features/components/api/use-components-api'
import type { Component } from '@/features/components'
import { useUrlFilter } from '@/hooks/use-url-param'
import { exportToCsv, type ExportFieldConfig } from '@/hooks/use-csv-export'
import { SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import { cn } from '@/lib/utils'

type SeverityFilter = 'critical' | 'high' | 'medium'
const SEVERITY_FILTERS: SeverityFilter[] = ['critical', 'high', 'medium']
const PAGE_SIZES = [10, 20, 30, 50, 100]

const inKev = (c: Component) => c.vulnerabilities.some((v) => v.inCisaKev)

/** Sort keys the URL accepts, with how each one orders two rows ascending. */
const SORTERS: Record<string, (a: Component, b: Component) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  ecosystem: (a, b) => a.ecosystem.localeCompare(b.ecosystem),
  vulnerabilities: (a, b) => {
    const score = (c: Component) =>
      c.vulnerabilityCount.critical * 1e6 +
      c.vulnerabilityCount.high * 1e4 +
      c.vulnerabilityCount.medium * 1e2 +
      c.vulnerabilityCount.low
    return score(a) - score(b)
  },
  kev: (a, b) => Number(inKev(a)) - Number(inKev(b)),
  riskScore: (a, b) => a.riskScore - b.riskScore,
}

function parseSort(value: string): SortingState {
  const [id, dir] = value.split('.')
  return id && SORTERS[id] ? [{ id, desc: dir !== 'asc' }] : []
}

const EXPORT_FIELDS: ExportFieldConfig<Component>[] = [
  { header: 'Name', accessor: (c) => c.name },
  { header: 'Version', accessor: (c) => c.version },
  { header: 'Ecosystem', accessor: (c) => c.ecosystem },
  { header: 'PURL', accessor: (c) => c.purl },
  { header: 'Critical', accessor: (c) => c.vulnerabilityCount.critical },
  { header: 'High', accessor: (c) => c.vulnerabilityCount.high },
  { header: 'Medium', accessor: (c) => c.vulnerabilityCount.medium },
  { header: 'Low', accessor: (c) => c.vulnerabilityCount.low },
  { header: 'Risk score', accessor: (c) => c.riskScore },
  { header: 'CISA KEV', accessor: (c) => (inKev(c) ? 'Yes' : 'No') },
]

/** "2 critical · 1 high" — the non-zero severities, most severe first. */
function SeverityCounts({ counts }: { counts: Component['vulnerabilityCount'] }) {
  const parts = (['critical', 'high', 'medium', 'low'] as const).filter((s) => counts[s] > 0)
  if (parts.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {parts.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className={cn('h-2 w-2 rounded-full', SEVERITY_DOT_COLORS[s])} aria-hidden />
          <span className="tabular-nums">{counts[s]}</span>
          <span className="text-muted-foreground">{s}</span>
        </span>
      ))}
    </div>
  )
}

export default function VulnerableComponentsPage() {
  const { data: apiData, error, isLoading, mutate } = useAllVulnerableComponentsApi()

  // The whole view lives in the URL so a filtered list can be shared.
  const [severityParam, setSeverityParam] = useUrlFilter('severity', '')
  const [kevParam, setKevParam] = useUrlFilter('kev', 'false')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [pageParam, setPageParam] = useUrlFilter('page', '1')
  const [perPageParam, setPerPageParam] = useUrlFilter('per_page', '20')
  const [sortParam, setSortParam] = useUrlFilter('sort', '')

  const severity = SEVERITY_FILTERS.includes(severityParam as SeverityFilter)
    ? (severityParam as SeverityFilter)
    : null
  const kevOnly = kevParam === 'true'
  const sorting = useMemo(() => parseSort(sortParam), [sortParam])
  const pagination = useMemo(
    () => ({
      pageIndex: Math.max(0, (parseInt(pageParam, 10) || 1) - 1),
      pageSize: PAGE_SIZES.includes(parseInt(perPageParam, 10)) ? parseInt(perPageParam, 10) : 20,
    }),
    [pageParam, perPageParam]
  )

  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  const components = useMemo(
    () => (apiData?.data ? transformVulnerableComponents(apiData.data) : []),
    [apiData]
  )
  const total = apiData?.total ?? 0

  // Counts come from the full set, so each one matches what its filter shows.
  const counts = useMemo(
    () => ({
      critical: components.filter((c) => c.vulnerabilityCount.critical > 0).length,
      high: components.filter((c) => c.vulnerabilityCount.high > 0).length,
      medium: components.filter((c) => c.vulnerabilityCount.medium > 0).length,
      kev: components.filter(inKev).length,
    }),
    [components]
  )

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const result = components.filter(
      (c) =>
        (!severity || c.vulnerabilityCount[severity] > 0) &&
        (!kevOnly || inKev(c)) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.version.toLowerCase().includes(q) ||
          c.purl.toLowerCase().includes(q))
    )
    const sort = sorting[0]
    const cmp = sort ? SORTERS[sort.id] : SORTERS.riskScore
    const desc = sort ? sort.desc : true
    return result.sort((a, b) => (desc ? cmp(b, a) : cmp(a, b)))
  }, [components, searchQuery, severity, kevOnly, sorting])

  const pageRows = useMemo(
    () =>
      filtered.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize
      ),
    [filtered, pagination]
  )

  // A filter change starts again from the first page.
  const applyFilter = useCallback(
    (next: { severity?: SeverityFilter | null; kev?: boolean }) => {
      if (next.severity !== undefined) setSeverityParam(next.severity ?? '')
      if (next.kev !== undefined) setKevParam(next.kev ? 'true' : 'false')
      setPageParam('1')
    },
    [setSeverityParam, setKevParam, setPageParam]
  )

  const metrics: MetricStripItem[] = [
    {
      key: 'all',
      label: 'Vulnerable components',
      value: total,
      onClick: () => applyFilter({ severity: null, kev: false }),
      active: !severity && !kevOnly,
    },
    {
      key: 'critical',
      label: 'With critical',
      value: counts.critical,
      tone: 'danger',
      onClick: () => applyFilter({ severity: severity === 'critical' ? null : 'critical' }),
      active: severity === 'critical',
    },
    {
      key: 'high',
      label: 'With high',
      value: counts.high,
      onClick: () => applyFilter({ severity: severity === 'high' ? null : 'high' }),
      active: severity === 'high',
    },
    {
      key: 'medium',
      label: 'With medium',
      value: counts.medium,
      onClick: () => applyFilter({ severity: severity === 'medium' ? null : 'medium' }),
      active: severity === 'medium',
    },
    {
      key: 'kev',
      label: 'In CISA KEV',
      value: counts.kev,
      tone: 'danger',
      onClick: () => applyFilter({ kev: !kevOnly }),
      active: kevOnly,
    },
  ]

  const columns = useMemo<ColumnDef<Component>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (c) => c.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Component" />,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {c.version}
                  </Badge>
                </div>
                <p className="max-w-[320px] truncate font-mono text-xs text-muted-foreground">
                  {c.purl}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'ecosystem',
        accessorFn: (c) => c.ecosystem,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ecosystem" />,
        cell: ({ row }) => <EcosystemBadge ecosystem={row.original.ecosystem} size="sm" />,
      },
      {
        id: 'vulnerabilities',
        accessorFn: (c) => c.vulnerabilityCount.critical,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vulnerabilities" />,
        cell: ({ row }) => <SeverityCounts counts={row.original.vulnerabilityCount} />,
      },
      {
        id: 'kev',
        accessorFn: (c) => inKev(c),
        header: ({ column }) => <DataTableColumnHeader column={column} title="CISA KEV" />,
        cell: ({ row }) =>
          inKev(row.original) ? (
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-destructive"
            >
              In KEV
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'riskScore',
        accessorFn: (c) => c.riskScore,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
        cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                label: 'View details',
                icon: Eye,
                onClick: () => setSelectedComponent(row.original),
              },
            ]}
          />
        ),
      },
    ],
    []
  )

  const handleExport = () => {
    exportToCsv(filtered, EXPORT_FIELDS, 'vulnerable-components.csv')
  }

  const searchBox = (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setPageParam('1')
        }}
        placeholder="Search name, version or PURL…"
        aria-label="Search vulnerable components"
        className="h-9 ps-9"
      />
    </div>
  )

  const exportButton = (
    <Button
      variant="outline"
      size="sm"
      className="h-9"
      onClick={handleExport}
      disabled={isLoading || filtered.length === 0}
    >
      <Download className="h-4 w-4 md:me-2" />
      <span className="hidden md:inline">Export</span>
    </Button>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Vulnerable components"
          description="Open-source packages with open vulnerabilities, riskiest first."
        />

        {error ? (
          <div className="mt-5">
            <ErrorState title="vulnerable components" error={error} onRetry={() => void mutate()} />
          </div>
        ) : (
          <>
            <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

            {apiData?.truncated && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing the first {VULNERABLE_FETCH_LIMIT.toLocaleString()} of{' '}
                {total.toLocaleString()} components; counts and filters cover those only.
              </p>
            )}

            {!isLoading && counts.kev > 0 && !kevOnly && (
              <Alert variant="destructive" className="mt-5">
                <AlertTriangle />
                <AlertTitle className="line-clamp-none">
                  {counts.kev === 1
                    ? '1 component has a vulnerability in the CISA KEV catalog'
                    : `${counts.kev} components have vulnerabilities in the CISA KEV catalog`}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>These are being exploited in the wild. Fix them first.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-start sm:self-auto"
                      onClick={() => applyFilter({ severity: null, kev: true })}
                    >
                      Show KEV components
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full sm:max-w-sm" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={pageRows}
                  getRowId={(c) => c.id}
                  showSearch={false}
                  toolbarStart={searchBox}
                  toolbarEnd={exportButton}
                  manualPagination
                  rowCount={filtered.length}
                  pagination={pagination}
                  onPaginationChange={(next) => {
                    setPageParam(String(next.pageIndex + 1))
                    setPerPageParam(String(next.pageSize))
                  }}
                  pageSizeOptions={PAGE_SIZES}
                  sorting={sorting}
                  onSortingChange={(next) => {
                    const first = next[0]
                    setSortParam(
                      first && SORTERS[first.id] ? `${first.id}.${first.desc ? 'desc' : 'asc'}` : ''
                    )
                  }}
                  onRowClick={setSelectedComponent}
                  emptyMessage={
                    total === 0 ? 'No vulnerable components' : 'No components match these filters'
                  }
                  emptyDescription={
                    total === 0
                      ? 'No component has an open vulnerability.'
                      : 'Clear the search or pick another metric.'
                  }
                />
              )}
            </div>
          </>
        )}
      </Main>

      <ComponentDetailSheet
        component={selectedComponent}
        open={!!selectedComponent}
        onOpenChange={() => setSelectedComponent(null)}
      />
    </>
  )
}

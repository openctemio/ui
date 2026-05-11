/**
 * Active CVEs tab — distinct CVEs currently impacting assets in the tenant.
 *
 * Layout follows the standard CTEM page pattern (see /components/vulnerable):
 *   1. Stats-card grid on top (4 cards, click to filter)
 *   2. Filter row using <VulnerabilityFilters> for visual parity with the
 *      sibling CVE Catalog tab
 *   3. Table inside `rounded-lg border` (no Card wrapper) using the same
 *      shape as <VulnerabilityCatalogTable>
 *   4. Pagination footer with "Showing X–Y of Z" + Previous/Next buttons
 */

'use client'

import * as React from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Target,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SeverityBadge } from '@/features/shared'
import { useActiveCVEs, useActiveCVEStats, type ActiveCVE, type ActiveCVEsFilters } from '../api'
import { VulnerabilityDetailSheet } from './vulnerability-detail-sheet'
import { VulnerabilityFilters } from './vulnerability-filters'
import type { Severity } from '@/features/shared/types'
import type { Vulnerability, VulnerabilityListFilters } from '../types'

const PAGE_SIZE = 20

// Convert API row → Vulnerability fallback so VulnerabilityDetailSheet header
// renders instantly while the full /vulnerabilities/{id} fetch completes.
function rowToFallback(c: ActiveCVE): Vulnerability {
  return {
    id: c.vulnerability_id,
    cve_id: c.cve_id,
    title: c.title,
    severity: c.severity as Severity,
    cvss_score: c.cvss_score ?? undefined,
    epss_score: c.epss_score ?? undefined,
    exploit_available: c.exploit_available,
    exploit_maturity: (c.exploit_maturity ?? 'none') as Vulnerability['exploit_maturity'],
    fixed_versions: c.fixed_versions,
    status: 'open',
    risk_score: 0,
    created_at: c.first_detected_at,
    updated_at: c.last_seen_at,
  }
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  confirmed: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  accepted: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  false_positive: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
}

type StatFilter = 'all' | 'critical' | 'kev' | 'exploit'

// ---------------------------------------------------------------------------
// Sub: stat card row (matches /components/vulnerable pattern)
// ---------------------------------------------------------------------------

function StatCard({
  active,
  onClick,
  icon: Icon,
  iconColor,
  borderColor,
  label,
  value,
  description,
  loading,
  highlight,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  iconColor: string
  borderColor: string
  label: string
  value: number
  description: string
  loading: boolean
  highlight?: string
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:border-current',
        active && borderColor,
        active && highlight
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          {label}
        </CardDescription>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <CardTitle className={cn('text-3xl', iconColor)}>{value.toLocaleString()}</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub: table (mirrors VulnerabilityCatalogTable visual)
// ---------------------------------------------------------------------------

function LoadingRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function EmptyState({
  hasFilters,
  isSearching,
  searchTerm,
}: {
  hasFilters: boolean
  isSearching: boolean
  searchTerm: string
}) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Search className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No matches on this page</p>
        <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
          Search filters the currently-loaded page. Clear search ({`"${searchTerm}"`}) to paginate
          the full set.
        </p>
      </div>
    )
  }
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Bug className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No CVE matches your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust filters or widen severity to see more results.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
        <CheckCircle className="h-7 w-7 text-green-500" />
      </div>
      <p className="text-lg font-medium">No active CVEs in your tenant</p>
      <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
        No findings link any asset to a CVE. Run a vulnerability scan to populate this view.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function ActiveCVEsTab() {
  // Filter state in shape of VulnerabilityListFilters so we can reuse
  // <VulnerabilityFilters> as-is (visual parity with CVE Catalog tab).
  const [filters, setFilters] = React.useState<VulnerabilityListFilters>({
    page: 1,
    per_page: PAGE_SIZE,
  })
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statFilter, setStatFilter] = React.useState<StatFilter>('all')
  const [selected, setSelected] = React.useState<ActiveCVE | null>(null)

  // Stat card click resets to that pre-set filter combo (and resets page).
  const handleStatClick = (next: StatFilter) => {
    setStatFilter(next)
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  // Translate the catalog-style filter shape to my Active CVE filter shape,
  // overlaying stat-card shortcuts when active.
  const apiFilters: ActiveCVEsFilters = React.useMemo(() => {
    const f: ActiveCVEsFilters = {
      page: filters.page,
      perPage: filters.per_page,
    }
    if (filters.severities?.length) f.severities = filters.severities
    if (filters.cisa_kev_only) f.kevOnly = true
    if (filters.min_cvss !== undefined) f.minCvss = filters.min_cvss
    if (filters.min_epss !== undefined) f.minEpss = filters.min_epss
    if (filters.exploit_available !== undefined) f.exploitAvailable = filters.exploit_available

    // Stat-card shortcut overlays (override severity / kev / exploit when set).
    if (statFilter === 'critical') f.severities = ['critical']
    if (statFilter === 'kev') f.kevOnly = true
    if (statFilter === 'exploit') f.exploitAvailable = true

    return f
  }, [filters, statFilter])

  const { data, isLoading, error, mutate } = useActiveCVEs(apiFilters)
  // Stats (independent of pagination — always reflects tenant-wide counts)
  const { data: stats, isLoading: statsLoading } = useActiveCVEStats()

  // Reset page when stat shortcut changes
  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }))
  }, [statFilter])

  const term = searchTerm.trim().toLowerCase()
  const rows = data?.data ?? []
  const visibleRows = term
    ? rows.filter(
        (r) => r.cve_id.toLowerCase().includes(term) || r.title.toLowerCase().includes(term)
      )
    : rows

  const totalPages = data?.total_pages ?? 1
  const total = data?.total ?? 0
  const page = filters.page ?? 1
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const hasActiveFilters =
    statFilter !== 'all' ||
    (filters.severities?.length ?? 0) > 0 ||
    filters.cisa_kev_only === true ||
    filters.exploit_available === true ||
    filters.min_cvss !== undefined ||
    filters.min_epss !== undefined

  const showEmpty = !isLoading && rows.length === 0

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats Cards (clickable filter shortcuts) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            active={statFilter === 'all'}
            onClick={() => handleStatClick('all')}
            icon={Shield}
            iconColor="text-blue-500"
            borderColor="border-blue-500"
            label="Total Active"
            value={stats?.total ?? 0}
            description="Distinct CVEs in tenant"
            loading={statsLoading}
          />
          <StatCard
            active={statFilter === 'critical'}
            onClick={() => handleStatClick('critical')}
            icon={AlertTriangle}
            iconColor="text-red-500"
            borderColor="border-red-500"
            label="Critical"
            value={stats?.by_severity?.critical ?? 0}
            description="CVSS 9.0+ severity"
            loading={statsLoading}
          />
          <StatCard
            active={statFilter === 'kev'}
            onClick={() => handleStatClick('kev')}
            icon={Target}
            iconColor="text-red-600"
            borderColor="border-red-600"
            highlight="bg-red-500/5"
            label="CISA KEV"
            value={stats?.kev_count ?? 0}
            description="Known Exploited"
            loading={statsLoading}
          />
          <StatCard
            active={statFilter === 'exploit'}
            onClick={() => handleStatClick('exploit')}
            icon={Zap}
            iconColor="text-orange-500"
            borderColor="border-orange-500"
            label="With Exploit"
            value={stats?.exploit_available_count ?? 0}
            description="Public exploit available"
            loading={statsLoading}
          />
        </div>

        {/* Filter row — reuses <VulnerabilityFilters> for visual parity with
            the CVE Catalog tab. */}
        <VulnerabilityFilters
          filters={filters}
          onChange={(next) => {
            // When user touches the rich filter, drop any stat-card overlay
            // so the filter chips visually match the data being shown.
            setStatFilter('all')
            setFilters(next)
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Error state */}
        {error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">Failed to load active CVEs</p>
            <p className="mb-4 mt-1 max-w-md text-center text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button variant="outline" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">CVE ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[110px]">Severity</TableHead>
                    <TableHead className="w-[80px] text-right">CVSS</TableHead>
                    <TableHead className="w-[80px] text-right">EPSS</TableHead>
                    <TableHead className="w-[110px] text-right">Affected</TableHead>
                    <TableHead className="w-[110px] text-right">Findings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <LoadingRows />
                  ) : (
                    visibleRows.map((c) => (
                      <TableRow
                        key={c.vulnerability_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelected(c)}
                      >
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          <div className="flex items-center gap-1.5">
                            {c.cve_id}
                            {c.in_cisa_kev && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                                </TooltipTrigger>
                                <TooltipContent>CISA KEV</TooltipContent>
                              </Tooltip>
                            )}
                            {c.exploit_available && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Zap className="h-3.5 w-3.5 text-orange-600" />
                                </TooltipTrigger>
                                <TooltipContent>Public exploit available</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[400px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 text-sm">{c.title}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">
                              {c.title}
                            </TooltipContent>
                          </Tooltip>
                          {c.worst_finding_status && c.worst_finding_status !== 'unknown' && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'mt-1 text-[10px] capitalize',
                                STATUS_BADGE[c.worst_finding_status]
                              )}
                            >
                              {c.worst_finding_status.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={c.severity as Severity} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c.cvss_score != null ? c.cvss_score.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c.epss_score != null ? `${(c.epss_score * 100).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Server className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{c.affected_assets_count}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {c.open_finding_count > 0 ? (
                            <span className="font-medium text-red-600">
                              {c.open_finding_count} open
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{c.total_finding_count}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {showEmpty && (
                <EmptyState
                  hasFilters={hasActiveFilters}
                  isSearching={term !== ''}
                  searchTerm={searchTerm}
                />
              )}
            </div>

            {/* Search-active banner (matches CatalogTable convention) */}
            {!showEmpty && term !== '' && visibleRows.length > 0 && (
              <div className="flex items-center justify-between rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span>
                  Filtering current page by{' '}
                  <span className="font-mono font-medium text-foreground">
                    &ldquo;{searchTerm}&rdquo;
                  </span>{' '}
                  — <span className="font-medium text-foreground">{visibleRows.length}</span> of{' '}
                  {rows.length} row{visibleRows.length === 1 ? '' : 's'} match.
                </span>
                <span className="text-xs">Clear search to paginate the full set.</span>
              </div>
            )}

            {/* Pagination footer */}
            {!showEmpty && term === '' && total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{start}</span>–
                  <span className="font-medium">{end}</span> of{' '}
                  <span className="font-medium">{total.toLocaleString()}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setFilters((prev) => ({ ...prev, page: page - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setFilters((prev) => ({ ...prev, page: page + 1 }))}
                  >
                    Next
                    <ExternalLink className="ml-1 h-3 w-3 rotate-[-90deg]" />
                  </Button>
                </div>
              </div>
            )}

            {/* Loading-without-data inline indicator */}
            {isLoading && !data && (
              <div className="flex items-center justify-center py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        )}

        <VulnerabilityDetailSheet
          vulnerabilityId={selected?.vulnerability_id ?? null}
          fallback={selected ? rowToFallback(selected) : null}
          open={selected !== null}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      </div>
    </TooltipProvider>
  )
}

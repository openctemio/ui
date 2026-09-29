/**
 * Active CVEs tab — distinct CVEs currently impacting assets in the tenant.
 *
 * Laid out like the Findings list: a metric strip whose metrics are quick
 * filters, then the table with its filter panel toggled from the toolbar.
 * Every filter, the search and the page live in `cve_…` URL parameters.
 */

'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, RefreshCw, Server, ShieldAlert, Zap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, MetricStrip, SeverityBadge, type MetricStripItem } from '@/features/shared'
import type { Severity } from '@/features/shared/types'
import { FindingStatusBadge } from '@/features/findings/components/finding-status-badge'
import type { FindingStatus } from '@/features/findings/types'
import { useActiveCVEs, useActiveCVEStats, type ActiveCVE, type ActiveCVEsFilters } from '../api'
import { VulnerabilityDetailSheet } from './vulnerability-detail-sheet'
import {
  FilterLayout,
  FilterSearchBox,
  FilterToggleButtons,
  VULN_PAGE_SIZES,
  VulnerabilityFilters,
  useFilterPanelOpen,
  useVulnFilterParams,
} from './vulnerability-filters'
import { VulnerabilityTableSkeleton } from './vulnerability-catalog-table'
import type { Vulnerability } from '../types'

const PANEL_ID = 'active-cve-filters'

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

// The active-CVE API has no sort parameter, so no column offers a sort control.
const COLUMNS: ColumnDef<ActiveCVE>[] = [
  {
    id: 'cve_id',
    header: 'CVE ID',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-mono text-sm font-medium">{c.cve_id}</span>
          {c.in_cisa_kev && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" aria-label="CISA KEV" />
              </TooltipTrigger>
              <TooltipContent>CISA KEV</TooltipContent>
            </Tooltip>
          )}
          {c.exploit_available && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Zap
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-label="Public exploit available"
                />
              </TooltipTrigger>
              <TooltipContent>Public exploit available</TooltipContent>
            </Tooltip>
          )}
        </div>
      )
    },
  },
  {
    id: 'title',
    header: 'Title',
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="min-w-[16rem] max-w-[28rem] space-y-1">
          <span className="line-clamp-2 text-sm" title={c.title}>
            {c.title}
          </span>
          {c.worst_finding_status && c.worst_finding_status !== 'unknown' && (
            <FindingStatusBadge
              status={c.worst_finding_status as FindingStatus}
              variant="outline"
              className="text-xs"
            />
          )}
        </div>
      )
    },
  },
  {
    id: 'severity',
    header: 'Severity',
    enableSorting: false,
    cell: ({ row }) => <SeverityBadge severity={row.original.severity as Severity} />,
  },
  {
    id: 'cvss',
    header: () => <div className="text-end">CVSS</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-end text-sm tabular-nums">
        {row.original.cvss_score != null ? row.original.cvss_score.toFixed(1) : '—'}
      </div>
    ),
  },
  {
    id: 'epss',
    header: () => <div className="text-end">EPSS</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-end text-sm tabular-nums">
        {row.original.epss_score != null ? `${(row.original.epss_score * 100).toFixed(1)}%` : '—'}
      </div>
    ),
  },
  {
    id: 'affected',
    header: () => <div className="text-end">Affected assets</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1 text-sm tabular-nums">
        <Server className="h-3.5 w-3.5 text-muted-foreground" />
        {row.original.affected_assets_count.toLocaleString()}
      </div>
    ),
  },
  {
    id: 'findings',
    header: () => <div className="text-end">Findings</div>,
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="text-end text-sm tabular-nums">
          {c.open_finding_count > 0 ? (
            <span className="font-medium text-destructive">
              {c.open_finding_count.toLocaleString()} open
            </span>
          ) : (
            <span className="text-muted-foreground">{c.total_finding_count.toLocaleString()}</span>
          )}
        </div>
      )
    },
  },
]

export function ActiveCVEsTab() {
  // `cve_` params: this tab's filters never leak into the CVE catalog tab.
  const f = useVulnFilterParams('cve_')
  const panel = useFilterPanelOpen('openctem:active-cve-filters-open')
  const [selected, setSelected] = React.useState<ActiveCVE | null>(null)

  const apiFilters: ActiveCVEsFilters = {
    page: f.pagination.pageIndex + 1,
    perPage: f.pagination.pageSize,
    severities: f.severities.length ? f.severities : undefined,
    kevOnly: f.kevOnly || undefined,
    minCvss: f.minCvss,
    minEpss: f.minEpss,
    exploitAvailable: f.exploitOnly || undefined,
  }

  const { data, isLoading, error, mutate } = useActiveCVEs(apiFilters)
  // Stats are independent of pagination and filters: tenant-wide counts.
  const { data: stats, isLoading: statsLoading } = useActiveCVEStats()

  // Search narrows the loaded page only (the API has no search parameter).
  const term = f.search.trim().toLowerCase()
  const rows = data?.data ?? []
  const visibleRows = term
    ? rows.filter(
        (r) => r.cve_id.toLowerCase().includes(term) || r.title.toLowerCase().includes(term)
      )
    : rows

  const total = data?.total ?? 0
  const { pageIndex, pageSize } = f.pagination
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = Math.min(total, pageIndex * pageSize + rows.length)

  const onlyCritical = f.severities.length === 1 && f.severities[0] === 'critical'
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Active CVEs',
      value: stats?.total ?? 0,
      onClick: f.clearAll,
      active: f.activeCount === 0,
    },
    {
      key: 'critical',
      label: 'Critical',
      value: stats?.by_severity?.critical ?? 0,
      tone: 'danger',
      onClick: () => f.setSeverities(onlyCritical ? [] : ['critical']),
      active: onlyCritical,
    },
    {
      key: 'kev',
      label: 'CISA KEV',
      value: stats?.kev_count ?? 0,
      tone: 'danger',
      onClick: () => f.setKevOnly(!f.kevOnly),
      active: f.kevOnly,
    },
    {
      key: 'exploit',
      label: 'Public exploit',
      value: stats?.exploit_available_count ?? 0,
      onClick: () => f.setExploitOnly(!f.exploitOnly),
      active: f.exploitOnly,
    },
  ]

  const hasFilters = f.activeCount > 0
  const isSearching = term !== ''

  const toolbarStart = (
    <>
      <FilterToggleButtons
        panelId={PANEL_ID}
        activeCount={f.activeCount}
        open={panel.open}
        onToggle={panel.toggle}
        onOpenSheet={() => panel.setSheetOpen(true)}
      />
      <FilterSearchBox
        value={f.search}
        onChange={f.setSearch}
        placeholder="Search this page by CVE ID or title…"
        label="Search active CVEs"
      />
    </>
  )
  const toolbarEnd = (
    <span className="hidden text-sm tabular-nums text-muted-foreground xl:inline">
      {isSearching
        ? `${visibleRows.length} of ${rows.length} on this page`
        : total === 0
          ? 'No results'
          : `${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
    </span>
  )

  return (
    <TooltipProvider>
      <MetricStrip loading={statsLoading} items={metrics} />

      <div className="mt-5">
        <FilterLayout
          panelId={PANEL_ID}
          label="Active CVE filters"
          open={panel.open}
          sheetOpen={panel.sheetOpen}
          onSheetOpenChange={panel.setSheetOpen}
          panel={<VulnerabilityFilters state={f} />}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not load active CVEs</AlertTitle>
              <AlertDescription>
                <p>{error instanceof Error ? error.message : 'The request failed.'}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => void mutate()}>
                  <RefreshCw className="me-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoading && !data ? (
            <VulnerabilityTableSkeleton />
          ) : (
            <DataTable
              columns={COLUMNS}
              data={visibleRows}
              showSearch={false}
              toolbarStart={toolbarStart}
              toolbarEnd={toolbarEnd}
              getRowId={(c) => c.vulnerability_id}
              manualPagination
              rowCount={total}
              pagination={f.pagination}
              onPaginationChange={f.setPagination}
              pageSizeOptions={VULN_PAGE_SIZES}
              // "Next page" would not continue a page-local search.
              showPagination={!isSearching}
              onRowClick={setSelected}
              emptyMessage={
                isSearching
                  ? 'No matches on this page'
                  : hasFilters
                    ? 'No active CVEs match these filters'
                    : 'No active CVEs'
              }
              emptyDescription={
                isSearching
                  ? 'Search narrows the loaded page only. Clear it to page through every CVE.'
                  : hasFilters
                    ? 'Try removing a filter or clearing them all.'
                    : 'No findings link an asset to a CVE yet. Run a vulnerability scan to fill this view.'
              }
            />
          )}
        </FilterLayout>
      </div>

      <VulnerabilityDetailSheet
        vulnerabilityId={selected?.vulnerability_id ?? null}
        fallback={selected ? rowToFallback(selected) : null}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </TooltipProvider>
  )
}

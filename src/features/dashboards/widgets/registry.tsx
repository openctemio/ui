/**
 * Widget registry for customizable dashboards (RFC-021 Phase-1b).
 *
 * Every widget renders REAL data from an existing hook — no placeholders. A
 * dashboard's layout references these by `widget_type`; the catalog is built
 * from this map, permission-filtered per viewer.
 */

'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Permission } from '@/lib/permissions'
import { useTenant } from '@/context/tenant-provider'
import { useDashboardStats } from '@/features/dashboard'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import {
  useExecutiveSummary,
  useThreatIntelStats,
  useScanCoverage,
  useAttackPaths,
} from '@/features/dashboard/hooks/use-ctem-dashboard'

function useStats() {
  const { currentTenant } = useTenant()
  return useDashboardStats(currentTenant?.id ?? null)
}
function useSummary() {
  const { currentTenant } = useTenant()
  return useExecutiveSummary(currentTenant?.id ?? null)
}
function useThreatIntel() {
  const { currentTenant } = useTenant()
  return useThreatIntelStats(currentTenant?.id ?? null)
}
function useCoverage() {
  const { currentTenant } = useTenant()
  return useScanCoverage(currentTenant?.id ?? null)
}
function useAttack() {
  const { currentTenant } = useTenant()
  return useAttackPaths(currentTenant?.id ?? null)
}

const OPEN_EXCLUDE = [
  'resolved',
  'false_positive',
  'accepted',
  'duplicate',
  'verified',
  'accepted_risk',
]

type WidgetSize = { w: number; h: number }

export interface WidgetDef {
  title: string
  description: string
  component: () => ReactNode
  defaultSize: WidgetSize
  requiredPermission?: string
}

// ── shared shells ───────────────────────────────────────────────────────────

function StatShell({
  title,
  value,
  loading,
  href,
  tone = 'default',
}: {
  title: string
  value: number | string
  loading?: boolean
  href?: string
  tone?: 'default' | 'danger'
}) {
  const body = (
    <Card className={href ? 'h-full transition-colors hover:border-primary/50' : 'h-full'}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <p
            className={
              'mt-1 text-3xl font-semibold ' +
              (tone === 'danger' && typeof value === 'number' && value > 0
                ? 'text-destructive'
                : '')
            }
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

// ── tenant-wide widgets (useDashboardStats) ──────────────────────────────────

function SeverityBreakdownWidget() {
  const { stats, isLoading } = useStats()
  const by = stats.findings.bySeverity ?? {}
  const rows: Array<[string, number]> = [
    ['Critical', by.critical ?? 0],
    ['High', by.high ?? 0],
    ['Medium', by.medium ?? 0],
    ['Low', by.low ?? 0],
  ]
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Findings by severity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="space-y-1.5">
            {rows.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function OpenFindingsWidget() {
  const { stats, isLoading } = useStats()
  return (
    <StatShell
      title="Total findings"
      value={stats.findings.total}
      loading={isLoading}
      href="/findings"
    />
  )
}

function OverdueSlaWidget() {
  const { stats, isLoading } = useStats()
  return (
    <StatShell
      title="Overdue (SLA)"
      value={stats.findings.overdue}
      loading={isLoading}
      tone="danger"
      href="/findings?sla_status=overdue"
    />
  )
}

function AssetsWidget() {
  const { stats, isLoading } = useStats()
  return <StatShell title="Assets" value={stats.assets.total} loading={isLoading} href="/assets" />
}

// ── personal widgets (assigned to me) ────────────────────────────────────────

function AssignedToMeWidget() {
  const { data, isLoading } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    per_page: 1,
  })
  return (
    <StatShell
      title="Assigned to me · open"
      value={data?.total ?? 0}
      loading={isLoading}
      href="/findings?mine=true"
    />
  )
}

function MyCriticalHighWidget() {
  const { data, isLoading } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    severities: ['critical', 'high'],
    per_page: 1,
  })
  return (
    <StatShell
      title="My critical / high"
      value={data?.total ?? 0}
      loading={isLoading}
      tone="danger"
      href="/findings?mine=true&priority=P0"
    />
  )
}

function MyOverdueSlaWidget() {
  const { data, isLoading } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sla_statuses: ['overdue', 'exceeded'],
    per_page: 1,
  })
  return (
    <StatShell
      title="My overdue (SLA)"
      value={data?.total ?? 0}
      loading={isLoading}
      tone="danger"
      href="/findings?mine=true&sla_status=overdue"
    />
  )
}

// ── program widgets (executive summary / threat intel / coverage) ────────────

function RiskScoreWidget() {
  const { data, isLoading } = useSummary()
  return (
    <StatShell
      title="Risk score"
      value={Math.round(data?.risk_score_current ?? 0)}
      loading={isLoading}
    />
  )
}

function SlaComplianceWidget() {
  const { data, isLoading } = useSummary()
  return (
    <StatShell
      title="SLA compliance"
      value={`${Math.round(data?.sla_compliance_pct ?? 0)}%`}
      loading={isLoading}
    />
  )
}

function MttrWidget() {
  const { data, isLoading } = useSummary()
  return (
    <StatShell
      title="MTTR · critical"
      value={`${Math.round(data?.mttr_critical_hours ?? 0)}h`}
      loading={isLoading}
    />
  )
}

function P0OpenWidget() {
  const { data, isLoading } = useSummary()
  return (
    <StatShell
      title="P0 open"
      value={data?.p0_open ?? 0}
      loading={isLoading}
      tone="danger"
      href="/findings?priority=P0"
    />
  )
}

function ScanCoverageWidget() {
  const { data, isLoading } = useCoverage()
  return (
    <StatShell
      title="Scan coverage"
      value={`${Math.round(data?.coverage_percent ?? 0)}%`}
      loading={isLoading}
      href="/scans"
    />
  )
}

function ReachableAssetsWidget() {
  const { data, isLoading } = useAttack()
  return (
    <StatShell
      title="Assets reachable"
      value={data?.summary?.reachable_assets ?? 0}
      loading={isLoading}
      tone="danger"
      href="/attack-paths"
    />
  )
}

function ThreatIntelWidget() {
  const { data, isLoading } = useThreatIntel()
  const kev = data?.kev?.total_entries ?? 0
  const epss = data?.epss?.critical_risk_count ?? 0
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Threat intel</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{kev}</p>
              <p className="text-xs text-muted-foreground">KEV entries</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{epss}</p>
              <p className="text-xs text-muted-foreground">High EPSS</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── the registry ─────────────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  findings_by_severity: {
    title: 'Findings by severity',
    description: 'Open findings broken down by severity',
    component: SeverityBreakdownWidget,
    defaultSize: { w: 4, h: 2 },
    requiredPermission: Permission.DashboardRead,
  },
  open_findings: {
    title: 'Total findings',
    description: 'Total open findings across the tenant',
    component: OpenFindingsWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  overdue_sla: {
    title: 'Overdue (SLA)',
    description: 'Findings past their SLA remediation deadline',
    component: OverdueSlaWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  assets_total: {
    title: 'Assets',
    description: 'Total assets in inventory',
    component: AssetsWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.AssetsRead,
  },
  assigned_to_me: {
    title: 'Assigned to me · open',
    description: 'Open findings assigned to you',
    component: AssignedToMeWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  my_critical_high: {
    title: 'My critical / high',
    description: 'Your critical and high findings',
    component: MyCriticalHighWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  my_overdue_sla: {
    title: 'My overdue (SLA)',
    description: 'Your findings past their SLA',
    component: MyOverdueSlaWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  risk_score: {
    title: 'Risk score',
    description: 'Current program risk score',
    component: RiskScoreWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  sla_compliance: {
    title: 'SLA compliance',
    description: 'Share of findings still within SLA',
    component: SlaComplianceWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  mttr_critical: {
    title: 'MTTR · critical',
    description: 'Mean time to remediate critical findings',
    component: MttrWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  p0_open: {
    title: 'P0 open',
    description: 'Open P0 — highest-priority findings',
    component: P0OpenWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  scan_coverage: {
    title: 'Scan coverage',
    description: 'Share of assets covered by scans',
    component: ScanCoverageWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  reachable_assets: {
    title: 'Assets reachable',
    description: 'Assets reachable from an exposed entry point',
    component: ReachableAssetsWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  threat_intel: {
    title: 'Threat intel',
    description: 'KEV and high-EPSS exposure context',
    component: ThreatIntelWidget,
    defaultSize: { w: 4, h: 2 },
    requiredPermission: Permission.DashboardRead,
  },
}

export type WidgetType = keyof typeof WIDGET_REGISTRY

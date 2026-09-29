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

function useStats() {
  const { currentTenant } = useTenant()
  return useDashboardStats(currentTenant?.id ?? null)
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
  value: number
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
              (tone === 'danger' && value > 0 ? 'text-destructive' : '')
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

// ── the registry ─────────────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  findings_by_severity: {
    title: 'Findings by severity',
    component: SeverityBreakdownWidget,
    defaultSize: { w: 4, h: 2 },
    requiredPermission: Permission.DashboardRead,
  },
  open_findings: {
    title: 'Total findings',
    component: OpenFindingsWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  overdue_sla: {
    title: 'Overdue (SLA)',
    component: OverdueSlaWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.DashboardRead,
  },
  assets_total: {
    title: 'Assets',
    component: AssetsWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.AssetsRead,
  },
  assigned_to_me: {
    title: 'Assigned to me · open',
    component: AssignedToMeWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  my_critical_high: {
    title: 'My critical / high',
    component: MyCriticalHighWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
  my_overdue_sla: {
    title: 'My overdue (SLA)',
    component: MyOverdueSlaWidget,
    defaultSize: { w: 3, h: 1 },
    requiredPermission: Permission.FindingsRead,
  },
}

export type WidgetType = keyof typeof WIDGET_REGISTRY

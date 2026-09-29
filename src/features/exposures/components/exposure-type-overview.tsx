'use client'

/**
 * Building blocks shared by the four exposure-type overview pages
 * (vulnerabilities, code, secrets, misconfigurations). They used to carry four
 * copies of the same charts, each with its own hex severity map and its own
 * "No data" text; one set keeps them looking — and colouring severity — alike.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, SeverityBadge, type Severity } from '@/features/shared'
import { SEVERITY_CHART_COLORS, SEVERITY_ORDER, type SeverityLevel } from '@/lib/severity-colors'

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

/** Categorical series colours from the theme (they carry their own dark values). */
export const CATEGORY_CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const AXIS_TICK = { fontSize: 12, fill: 'var(--muted-foreground)' }

/** Grid of four headline cards, then the chart sections. */
export const OVERVIEW_STATS_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
export const OVERVIEW_CHARTS_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-2'

/** `in_progress` → `In progress`. */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className={OVERVIEW_STATS_GRID}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className={OVERVIEW_CHARTS_GRID}>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** A card section: sentence-case title, one-line description, content. */
export function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** The shared empty state, sized to stand in for a chart inside its card. */
export function ChartEmpty({
  title,
  description,
  icon = BarChart3,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return <EmptyState card={false} icon={icon} title={title} description={description} />
}

function severityRows(bySeverity: Record<string, number>) {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    name: SEVERITY_LABELS[severity],
    value: bySeverity[severity] || 0,
    color: SEVERITY_CHART_COLORS[severity],
  })).filter((d) => d.value > 0)
}

export function SeverityDonut({ bySeverity }: { bySeverity: Record<string, number> }) {
  const data = severityRows(bySeverity)
  if (data.length === 0) return <ChartEmpty title="No severity data yet" />
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((entry) => (
            <Cell key={entry.severity} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function SeverityBars({ bySeverity }: { bySeverity: Record<string, number> }) {
  const data = severityRows(bySeverity)
  if (data.length === 0) return <ChartEmpty title="No severity data yet" />
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" name="Findings" radius={[4, 4, 0, 0]} barSize={40}>
          {data.map((entry) => (
            <Cell key={entry.severity} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StatusBars({ byStatus }: { byStatus: Record<string, number> }) {
  const data = Object.entries(byStatus || {})
    .map(([status, count]) => ({ name: humanize(status), count }))
    .sort((a, b) => b.count - a.count)
  if (data.length === 0) return <ChartEmpty title="No status data yet" />
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
      <BarChart data={data} layout="vertical" barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip />
        <Bar
          dataKey="count"
          name="Findings"
          fill="var(--chart-1)"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface TrendPoint {
  date: string
  critical?: number
  high?: number
  medium?: number
  low?: number
  info?: number
}

export function SeverityTrend({
  data,
  height = 300,
  emptyDescription,
}: {
  data: TrendPoint[]
  height?: number
  emptyDescription?: string
}) {
  if (data.length === 0) {
    return <ChartEmpty title="No trend data yet" description={emptyDescription} />
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend />
        {SEVERITY_ORDER.map((severity) => (
          <Area
            key={severity}
            type="monotone"
            dataKey={severity}
            stackId="1"
            stroke={SEVERITY_CHART_COLORS[severity]}
            fill={SEVERITY_CHART_COLORS[severity]}
            fillOpacity={0.8}
            name={SEVERITY_LABELS[severity]}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * Share of findings per severity as divided rows (severity badge, count, bar) —
 * rows are separated by dividers, not boxed, so there is no card inside the card.
 */
export function SeverityShareList({
  bySeverity,
  total,
  noun,
}: {
  bySeverity: Record<string, number>
  total: number
  /** Singular and plural, e.g. ['secret', 'secrets']. */
  noun: [string, string]
}) {
  const rows = severityRows(bySeverity)
  if (rows.length === 0) return <ChartEmpty title="Nothing to prioritise yet" />
  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const percentage = total > 0 ? (row.value / total) * 100 : 0
        return (
          <li key={row.severity} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <SeverityBadge severity={row.severity as Severity} className="w-20 justify-center" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium tabular-nums">
                  {row.value.toLocaleString()} {row.value === 1 ? noun[0] : noun[1]}
                </span>
                <span className="text-muted-foreground tabular-nums">{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percentage}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Ranked bars for a small count breakdown, as divided rows. */
export function RankedBarList({
  rows,
  unit,
}: {
  rows: { name: string; count: number }[]
  /** Singular and plural, e.g. ['asset', 'assets']. */
  unit: [string, string]
}) {
  if (rows.length === 0) return <ChartEmpty title="No data yet" />
  const max = rows[0]?.count || 1
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{row.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {row.count.toLocaleString()} {row.count === 1 ? unit[0] : unit[1]}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

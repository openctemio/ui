'use client'

import Link from 'next/link'
import { ClipboardCheck, AlertOctagon, Clock, ArrowRight, ChevronRight } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { SeverityBadge } from '@/features/shared/components/severity-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format-date'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { ApiFinding, FindingApiFilters } from '@/features/findings/api/finding-api.types'

const OPEN_EXCLUDE = [
  'resolved',
  'false_positive',
  'accepted',
  'duplicate',
  'verified',
  'accepted_risk',
]

function findingName(f: ApiFinding): string {
  return f.title || f.rule_name || f.message || 'Untitled finding'
}

function prettyStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function MyWorkPage() {
  const queueFilters: FindingApiFilters = {
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sort: 'priority_class,severity,-created_at',
    per_page: 15,
  }
  const { data: queue, isLoading } = useFindingsApi(queueFilters)
  const { data: critical } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    severities: ['critical', 'high'],
    per_page: 1,
  })
  const { data: overdue } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sla_statuses: ['overdue', 'exceeded'],
    per_page: 1,
  })

  const openTotal = queue?.total ?? 0
  const rows = queue?.data ?? []

  return (
    <Main>
      <PageHeader
        title="My Work"
        description="Findings assigned to you or on assets you own — your triage queue."
      />

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Open · assigned to me"
          value={openTotal}
          loading={isLoading}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="brand"
          href="/findings?mine=true"
        />
        <StatTile
          label="Critical / High"
          value={critical?.total ?? 0}
          loading={isLoading}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone="danger"
          href="/findings?mine=true&priority=P0"
        />
        <StatTile
          label="Overdue (SLA)"
          value={overdue?.total ?? 0}
          loading={isLoading}
          icon={<Clock className="h-5 w-5" />}
          tone={(overdue?.total ?? 0) > 0 ? 'danger' : 'muted'}
          href="/findings?mine=true&sla_status=overdue"
        />
      </div>

      {/* Queue */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Your queue</h2>
          <Link
            href="/findings?mine=true"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Nothing is assigned to you right now. When a finding is assigned to you — or lands on
              an asset you own — it&apos;ll appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((f) => {
              const sla = (f.sla_status || '').toLowerCase()
              const slaLate = sla === 'overdue' || sla === 'exceeded'
              const slaWarn = sla === 'warning'
              return (
                <li key={f.id}>
                  <Link
                    href={`/findings/${f.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <SeverityBadge severity={f.severity} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{findingName(f)}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {f.asset?.name && <span className="truncate">{f.asset.name}</span>}
                        {f.asset?.name && <span aria-hidden>·</span>}
                        <span>{formatRelative(f.created_at)}</span>
                        {slaLate && (
                          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                            Overdue
                          </span>
                        )}
                        {slaWarn && (
                          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-500">
                            Due soon
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {prettyStatus(f.status)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </Main>
  )
}

function StatTile({
  label,
  value,
  loading,
  icon,
  href,
  tone,
}: {
  label: string
  value: number
  loading?: boolean
  icon: React.ReactNode
  href: string
  tone: 'brand' | 'danger' | 'muted'
}) {
  const iconTone =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'brand'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'
  const valueTone = tone === 'danger' && value > 0 ? 'text-destructive' : ''
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center justify-between p-5">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-9 w-14" />
            ) : (
              <p className={'mt-1 text-3xl font-semibold tabular-nums ' + valueTone}>{value}</p>
            )}
          </div>
          <span className={'flex h-10 w-10 items-center justify-center rounded-full ' + iconTone}>
            {icon}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

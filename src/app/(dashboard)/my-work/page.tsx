'use client'

import Link from 'next/link'
import { ClipboardCheck, AlertOctagon, Clock, ArrowRight } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared/components/page-header'
import { SeverityBadge } from '@/features/shared/components/severity-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFindingsApi } from '@/features/findings/api/use-findings-api'
import type { FindingApiFilters } from '@/features/findings/api/finding-api.types'

// Findings that still need work — exclude every closed/terminal disposition.
const OPEN_EXCLUDE = ['resolved', 'false_positive', 'accepted', 'duplicate', 'verified', 'accepted_risk']

// "My Work" is the asset-owner/developer landing: a personal view scoped to the
// findings the current user is responsible for (assignee, asset owner, or member
// of an assigned group — the backend `assigned_to_me` predicate), instead of the
// tenant-wide dashboard. Each card deep-links into the findings list with the
// same filter so the numbers and the drill-down always agree.
export default function MyWorkPage() {
  const openFilters: FindingApiFilters = {
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sort: 'priority_class,severity,-created_at',
    per_page: 12,
  }
  const { data: open, isLoading } = useFindingsApi(openFilters)
  const { data: overdue } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    sla_statuses: ['overdue', 'exceeded'],
    per_page: 1,
  })
  const { data: critical } = useFindingsApi({
    assigned_to_me: true,
    exclude_statuses: OPEN_EXCLUDE,
    severities: ['critical', 'high'],
    per_page: 1,
  })

  const openTotal = open?.total ?? 0

  return (
    <Main>
      <PageHeader
        title="My Work"
        description="Findings assigned to you or on assets you own — your triage queue."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open · assigned to me"
          value={openTotal}
          icon={<ClipboardCheck className="size-5" />}
          href="/findings?mine=true"
          loading={isLoading}
        />
        <StatCard
          label="Critical / High"
          value={critical?.total ?? 0}
          icon={<AlertOctagon className="size-5" />}
          href="/findings?mine=true&priority=P0"
          loading={isLoading}
          tone="danger"
        />
        <StatCard
          label="Overdue (SLA)"
          value={overdue?.total ?? 0}
          icon={<Clock className="size-5" />}
          href="/findings?mine=true&sla_status=overdue"
          loading={isLoading}
          tone={(overdue?.total ?? 0) > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your top findings</CardTitle>
          <Link
            href="/findings?mine=true"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : openTotal === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <ClipboardCheck className="mx-auto mb-2 size-6 opacity-50" />
              Nothing assigned to you right now. When a finding is assigned to you — or lands
              on an asset you own — it&apos;ll show up here.
            </div>
          ) : (
            <ul className="divide-y">
              {(open?.data ?? []).map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/findings/${f.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md"
                  >
                    <SeverityBadge severity={f.severity} />
                    <span className="flex-1 truncate text-sm">{f.title || 'Untitled finding'}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}

function StatCard({
  label,
  value,
  icon,
  href,
  loading,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  href: string
  loading?: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/50 cursor-pointer">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-12" />
            ) : (
              <p
                className={
                  'mt-1 text-2xl font-semibold ' + (tone === 'danger' && value > 0 ? 'text-destructive' : '')
                }
              >
                {value}
              </p>
            )}
          </div>
          <span className="text-muted-foreground">{icon}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

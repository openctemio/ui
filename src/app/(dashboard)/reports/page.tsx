'use client'

import Link from 'next/link'
import { Crown, Cpu, ChevronRight } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportSchedulesSection, ExecutiveSummarySection } from '@/features/reports'

const REPORT_VIEWS = [
  {
    href: '/insights/reports/executive',
    icon: Crown,
    title: 'Executive report view',
    description: 'Leadership-oriented risk posture, severity mix and remediation status.',
  },
  {
    href: '/insights/reports/technical',
    icon: Cpu,
    title: 'Technical report view',
    description: 'Detailed vulnerability breakdown, asset distribution and discovery trend.',
  },
] as const

/**
 * Security Reports.
 *
 * Two capabilities backed by endpoints that exist today:
 *  - Scheduled reports (/api/v1/reports/schedules) — recurring finding-summary
 *    digests emailed to recipients on a cron cadence.
 *  - Executive summary export (/api/v1/dashboard/executive-summary/export) —
 *    a program-level CSV for stakeholder decks.
 *
 * There is deliberately no "generated reports" list: the platform has no
 * artifact store, so we do not fabricate one.
 */
export default function ReportsPage() {
  return (
    <Main>
      <PageHeader
        title="Security Reports"
        description="Schedule recurring digests and export the executive summary"
      />

      <div className="mt-6 space-y-6">
        <ExecutiveSummarySection />
        <ReportSchedulesSection />

        <Card>
          <CardHeader>
            <CardTitle>Report views</CardTitle>
            <CardDescription>
              Live, read-only dashboards built from your current findings and asset data.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {REPORT_VIEWS.map((view) => (
              <Link
                key={view.href}
                href={view.href}
                className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-4 transition-colors"
              >
                <view.icon className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{view.title}</span>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{view.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

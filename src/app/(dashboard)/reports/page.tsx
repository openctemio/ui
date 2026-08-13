'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { ReportSchedulesSection, ExecutiveSummarySection } from '@/features/reports'

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
      </div>
    </Main>
  )
}

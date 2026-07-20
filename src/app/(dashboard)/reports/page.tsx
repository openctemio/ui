'use client'

import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { FileText } from 'lucide-react'

/**
 * Security Reports.
 *
 * The report generation / scheduling backend does not exist yet (no
 * `GET /api/v1/reports` or `/reports/stats` endpoint). Rather than render
 * fabricated zero-value stat cards and dead "New Template / Schedule /
 * Generate" buttons that mislead the user into thinking the feature works,
 * this page shows an honest empty state until the API ships.
 *
 * When the backend lands, replace this with the real templates + recent /
 * scheduled reports UI wired to the reports endpoints.
 */
export default function ReportsPage() {
  return (
    <Main>
      <PageHeader
        title="Security Reports"
        description="Generate, schedule, and export security reports"
      />

      <div className="mt-10">
        <EmptyState
          icon={FileText}
          title="Reports are not available yet"
          description="The report generation and scheduling service hasn't shipped yet. In the meantime, use the per-page Export buttons (Findings, Assets, Compliance, and others) to pull CSV data."
        />
      </div>
    </Main>
  )
}

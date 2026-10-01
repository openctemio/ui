'use client'

import type { ReactNode } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportSchedulesSection, ExecutiveSummarySection } from '@/features/reports'
import { PentestReportsSection } from '@/features/pentest/components/pentest-reports-section'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'
import { useHasPermission, Permission } from '@/lib/permissions'
import { useUrlFilter } from '@/hooks/use-url-param'

/**
 * Security Reports.
 *
 * - Program: scheduled finding-summary digests (/api/v1/reports/schedules)
 *   and the executive summary export (/api/v1/dashboard/executive-summary/export).
 *   There is deliberately no "generated reports" list for these: the platform
 *   has no artifact store, so we do not fabricate one.
 * - Pentest: the pentest reports generated per campaign (was
 *   /pentest/reports; 308 to ?tab=pentest). Shown with the pentest module and
 *   pentest:read; a campaign's own reports are the Report tab of its page.
 */
export default function ReportsPage() {
  const pentestEnabled = useModuleEnabled('pentest')
  const canReadPentest = useHasPermission(Permission.PentestRead)
  const showPentest = pentestEnabled && canReadPentest
  const [tabParam, setTab] = useUrlFilter('tab', 'program')
  const tab = tabParam === 'pentest' && showPentest ? 'pentest' : 'program'

  const header = (actions: ReactNode) => (
    <>
      <PageHeader
        title="Reports"
        description={
          tab === 'pentest'
            ? 'Reports generated for pentest campaigns.'
            : 'Schedule recurring digests and export the executive summary.'
        }
      >
        {actions}
      </PageHeader>
      {showPentest && (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v === 'pentest' ? 'pentest' : '')}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="pentest">Pentest</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </>
  )

  return (
    <Main>
      {tab === 'pentest' ? (
        <PentestReportsSection header={header} />
      ) : (
        <>
          {header(null)}
          <div className="mt-5 space-y-5">
            <ExecutiveSummarySection />
            <ReportSchedulesSection />
          </div>
        </>
      )}
    </Main>
  )
}

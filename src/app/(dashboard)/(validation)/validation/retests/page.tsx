'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { PentestRetestsSection } from '@/features/pentest/components/pentest-retests-section'

/**
 * Validation › Retest queue: every finding awaiting re-verification, across
 * campaigns (was /pentest/retests; 308 from there). A campaign's own queue is
 * the Retests tab of its page.
 */
export default function RetestQueuePage() {
  return (
    <Main>
      <PentestRetestsSection
        header={(actions) => (
          <PageHeader
            title="Retest queue"
            description="Findings that were fixed and need re-verification, across campaigns."
          >
            {actions}
          </PageHeader>
        )}
      />
    </Main>
  )
}

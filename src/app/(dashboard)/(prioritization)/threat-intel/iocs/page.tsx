'use client'

import { Main } from '@/components/layout'
import { IOCsPanel } from '@/features/threat-intel/components'

/**
 * Indicators of Compromise (IOC) catalogue.
 *
 * Its own page — gated by the `iocs` module (route-permissions.ts) — so the
 * ModuleIOCs toggle controls a real, reachable surface end-to-end. Reuses the
 * IOCsPanel CRUD (list/create/detail/delete + match log) that backs
 * /api/v1/iocs.
 */
export default function IOCsPage() {
  return (
    <>
      <Main>
        <IOCsPanel />
      </Main>
    </>
  )
}

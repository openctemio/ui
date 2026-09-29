'use client'

import { Main } from '@/components/layout'
import { DetectionsPanel } from '@/features/threat-intel/components'

/**
 * Detections (Detect & Respond) — the tenant-wide IOC match feed. Shows runtime
 * detections forwarded from EDR/XDR/SIEM that matched a known indicator, and
 * whether each auto-reopened its source finding. Gated by the `iocs` module
 * (same as the IOC catalogue) so the toggle controls it end-to-end. Backed by
 * GET /api/v1/iocs/matches.
 */
export default function DetectionsPage() {
  return (
    <Main>
      <DetectionsPanel />
    </Main>
  )
}

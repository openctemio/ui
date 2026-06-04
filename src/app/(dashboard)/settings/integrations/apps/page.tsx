'use client'

import { Boxes } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

// "Connected Apps" (sync security tools like GitHub Security, Snyk, Qualys,
// AWS Security Hub into the platform) is not wired to a backend yet. It
// previously rendered a hardcoded list of fake "connected" apps with fabricated
// sync timestamps and data-point counts, which misrepresented real state.
// Until the connector backend exists, show an honest Coming Soon page — the
// same pattern used by the SIEM and CI/CD integration pages.
export default function ConnectedAppsPage() {
  return (
    <ComingSoonPage
      title="Connected Apps"
      description="Connect third-party security tools so their findings, assets, and scan data flow into the platform automatically."
      icon={Boxes}
      features={[
        'Import findings from Snyk, Qualys, AWS Security Hub, and more',
        'Sync on a schedule with per-source status and last-sync visibility',
        'Deduplicate and correlate imported findings with native scan results',
        'Manage connections, credentials, and sync settings in one place',
      ]}
    />
  )
}

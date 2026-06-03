'use client'

import { AlertTriangle } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="Exposed Credentials"
      description="Detect credentials, keys, and secrets that have leaked into code, configs, or public sources and tie them back to your identities."
      icon={AlertTriangle}
      features={[
        'Correlate secret-scanning findings to owning identities',
        'Prioritize by where the credential is valid and what it unlocks',
        'Track remediation (rotation and revocation) to closure',
        'Continuous monitoring of public exposure sources',
      ]}
    />
  )
}

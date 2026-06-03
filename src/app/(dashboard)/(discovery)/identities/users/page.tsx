'use client'

import { Users } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="User Inventory"
      description="A continuously-updated inventory of human user accounts discovered across your connected identity providers and systems."
      icon={Users}
      features={[
        'Aggregate users from IdPs, SCM, and cloud providers',
        'Flag dormant, privileged, and externally-shared accounts',
        'Correlate users to the assets and findings they can reach',
        'Track MFA coverage and account lifecycle state',
      ]}
    />
  )
}

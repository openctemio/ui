'use client'

import { KeyRound } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="API Key Inventory"
      description="Track API keys and tokens discovered across your platforms so long-lived and over-scoped credentials become visible exposure."
      icon={KeyRound}
      features={[
        'Inventory keys from cloud, SCM, and integration providers',
        'Highlight long-lived, unused, or broadly-scoped keys',
        'Map each key to its owning identity and reachable assets',
        'Surface keys that appear in exposed-credential findings',
      ]}
    />
  )
}

'use client'

import { ShieldCheck } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="Access Analysis"
      description="Analyze who and what can reach which assets, surfacing over-permissioned access paths that widen your exposure."
      icon={ShieldCheck}
      features={[
        'Effective-access analysis across identities and assets',
        'Detect privilege escalation and lateral-movement paths',
        'Least-privilege gap reporting',
        'Access risk feeding the attack-path graph',
      ]}
    />
  )
}

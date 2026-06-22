'use client'

import { Fingerprint } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="Identity Security"
      description="Discover and continuously assess human and machine identities across your environment as part of your attack surface."
      icon={Fingerprint}
      features={[
        'Unified inventory of users, service accounts, API keys, and OAuth apps',
        'Privilege and access analysis to surface over-permissioned identities',
        'Detection of exposed or leaked credentials tied to your assets',
        'Identity risk feeding directly into exposure prioritization',
      ]}
    />
  )
}

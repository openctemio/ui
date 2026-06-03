'use client'

import { Bot } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="Service Accounts"
      description="Inventory and assess non-human (service) accounts, which are frequently over-permissioned and rarely rotated."
      icon={Bot}
      features={[
        'Discover service accounts across cloud and CI/CD systems',
        'Detect excessive privilege and missing rotation',
        'Attribute automated activity to its service identity',
        'Score service-account risk into prioritization',
      ]}
    />
  )
}

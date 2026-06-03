'use client'

import { AppWindow } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function Page() {
  return (
    <ComingSoonPage
      title="OAuth Applications"
      description="See which third-party OAuth applications have been granted access to your environment and what scopes they hold."
      icon={AppWindow}
      features={[
        'Inventory authorized OAuth apps and granted scopes',
        'Flag high-privilege or unused third-party grants',
        'Identify risky or unverified publishers',
        'Track consent changes over time',
      ]}
    />
  )
}

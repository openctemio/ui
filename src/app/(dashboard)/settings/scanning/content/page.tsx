'use client'

import { Main } from '@/components/layout'
import { ContentPolicySettings } from '@/features/sensors/components/content-policy-settings'

export default function ScannerContentSettingsPage() {
  return (
    <Main>
      <ContentPolicySettings />
    </Main>
  )
}

'use client'

import { Main } from '@/components/layout'
import { SensorsSection } from '@/features/sensors'

export default function RunnersPage() {
  return (
    <Main>
      <SensorsSection
        typeFilter="runner"
        title="CI/CD runners"
        description="Sensors that run scans inside your CI/CD pipelines."
      />
    </Main>
  )
}

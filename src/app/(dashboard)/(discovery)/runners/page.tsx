'use client'

import { Main } from '@/components/layout'
import { AgentsSection } from '@/features/agents'

export default function RunnersPage() {
  return (
    <Main>
      <AgentsSection
        typeFilter="runner"
        title="CI/CD runners"
        description="Agents that run scans inside your CI/CD pipelines."
      />
    </Main>
  )
}

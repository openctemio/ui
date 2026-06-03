'use client'

import { BarChart3 } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function RiskAnalysisPage() {
  return (
    <ComingSoonPage
      title="Risk Analysis"
      description="Aggregate, category-level risk scoring across your exposure data — so prioritization reflects real, computed risk rather than raw finding counts."
      icon={BarChart3}
      features={[
        'Overall risk score derived from live findings, EPSS, KEV, and asset criticality',
        'Risk breakdown by category (network, application, data, access, cloud, endpoint)',
        'Risk trend over time with drill-down into the contributing findings',
        'Mean time-to-remediate and SLA tracking per risk category',
      ]}
    />
  )
}

'use client'

import { MetricStrip, type MetricStripItem } from '@/features/shared'
import type { ThreatModelDetail } from '../types'

interface CoverageStatsProps {
  model: ThreatModelDetail
}

/**
 * Coverage headline + open/mitigated/covered/total rollup for a threat model.
 * "Coverage" = share of threats that are mitigated or covered (not open /
 * theoretical), as reported by the backend `coverage_pct`.
 */
export function CoverageStats({ model }: CoverageStatsProps) {
  const coverage = Math.round(model.coverage_pct)
  const items: MetricStripItem[] = [
    {
      key: 'coverage',
      label: 'Coverage',
      value: `${coverage}%`,
      hint: `${model.threats_mitigated + model.threats_covered} of ${model.threats_total} addressed`,
    },
    { key: 'total', label: 'Threats', value: model.threats_total },
    { key: 'open', label: 'Open', value: model.threats_open, tone: 'danger', hint: 'unmitigated' },
    { key: 'mitigated', label: 'Mitigated', value: model.threats_mitigated, hint: 'fixed' },
    {
      key: 'covered',
      label: 'Covered',
      value: model.threats_covered,
      hint: 'compensating control',
    },
  ]
  return <MetricStrip items={items} />
}

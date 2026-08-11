/**
 * MaturityBreakdownCard — renders the overall score and every weighted
 * component transparently (score, weight, contribution, detail).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaturityBreakdownCard, scoreTone } from '../maturity-breakdown'
import type { MaturityBreakdown } from '../../api/use-ctem-maturity'

const breakdown: MaturityBreakdown = {
  score: 72.5,
  cycles_analyzed: 3,
  ctem_stage_coverage: {
    scoping: true,
    discovery: true,
    prioritization: true,
    validation: true,
    mobilization: false,
    covered_count: 4,
  },
  components: [
    {
      name: 'validation_coverage',
      raw_value: 80,
      score: 80,
      weight: 0.3,
      contribution: 24,
      detail: 'share of closed findings with validation evidence (%)',
    },
    {
      name: 'resolution_throughput',
      raw_value: 0.9,
      score: 90,
      weight: 0.25,
      contribution: 22.5,
      detail: 'findings_resolved / findings_opened this cycle',
    },
  ],
}

describe('MaturityBreakdownCard', () => {
  it('renders the rounded overall score', () => {
    render(<MaturityBreakdownCard maturity={breakdown} />)
    expect(screen.getByText('73')).toBeInTheDocument()
  })

  it('renders each component with its label, weight and contribution', () => {
    render(<MaturityBreakdownCard maturity={breakdown} />)
    expect(screen.getByText('Validation coverage')).toBeInTheDocument()
    expect(screen.getByText('Resolution throughput')).toBeInTheDocument()
    // weight rendered as a percentage
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    // contribution rendered with a leading +
    expect(screen.getByText('+24.0')).toBeInTheDocument()
    expect(screen.getByText('+22.5')).toBeInTheDocument()
    // the transparent detail string is shown
    expect(screen.getByText('findings_resolved / findings_opened this cycle')).toBeInTheDocument()
  })

  it('does not throw when components is null (no cycles analyzed)', () => {
    const empty: MaturityBreakdown = { ...breakdown, score: 0, components: null }
    render(<MaturityBreakdownCard maturity={empty} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('scoreTone maps score bands to accents', () => {
    expect(scoreTone(90)).toContain('emerald')
    expect(scoreTone(60)).toContain('amber')
    expect(scoreTone(20)).toBe('text-destructive')
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CharterOutcome } from './charter-outcome'
import type { CharterEvaluation } from '../types'

const evaluation: CharterEvaluation = {
  evaluated_at: '2026-09-30T00:00:00Z',
  met: 1,
  unmet: 1,
  not_measurable: 1,
  completion_rate: 50,
  criteria: [
    {
      name: 'Resolve P0s',
      metric: 'P0 resolved',
      target: '>= 1',
      comparator: '>=',
      threshold: 1,
      actual: 1,
      unit: 'count',
      outcome: 'met',
    },
    {
      name: 'Fast fixes',
      metric: 'MTTR',
      target: '<= 1 day',
      comparator: '<=',
      threshold: 24,
      actual: 72,
      unit: 'hours',
      outcome: 'unmet',
    },
    {
      name: 'KEV',
      metric: 'open KEV findings',
      target: '0',
      outcome: 'not_measurable',
      reason: 'metric "open KEV findings" is not one the platform measures',
    },
  ],
}

describe('CharterOutcome', () => {
  it('shows the completion rate and a verdict per criterion', () => {
    render(<CharterOutcome evaluation={evaluation} />)

    expect(screen.getByText('Success criteria outcome')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getAllByText('Met').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unmet').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Not measurable').length).toBeGreaterThan(0)

    expect(screen.getByText('Measured 3 days, target ≤ 24 h')).toBeInTheDocument()
    expect(
      screen.getByText('Metric "open KEV findings" is not one the platform measures')
    ).toBeInTheDocument()
  })

  it('shows a dash, not 0%, when nothing was measurable', () => {
    render(
      <CharterOutcome
        evaluation={{
          met: 0,
          unmet: 0,
          not_measurable: 1,
          criteria: [
            { name: 'Culture', metric: 'morale', target: 'high', outcome: 'not_measurable' },
          ],
        }}
      />
    )
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})

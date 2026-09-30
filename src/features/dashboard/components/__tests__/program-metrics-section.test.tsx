import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProgramMetrics } from '../../hooks/use-ctem-dashboard'

let hookResult: {
  data?: ProgramMetrics
  error?: unknown
  isLoading: boolean
  mutate: () => void
}

vi.mock('../../hooks/use-ctem-dashboard', () => ({
  useProgramMetrics: () => hookResult,
}))

import { ProgramMetricsSection } from '../program-metrics-section'

// The API's JSON carries null for "not measurable"; the generated type models
// it as an optional number, so cast the literal the server really sends.
const empty = {
  period_days: 90,
  mttd_internet_facing: { mean_hours: null, median_hours: null, sample_size: 0, unmeasured: 0 },
  mttr_validated: { mean_hours: null, median_hours: null, sample_size: 0, unmeasured: 0 },
  owner_acceptance: { rate_pct: null, accepted: 0, missed: 0, pending: 0, excluded: 0 },
} as unknown as ProgramMetrics

// The same numbers the API DB fixtures assert.
const measured = {
  period_days: 90,
  mttd_internet_facing: { mean_hours: 16.5, median_hours: 9, sample_size: 4, unmeasured: 1 },
  mttr_validated: { mean_hours: 36, median_hours: 24, sample_size: 3, unmeasured: 0 },
  owner_acceptance: { rate_pct: 75, accepted: 3, missed: 1, pending: 1, excluded: 4 },
} as unknown as ProgramMetrics

function valueOf(title: string): HTMLElement {
  const card = screen.getByText(title).closest('[data-slot="card"]') as HTMLElement
  return card.querySelector('.text-2xl') as HTMLElement
}

describe('ProgramMetricsSection', () => {
  beforeEach(() => {
    hookResult = { isLoading: false, mutate: vi.fn() }
  })

  it('shows "—" for every metric when there is no data (never 0 or 100%)', () => {
    hookResult.data = empty
    render(<ProgramMetricsSection tenantId="t1" days={90} />)

    for (const title of [
      'Time to detect internet-facing assets',
      'Time to remediate validated exposures',
      'Owner acceptance rate',
      'Time to break attack paths',
    ]) {
      const v = valueOf(title)
      expect(v.textContent).toBe('—')
      expect(v.className).toContain('text-muted-foreground')
      expect(v.className).not.toContain('text-destructive')
    }
    expect(screen.queryByText(/^0%$/)).toBeNull()
    expect(screen.queryByText(/^100%$/)).toBeNull()
    expect(screen.getByText('No new internet-facing assets in this period')).toBeTruthy()
    expect(screen.getByText('No validated exposures resolved in this period')).toBeTruthy()
    expect(screen.getByText('No assignments with an SLA in this period')).toBeTruthy()
  })

  it('renders measured values with their sample captions', () => {
    hookResult.data = measured
    render(<ProgramMetricsSection tenantId="t1" days={90} />)

    expect(valueOf('Time to detect internet-facing assets').textContent).toBe('16.5 h')
    expect(screen.getByText('Median 9 h · 4 assets (+1 without a signal)')).toBeTruthy()
    expect(valueOf('Time to remediate validated exposures').textContent).toBe('36 h')
    expect(screen.getByText('Median 24 h · 3 findings')).toBeTruthy()
    expect(valueOf('Owner acceptance rate').textContent).toBe('75%')
    expect(screen.getByText('3 of 4 assignments in SLA · 1 pending')).toBeTruthy()
    // Time-to-break is never computed, even when everything else is.
    expect(valueOf('Time to break attack paths').textContent).toBe('—')
  })

  it('never colours a zero rate red', () => {
    hookResult.data = {
      ...measured,
      owner_acceptance: { rate_pct: 0, accepted: 0, missed: 2, pending: 0, excluded: 0 },
    } as unknown as ProgramMetrics
    render(<ProgramMetricsSection tenantId="t1" days={90} />)
    const v = valueOf('Owner acceptance rate')
    expect(v.textContent).toBe('0%')
    expect(v.className).not.toContain('text-destructive')
  })

  it('says why owner acceptance is not measured when every assignment is pending', () => {
    hookResult.data = {
      ...empty,
      owner_acceptance: { rate_pct: null, accepted: 0, missed: 0, pending: 2, excluded: 0 },
    } as unknown as ProgramMetrics
    render(<ProgramMetricsSection tenantId="t1" days={90} />)
    expect(valueOf('Owner acceptance rate').textContent).toBe('—')
    expect(screen.getByText('2 assignments still inside the SLA window')).toBeTruthy()
  })

  it('exposes each definition behind a labelled info button', () => {
    hookResult.data = measured
    render(<ProgramMetricsSection tenantId="t1" days={90} />)
    expect(
      screen.getByRole('button', { name: 'How Owner acceptance rate is measured' })
    ).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /is measured$/ })).toHaveLength(4)
  })

  it('shows an error state with retry instead of numbers when the request fails', () => {
    hookResult.error = new Error('boom')
    render(<ProgramMetricsSection tenantId="t1" days={90} />)
    expect(screen.getByText('Failed to load program metrics')).toBeTruthy()
    expect(screen.queryByText('Owner acceptance rate')).toBeNull()
  })
})

/**
 * EPSSScoreBadge renders the 0–1 score as a percentage and the 0–100
 * percentile as an ordinal, both through @/lib/epss.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { EPSSScoreBadge } from '../epss-score-badge'

describe('EPSSScoreBadge', () => {
  it('renders the score as a percentage and a 0–100 percentile as an ordinal', () => {
    render(<EPSSScoreBadge score={0.97565} percentile={99.9} showPercentile />)
    expect(screen.getByText('97.6%', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('(99th)')).toBeInTheDocument()
  })

  it('shows a bottom-1% percentile as-is, not rescaled', () => {
    render(<EPSSScoreBadge score={0.0009} percentile={0.9} showPercentile />)
    expect(screen.getByText('(0th)')).toBeInTheDocument()
  })

  it('renders a placeholder without a score', () => {
    render(<EPSSScoreBadge score={null} />)
    expect(screen.getByText('No EPSS')).toBeInTheDocument()
  })
})

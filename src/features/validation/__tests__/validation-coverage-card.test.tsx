/**
 * ValidationCoverageCard — empty state + renders overall % and per-severity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValidationCoverageCard } from '../components/validation-coverage-card'
import type { ValidationCoverage } from '../api/use-validation-coverage'

let mockData: ValidationCoverage | undefined
let mockLoading = false

vi.mock('../api/use-validation-coverage', async (orig) => {
  const actual = await orig<typeof import('../api/use-validation-coverage')>()
  return { ...actual, useValidationCoverage: () => ({ data: mockData, isLoading: mockLoading }) }
})

describe('ValidationCoverageCard', () => {
  beforeEach(() => {
    mockData = undefined
    mockLoading = false
  })

  it('shows the empty state when there is nothing to validate', () => {
    mockData = { by_severity: [], total: 0, validated: 0, overall_pct: 0 }
    render(<ValidationCoverageCard />)
    expect(screen.getByText(/No findings to validate yet/i)).toBeInTheDocument()
  })

  it('renders overall percentage and per-severity breakdown', () => {
    mockData = {
      total: 4,
      validated: 1,
      overall_pct: 25,
      by_severity: [
        { severity: 'high', total: 2, validated: 1, pct: 50 },
        { severity: 'low', total: 2, validated: 0, pct: 0 },
      ],
    }
    render(<ValidationCoverageCard />)
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText(/1 of 4 findings validated/i)).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
  })
})

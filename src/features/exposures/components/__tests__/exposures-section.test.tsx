import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ExposuresTabs,
  ViewFindingsButton,
  findingsHrefForSources,
  listedFindingCount,
} from '../exposures-section'
import { EMPTY_FINDING_TYPE_STATS, type FindingTypeStats } from '../../hooks/use-finding-type-stats'

let pathname = '/exposures'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

const stats = (over: Partial<FindingTypeStats>): FindingTypeStats => ({
  ...EMPTY_FINDING_TYPE_STATS,
  ...over,
})

describe('ExposuresTabs', () => {
  beforeEach(() => {
    pathname = '/exposures'
  })

  it('renders the five section tabs as one labelled navigation', () => {
    render(<ExposuresTabs />)
    const nav = screen.getByRole('navigation', { name: 'Exposures sections' })
    expect(nav).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Overview',
      'Vulnerabilities',
      'Secrets',
      'Code weaknesses',
      'Misconfigurations',
    ])
  })

  it.each([
    ['/exposures', 'Overview'],
    ['/exposures/secrets', 'Secrets'],
    ['/exposures/code', 'Code weaknesses'],
    ['/exposures/vulnerabilities', 'Vulnerabilities'],
  ])('on %s only %s is current', (path, current) => {
    pathname = path
    render(<ExposuresTabs />)
    for (const link of screen.getAllByRole('link')) {
      if (link.textContent === current) expect(link).toHaveAttribute('aria-current', 'page')
      else expect(link).not.toHaveAttribute('aria-current')
    }
  })
})

describe('findingsHrefForSources', () => {
  it('uses the sources param /findings reads', () => {
    expect(findingsHrefForSources(['secret'])).toBe('/findings?sources=secret')
    expect(findingsHrefForSources(['sca', 'dast'])).toBe('/findings?sources=sca,dast')
  })
})

describe('listedFindingCount', () => {
  it('leaves out the statuses the Findings list hides by default', () => {
    expect(
      listedFindingCount(stats({ total: 10, byStatus: { new: 7, draft: 2, in_review: 1 } }))
    ).toBe(7)
  })

  it('is the total when nothing is hidden', () => {
    expect(listedFindingCount(stats({ total: 4, byStatus: { new: 4 } }))).toBe(4)
  })

  it('is unknown when the stats are not scoped to the type', () => {
    expect(listedFindingCount(stats({ total: 4, scoped: false }))).toBeNull()
  })
})

describe('ViewFindingsButton', () => {
  it('links to the filtered Findings list with the listed count', () => {
    render(
      <ViewFindingsButton
        stats={stats({ total: 12, byStatus: { new: 11, draft: 1 } })}
        sources={['sast']}
      />
    )
    const link = screen.getByRole('link', { name: 'View 11 findings' })
    expect(link).toHaveAttribute('href', '/findings?sources=sast')
  })

  it('uses the singular for one finding', () => {
    render(
      <ViewFindingsButton stats={stats({ total: 1, byStatus: { new: 1 } })} sources={['iac']} />
    )
    expect(screen.getByRole('link', { name: 'View 1 finding' })).toBeInTheDocument()
  })

  it('drops the count when only the unsplit total is known', () => {
    render(<ViewFindingsButton stats={stats({ total: 5, scoped: false })} sources={['secret']} />)
    expect(screen.getByRole('link', { name: 'View findings' })).toBeInTheDocument()
  })

  it('renders nothing while loading or when there are no findings', () => {
    const { container, rerender } = render(
      <ViewFindingsButton stats={stats({ total: 3 })} sources={['secret']} isLoading />
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<ViewFindingsButton stats={stats({ total: 0 })} sources={['secret']} />)
    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * PathGraph component tests.
 *
 * Covers the interactive attack-path visualisation shared by the Exposure
 * Chains and Attack Path Analysis views: node rendering, drill-down links,
 * KEV/criticality encoding, and the empty slot.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PathGraph, type PathGraphPath } from '../path-graph'

const chainPath: PathGraphPath = {
  id: 'chain-1',
  rank: 1,
  score: 92,
  scorePct: 100,
  kevCount: 2,
  criticalCount: 1,
  reachableFrom: 3,
  nodes: [
    { id: 'a1', name: 'edge-gateway', assetType: 'host', role: 'entry', exposure: 'public' },
    { id: 'a2', name: 'app-server', assetType: 'application', role: 'hop', exposure: 'internal' },
    {
      id: 'a3',
      name: 'crown-db',
      assetType: 'host',
      role: 'target',
      criticality: 'critical',
      isCrownJewel: true,
      kev: true,
      findingCount: 5,
      href: '/findings?assetId=a3',
    },
  ],
}

describe('PathGraph', () => {
  it('renders every node in the path', () => {
    render(<PathGraph paths={[chainPath]} />)
    expect(screen.getByText('edge-gateway')).toBeInTheDocument()
    expect(screen.getByText('app-server')).toBeInTheDocument()
    expect(screen.getByText('crown-db')).toBeInTheDocument()
  })

  it('drills a node with an id into that asset findings view', () => {
    render(<PathGraph paths={[chainPath]} />)
    const link = screen.getByRole('link', { name: /crown-db/i })
    expect(link).toHaveAttribute('href', '/findings?assetId=a3')
  })

  it('does not render a link for nodes without an id (synthetic entry)', () => {
    const fanout: PathGraphPath = {
      id: 'p1',
      nodes: [
        { id: '', name: 'Internet-facing entry points', assetType: 'internet', role: 'entry' },
        {
          id: 'x9',
          name: 'db-1',
          assetType: 'host',
          role: 'target',
          criticality: 'high',
          href: '/findings?assetId=x9',
        },
      ],
    }
    render(<PathGraph paths={[fanout]} />)
    // Only the asset node is a link; the internet source is static.
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/findings?assetId=x9')
    expect(screen.getByText('Internet-facing entry points')).toBeInTheDocument()
  })

  it('surfaces KEV and rank on the path header', () => {
    render(<PathGraph paths={[chainPath]} />)
    expect(screen.getByText(/2 KEV/)).toBeInTheDocument()
    expect(screen.getByText(/1 critical/)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // rank badge
  })

  it('marks a crown-jewel target', () => {
    render(<PathGraph paths={[chainPath]} />)
    expect(screen.getByLabelText('Crown jewel')).toBeInTheDocument()
  })

  it('renders the empty slot when there are no paths', () => {
    render(<PathGraph paths={[]} empty={<div>nothing here</div>} />)
    expect(screen.getByText('nothing here')).toBeInTheDocument()
  })

  it('renders nothing when empty and no slot provided', () => {
    const { container } = render(<PathGraph paths={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RiskSummarySection,
  OwnershipSection,
  ExposureSection,
  DiscoverySection,
  PropertiesSection,
} from '../asset-overview-sections'
import type { Asset } from '../../types/asset.types'

const DAY = 86_400_000

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  const now = new Date().toISOString()
  return {
    id: 'a1',
    type: 'repository',
    name: 'github.com/gitleaks/gitleaks',
    criticality: 'high',
    status: 'active',
    scope: 'internal',
    exposure: 'unknown',
    riskScore: 73,
    findingCount: 22,
    findingSeverityCounts: { critical: 0, high: 16, medium: 6, low: 0, info: 0 },
    metadata: {},
    firstSeen: now,
    lastSeen: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Asset
}

describe('RiskSummarySection', () => {
  it('shows the risk score, finding count and severity breakdown', () => {
    render(<RiskSummarySection asset={makeAsset()} />)
    expect(screen.getByText(/^73 - /)).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument() // high
    expect(screen.getByText('6')).toBeInTheDocument() // medium
  })

  it('says so when there are no open findings', () => {
    render(<RiskSummarySection asset={makeAsset({ findingCount: 0, findingSeverityCounts: {} })} />)
    expect(screen.getByText('No open findings on this asset.')).toBeInTheDocument()
  })

  it('links to the Findings tab', async () => {
    const onViewFindings = vi.fn()
    render(<RiskSummarySection asset={makeAsset()} onViewFindings={onViewFindings} />)
    await userEvent.click(screen.getByRole('button', { name: 'View findings' }))
    expect(onViewFindings).toHaveBeenCalled()
  })
})

describe('OwnershipSection', () => {
  it('shows the primary owner', () => {
    render(
      <OwnershipSection
        asset={makeAsset({
          primaryOwner: { id: 'u1', type: 'user', name: 'Jane Doe', email: 'jane@acme.io' },
        })}
      />
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@acme.io')).toBeInTheDocument()
  })

  it('flags an asset with no owner', () => {
    render(<OwnershipSection asset={makeAsset()} onManageOwners={() => {}} />)
    expect(screen.getByText(/No owner assigned/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign owner' })).toBeInTheDocument()
  })
})

describe('ExposureSection', () => {
  it('shows reachability, sensitivity and control-plane status', () => {
    render(
      <ExposureSection
        asset={makeAsset({ isInternetAccessible: false, piiDataExposed: true, phiDataExposed: false })}
        isControlPlane
      />
    )
    expect(screen.getByText('Internet-facing').nextSibling).toHaveTextContent('No')
    expect(screen.getByText('PII')).toBeInTheDocument()
    expect(screen.getByText(/other assets depend on it/)).toBeInTheDocument()
  })

  it('reports no sensitive data when both flags are false', () => {
    render(<ExposureSection asset={makeAsset({ piiDataExposed: false, phiDataExposed: false })} />)
    expect(screen.getByText('None flagged')).toBeInTheDocument()
  })
})

describe('DiscoverySection', () => {
  it('shows the source and tool', () => {
    render(<DiscoverySection asset={makeAsset({ discoverySource: 'agent', discoveryTool: 'gitleaks' })} />)
    expect(screen.getByText('Agent')).toBeInTheDocument()
    expect(screen.getByText('gitleaks')).toBeInTheDocument()
  })

  it('warns when the asset has not been observed for 30+ days', () => {
    const lastSeen = new Date(Date.now() - 78 * DAY).toISOString()
    render(<DiscoverySection asset={makeAsset({ lastSeen })} />)
    expect(screen.getByText(/Not observed for 78 days/)).toBeInTheDocument()
  })

  it('does not warn for a recently seen asset', () => {
    render(<DiscoverySection asset={makeAsset()} />)
    expect(screen.queryByText(/Not observed for/)).not.toBeInTheDocument()
  })
})

describe('PropertiesSection', () => {
  it('renders non-empty properties and skips empty ones', () => {
    render(
      <PropertiesSection
        properties={{ default_branch: 'main', stars: 12, archived: false, topics: ['go', 'sec'], empty: '' }}
      />
    )
    expect(screen.getByText('Default branch')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('go, sec')).toBeInTheDocument()
    expect(screen.queryByText('Empty')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no properties', () => {
    const { container } = render(<PropertiesSection properties={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

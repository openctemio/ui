import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BundleSubscriptionCard } from '../bundle-subscription-card'

const mockSubscribe = vi.fn()
const mockMutate = vi.fn()
let bundlesState: { subscribed: string[]; available: unknown[]; isLoading: boolean }

vi.mock('@/features/organization/api/use-tenant-modules', () => ({
  useModuleBundles: () => ({ ...bundlesState, mutate: mockMutate, isError: false }),
  useSubscribeBundles: () => ({ subscribeBundles: mockSubscribe, isSubscribing: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const AVAILABLE = [
  {
    id: 'asm',
    name: 'Attack Surface Management',
    description: 'External recon',
    target_persona: 'ASM team',
    icon: 'Globe',
    module_count: 20,
    key_outcomes: ['Track external assets'],
  },
  {
    id: 'aspm',
    name: 'Application Security Posture',
    description: 'AppSec',
    target_persona: 'AppSec',
    icon: 'Boxes',
    module_count: 24,
    key_outcomes: ['One AppSec view'],
  },
]

// The product grid is collapsed by default — expand it before interacting.
async function openProducts() {
  await userEvent.click(screen.getByRole('button', { name: /^products/i }))
}

describe('BundleSubscriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bundlesState = { subscribed: [], available: AVAILABLE, isLoading: false }
  })

  it('is collapsed by default and expands to show the available products', async () => {
    render(<BundleSubscriptionCard tenantId="t1" />)
    // Header badge is visible while collapsed…
    expect(screen.getByText('None · full platform')).toBeInTheDocument()
    // …but product cards are hidden until expanded.
    expect(screen.queryByText('Attack Surface Management')).not.toBeInTheDocument()

    await openProducts()
    expect(screen.getByText('Attack Surface Management')).toBeInTheDocument()
    expect(screen.getByText('Application Security Posture')).toBeInTheDocument()
  })

  it('subscribes to the selected product on save', async () => {
    mockSubscribe.mockResolvedValueOnce({})
    render(<BundleSubscriptionCard tenantId="t1" onChanged={vi.fn()} />)

    await openProducts()
    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    await userEvent.click(screen.getByRole('button', { name: /save products/i }))

    expect(mockSubscribe).toHaveBeenCalledWith({ bundle_ids: ['asm'] })
  })

  it('disables save until the selection changes', async () => {
    bundlesState = { subscribed: ['asm'], available: AVAILABLE, isLoading: false }
    render(<BundleSubscriptionCard tenantId="t1" />)

    // Save lives in the always-visible footer. No change yet → disabled.
    expect(screen.getByRole('button', { name: /save products/i })).toBeDisabled()

    // Expand, toggle asm off → now dirty → enabled.
    await openProducts()
    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    expect(screen.getByRole('button', { name: /save products/i })).toBeEnabled()
  })
})

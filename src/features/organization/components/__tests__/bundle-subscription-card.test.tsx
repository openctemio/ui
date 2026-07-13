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
    icon: 'Globe',
    module_count: 20,
  },
  {
    id: 'aspm',
    name: 'Application Security Posture',
    description: 'AppSec',
    icon: 'Boxes',
    module_count: 24,
  },
]

describe('BundleSubscriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bundlesState = { subscribed: [], available: AVAILABLE, isLoading: false }
  })

  it('renders the available bundles and defaults to "All modules"', () => {
    render(<BundleSubscriptionCard tenantId="t1" />)
    expect(screen.getByText('Attack Surface Management')).toBeInTheDocument()
    expect(screen.getByText('Application Security Posture')).toBeInTheDocument()
    expect(screen.getByText('All modules')).toBeInTheDocument()
  })

  it('subscribes to the selected bundle on save', async () => {
    mockSubscribe.mockResolvedValueOnce({})
    render(<BundleSubscriptionCard tenantId="t1" onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    await userEvent.click(screen.getByRole('button', { name: /save bundles/i }))

    expect(mockSubscribe).toHaveBeenCalledWith({ bundle_ids: ['asm'] })
  })

  it('disables save until the selection changes', async () => {
    bundlesState = { subscribed: ['asm'], available: AVAILABLE, isLoading: false }
    render(<BundleSubscriptionCard tenantId="t1" />)

    // No change yet → save disabled.
    expect(screen.getByRole('button', { name: /save bundles/i })).toBeDisabled()

    // Toggle asm off → now dirty → enabled.
    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    expect(screen.getByRole('button', { name: /save bundles/i })).toBeEnabled()
  })
})

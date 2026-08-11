import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTeamForm } from '../create-team-form'

// --- Mocks -----------------------------------------------------------------

const mockTrigger = vi.fn()
vi.mock('../../api', () => ({
  useCreateTenant: () => ({ trigger: mockTrigger, isMutating: false }),
}))

const mockSubscribe = vi.fn()
const PRESETS = [
  {
    id: 'asm',
    name: 'Attack Surface Management',
    description: 'External recon',
    target_persona: 'ASM team',
    icon: 'Globe',
    key_outcomes: ['Track external assets'],
    recommended_for: [],
    module_count: 20,
  },
]
vi.mock('@/features/organization/api/use-tenant-modules', () => ({
  useModulePresetsPublic: () => ({ presets: PRESETS, isLoading: false, isError: false }),
  subscribeBundlesRequest: (...args: unknown[]) => mockSubscribe(...args),
}))

vi.mock('@/features/auth/actions/local-auth-actions', () => ({
  createFirstTeamAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

// jsdom has no real navigation; capture href writes instead.
let originalLocation: Location
beforeEach(() => {
  vi.clearAllMocks()
  originalLocation = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  })
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
})
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
})

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(/team name/i), 'Acme Corp')
  await waitFor(() => expect(screen.getByRole('button', { name: /create team/i })).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: /create team/i }))
}

describe('CreateTeamForm — bundle selection', () => {
  it('shows the optional Products picker with the public catalog', () => {
    render(<CreateTeamForm isFirstTeam={false} showCancel={false} />)
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /attack surface management/i })).toBeInTheDocument()
  })

  it('subscribes to the chosen bundle after the tenant is created', async () => {
    mockTrigger.mockResolvedValueOnce({ id: 'tenant-123', name: 'Acme Corp' })
    render(<CreateTeamForm isFirstTeam={false} showCancel={false} />)

    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    await fillAndSubmit()

    await waitFor(() => expect(mockTrigger).toHaveBeenCalled())
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith('tenant-123', ['asm']))
  })

  it('does NOT subscribe when no bundle is picked (default = full platform)', async () => {
    mockTrigger.mockResolvedValueOnce({ id: 'tenant-123', name: 'Acme Corp' })
    render(<CreateTeamForm isFirstTeam={false} showCancel={false} />)

    await fillAndSubmit()

    await waitFor(() => expect(mockTrigger).toHaveBeenCalled())
    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  it('still completes team creation when bundle subscription fails', async () => {
    mockTrigger.mockResolvedValueOnce({ id: 'tenant-123', name: 'Acme Corp' })
    mockSubscribe.mockRejectedValueOnce(new Error('403'))
    render(<CreateTeamForm isFirstTeam={false} showCancel={false} />)

    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    await fillAndSubmit()

    // Non-blocking: tenant creation proceeds to redirect despite the failure.
    await waitFor(() => expect(window.location.href).toBe('/'))
  })
})

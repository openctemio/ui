import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScimTokensPage from '@/app/(dashboard)/settings/integrations/scim-tokens/page'

// ── mocks ──────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockCreate = vi.fn()
const mockRevoke = vi.fn()
let listData: { tokens: unknown[] } | undefined = { tokens: [] }

vi.mock('@/features/scim-tokens/api/use-scim-tokens', () => ({
  useScimTokens: () => ({ data: listData, isLoading: false, mutate: mockMutate }),
  useCreateScimToken: () => ({ trigger: mockCreate, isMutating: false }),
  useRevokeScimToken: () => ({ trigger: mockRevoke, isMutating: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn(async () => true),
}))

describe('ScimTokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listData = { tokens: [] }
  })

  it('shows the empty state when there are no tokens', () => {
    render(<ScimTokensPage />)
    expect(screen.getByText('No SCIM tokens yet')).toBeInTheDocument()
  })

  it('renders the SCIM endpoint base URL card', () => {
    render(<ScimTokensPage />)
    expect(screen.getByText('SCIM endpoint')).toBeInTheDocument()
  })

  it('lists existing tokens with status', () => {
    listData = {
      tokens: [
        {
          id: 't1',
          name: 'Okta prod',
          prefix: 'oct_scim_ab',
          status: 'active',
          created_at: '2026-06-01T00:00:00Z',
        },
      ],
    }
    render(<ScimTokensPage />)
    expect(screen.getByText('Okta prod')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('creates a token and reveals the plaintext once', async () => {
    mockCreate.mockResolvedValueOnce({ token: 'oct_scim_SECRETVALUE', prefix: 'oct_scim_SE' })
    const user = userEvent.setup()
    render(<ScimTokensPage />)

    await user.click(screen.getAllByRole('button', { name: /generate token/i })[0])
    await user.type(screen.getByLabelText('Name'), 'Okta prod')
    await user.click(screen.getByRole('button', { name: /^generate$/i }))

    expect(mockCreate).toHaveBeenCalledWith({ name: 'Okta prod' })
    // Reveal dialog shows the one-time secret.
    expect(await screen.findByText('oct_scim_SECRETVALUE')).toBeInTheDocument()
    expect(screen.getByText('Copy your SCIM token')).toBeInTheDocument()
    expect(mockMutate).toHaveBeenCalled()
  })

  it('does not create a token when the name is empty', async () => {
    const user = userEvent.setup()
    render(<ScimTokensPage />)

    await user.click(screen.getAllByRole('button', { name: /generate token/i })[0])
    // Submitting with an empty (required) name must not call the create hook.
    await user.click(screen.getByRole('button', { name: /^generate$/i }))

    expect(mockCreate).not.toHaveBeenCalled()
  })
})

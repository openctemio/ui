import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScimTokensPage from '@/app/(dashboard)/settings/scim/page'

// ── mocks ──────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockCreate = vi.fn()
const mockRevoke = vi.fn()
let listData: { tokens: unknown[] } | undefined = { tokens: [] }
let tenantAdmin = true
let tenantOwner = true
let listEnabled: boolean | undefined

vi.mock('@/features/scim-tokens/api/use-scim-tokens', () => ({
  useScimTokens: (opts?: { enabled?: boolean }) => {
    listEnabled = opts?.enabled
    return { data: listData, isLoading: false, mutate: mockMutate }
  },
  useCreateScimToken: () => ({ trigger: mockCreate, isMutating: false }),
  useRevokeScimToken: () => ({ trigger: mockRevoke, isMutating: false }),
}))

vi.mock('@/lib/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/permissions')>()),
  usePermissions: () => ({
    isAdmin: () => tenantAdmin,
    isOwner: () => tenantOwner,
    isLoading: false,
  }),
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
    tenantAdmin = true
    tenantOwner = true
    listEnabled = undefined
  })

  it('a member or viewer gets no Generate token and no token request', () => {
    // The API refuses /scim-tokens to anyone but an owner or admin; the page
    // used to show them an enabled button next to "Failed to load".
    tenantAdmin = false
    render(<ScimTokensPage />)
    expect(screen.queryByRole('button', { name: /generate token/i })).toBeNull()
    expect(screen.getByText("Managed by your team's owners and admins")).toBeInTheDocument()
    expect(screen.queryByText('SCIM endpoint')).toBeNull()
    expect(listEnabled).toBe(false)
  })

  it('an administrator who is not the owner sees tokens but cannot generate or revoke', () => {
    // Minting and revoking a SCIM token is owner-only (the API answers 403).
    tenantOwner = false
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
    expect(listEnabled).toBe(true)
    expect(screen.getByText('Okta prod')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate token/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /revoke okta prod/i })).toBeDisabled()
    expect(
      screen.getAllByLabelText(/only the organization owner can generate or revoke scim tokens/i)
        .length
    ).toBeGreaterThan(0)
  })

  it('is available to tenant admins who are not application administrators', () => {
    render(<ScimTokensPage />)
    expect(screen.queryByText('Application administrator only')).not.toBeInTheDocument()
    expect(screen.getByText('SCIM endpoint')).toBeInTheDocument()
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

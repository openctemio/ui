import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MCPConnectPage from '../page'

const mockCreate = vi.fn()

vi.mock('@/features/api-keys/api/use-api-keys', () => ({
  useCreateApiKey: () => ({ trigger: mockCreate, isMutating: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn(async () => true) }))

// Render permission gates open so the generate button is present.
vi.mock('@/lib/permissions', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  Permission: { ApiKeysWrite: 'integrations:api_keys:write' },
}))

describe('MCPConnectPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the read-only scopes and a placeholder config', () => {
    render(<MCPConnectPage />)
    expect(screen.getByText('AI Access (MCP)')).toBeInTheDocument()
    expect(screen.getByText('findings:read')).toBeInTheDocument()
    expect(screen.getByText('assets:read')).toBeInTheDocument()
    // Config block shows a placeholder until a key is minted.
    expect(screen.getByText(/oct_YOUR_KEY_HERE/)).toBeInTheDocument()
  })

  it('generates a key with exactly the MCP read scopes and reveals it once', async () => {
    mockCreate.mockResolvedValueOnce({ key: 'oct_secret_generated', key_prefix: 'oct_secr' })
    render(<MCPConnectPage />)

    await userEvent.click(screen.getByRole('button', { name: /generate connection key/i }))
    await userEvent.click(screen.getByRole('button', { name: /^generate$/i }))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['findings:read', 'assets:read', 'compliance:frameworks:read'],
      })
    )
    // The minted key is revealed in the config.
    expect(await screen.findByDisplayValue('oct_secret_generated')).toBeInTheDocument()
  })
})

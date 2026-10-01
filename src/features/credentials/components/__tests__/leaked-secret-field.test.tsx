import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeakedSecretField } from '../leaked-secret-field'
import { mapCredentialToAsset } from '../../lib/mapper'

const mockReveal = vi.fn()
let canReveal = true

vi.mock('../../api/use-credentials-api', () => ({
  useRevealCredentialApi: () => ({ trigger: mockReveal, isMutating: false }),
}))
vi.mock('@/lib/permissions', () => ({
  Permission: { CredentialsReveal: 'findings:credentials:reveal' },
  useHasPermission: (p: string) => p === 'findings:credentials:reveal' && canReveal,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn(async () => true) }))

const SECRET = 'Sup3r-Secret-Leaked-Passw0rd!'

describe('LeakedSecretField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canReveal = true
  })

  it('shows only the mask and fingerprint, and no Reveal button without the permission', () => {
    canReveal = false
    render(
      <LeakedSecretField credentialId="c1" hasSecret masked="********" fingerprint="079f2870" />
    )
    expect(screen.getByTestId('leaked-secret-value')).toHaveValue('********')
    expect(screen.getByText('079f2870')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/requires the Reveal Credential Secrets permission/i)
    ).toBeInTheDocument()
    expect(mockReveal).not.toHaveBeenCalled()
  })

  it('fetches the plaintext only on Reveal, and drops it on Hide', async () => {
    mockReveal.mockResolvedValueOnce({ id: 'c1', secret_value: SECRET })
    render(<LeakedSecretField credentialId="c1" hasSecret masked="********" />)
    expect(mockReveal).not.toHaveBeenCalled()
    expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
    expect(mockReveal).toHaveBeenCalledTimes(1)
    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(screen.getByTestId('leaked-secret-value')).toHaveValue('********')
  })

  it('never shows one credential’s plaintext on another', async () => {
    mockReveal.mockResolvedValueOnce({ id: 'c1', secret_value: SECRET })
    const { rerender } = render(<LeakedSecretField credentialId="c1" hasSecret masked="********" />)
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument()

    rerender(<LeakedSecretField credentialId="c2" hasSecret masked="AKIA********" />)
    expect(screen.getByTestId('leaked-secret-value')).toHaveValue('AKIA********')
  })

  it('says so when no secret is stored', () => {
    render(<LeakedSecretField credentialId="c1" hasSecret={false} />)
    expect(screen.getByText(/no secret value stored/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument()
  })
})

describe('mapCredentialToAsset', () => {
  it('carries the mask and fingerprint, never a plaintext', () => {
    const asset = mapCredentialToAsset({
      id: 'c1',
      identifier: 'alice@corp.test',
      credential_type: 'password',
      has_secret: true,
      secret_masked: '********',
      secret_fingerprint: '079f2870',
      source: 'data_breach',
      severity: 'high',
      state: 'active',
    })
    expect(asset.metadata.hasSecret).toBe(true)
    expect(asset.metadata.secretMasked).toBe('********')
    expect(asset.metadata.secretFingerprint).toBe('079f2870')
    expect(JSON.stringify(asset)).not.toContain('secret_value')
  })
})

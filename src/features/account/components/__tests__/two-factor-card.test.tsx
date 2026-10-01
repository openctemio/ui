import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TwoFactorCard } from '../two-factor-card'
import type { TwoFactorStatus } from '../../types/account.types'

const status = vi.fn<() => { status?: TwoFactorStatus; isLoading: boolean; mutate: () => void }>()
const setupTwoFactor = vi.fn()
const enableTwoFactor = vi.fn()
const disableTwoFactor = vi.fn()
const regenerateRecoveryCodes = vi.fn()

vi.mock('../../api/use-security', () => ({
  useTwoFactorStatus: () => status(),
  useSetupTwoFactor: () => ({ setupTwoFactor, isSettingUp: false }),
  useEnableTwoFactor: () => ({ enableTwoFactor, isEnabling: false }),
  useDisableTwoFactor: () => ({ disableTwoFactor, isDisabling: false }),
  useRegenerateRecoveryCodes: () => ({ regenerateRecoveryCodes, isRegenerating: false }),
}))

const base: TwoFactorStatus = {
  supported: true,
  enabled: false,
  recovery_codes_remaining: 0,
  required_by_organization: false,
}
const mutate = vi.fn()

describe('TwoFactorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains that the identity provider owns 2FA for federated accounts', () => {
    status.mockReturnValue({ status: { ...base, supported: false }, isLoading: false, mutate })
    render(<TwoFactorCard />)
    expect(screen.getByText(/identity provider/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set up/i })).not.toBeInTheDocument()
  })

  it('shows the organization requirement while off', () => {
    status.mockReturnValue({
      status: { ...base, required_by_organization: true },
      isLoading: false,
      mutate,
    })
    render(<TwoFactorCard />)
    expect(screen.getByText('Off')).toBeInTheDocument()
    expect(screen.getByText('Required by your organization')).toBeInTheDocument()
  })

  it('enrolls: QR + code, then shows recovery codes once and signs other sessions out', async () => {
    status.mockReturnValue({ status: base, isLoading: false, mutate })
    setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauth_uri: 'otpauth://totp/OpenCTEM:a?secret=JBSWY3DPEHPK3PXP&issuer=OpenCTEM',
    })
    enableTwoFactor.mockResolvedValue(['aaaaa-bbbbb', 'ccccc-ddddd'])
    const signedOut = vi.fn()
    const user = userEvent.setup()
    render(<TwoFactorCard email="a@acme.io" onOtherSessionsSignedOut={signedOut} />)

    await user.click(screen.getByRole('button', { name: 'Set up' }))
    expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Authentication code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Turn on' }))

    expect(enableTwoFactor).toHaveBeenCalledWith('123456')
    expect(await screen.findByText('aaaaa-bbbbb')).toBeInTheDocument()
    expect(signedOut).toHaveBeenCalled()
    const done = screen.getByRole('button', { name: 'Done' })
    expect(done).toBeDisabled()
    await user.click(screen.getByLabelText('I have saved my recovery codes'))
    expect(done).toBeEnabled()
  })

  it('keeps the dialog open with an inline error on a wrong code', async () => {
    status.mockReturnValue({ status: base, isLoading: false, mutate })
    setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauth_uri: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP',
    })
    enableTwoFactor.mockRejectedValue(new Error('Invalid verification code'))
    const user = userEvent.setup()
    render(<TwoFactorCard />)
    await user.click(screen.getByRole('button', { name: 'Set up' }))
    await screen.findByRole('img', { name: /qr code/i })
    await user.type(screen.getByLabelText('Authentication code'), '000000')
    await user.click(screen.getByRole('button', { name: 'Turn on' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid verification code')
  })

  it('turning off needs the password and a code', async () => {
    status.mockReturnValue({
      status: {
        ...base,
        enabled: true,
        enabled_at: '2026-09-01T00:00:00Z',
        recovery_codes_remaining: 2,
      },
      isLoading: false,
      mutate,
    })
    disableTwoFactor.mockResolvedValue({ message: 'ok' })
    const user = userEvent.setup()
    render(<TwoFactorCard />)
    expect(screen.getByText(/2 recovery codes left/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Turn off' }))
    const submit = screen.getAllByRole('button', { name: 'Turn off' }).at(-1)!
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Current password'), 'Secret-123')
    await user.type(screen.getByLabelText(/authentication code or recovery code/i), '123456')
    await user.click(submit)
    expect(disableTwoFactor).toHaveBeenCalledWith({ password: 'Secret-123', code: '123456' })
  })

  it('regenerates recovery codes with a TOTP code', async () => {
    status.mockReturnValue({
      status: { ...base, enabled: true, recovery_codes_remaining: 10 },
      isLoading: false,
      mutate,
    })
    regenerateRecoveryCodes.mockResolvedValue(['zzzzz-yyyyy'])
    const user = userEvent.setup()
    render(<TwoFactorCard />)
    await user.click(screen.getByRole('button', { name: /new recovery codes/i }))
    await user.type(screen.getByLabelText('Authentication code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Generate' }))
    expect(regenerateRecoveryCodes).toHaveBeenCalledWith('123456')
    expect(await screen.findByText('zzzzz-yyyyy')).toBeInTheDocument()
  })
})

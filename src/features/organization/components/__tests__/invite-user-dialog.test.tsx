import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiClientError } from '@/lib/api/error-handler'
import { useRoles } from '@/features/access-control/api/use-roles'
import { createTenantInvitation } from '../../api/use-members'
import { InviteUserDialog, buildInvitationLink } from '../invite-user-dialog'

vi.mock('@/features/access-control/api/use-roles', () => ({ useRoles: vi.fn() }))
vi.mock('../../api/use-members', () => ({ createTenantInvitation: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const role = (id: string, name: string, slug = id) => ({
  id,
  name,
  slug,
  description: '',
  is_system: true,
  permission_count: 3,
  hierarchy_level: 0,
  has_full_data_access: false,
  permissions: [],
  created_at: '',
  updated_at: '',
})

const mockCreate = vi.mocked(createTenantInvitation)

// Radix Checkbox measures itself inside a <form>; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function fillAndSend() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email address'), 'ann@co.com')
  await user.click(screen.getByRole('checkbox', { name: 'Viewer' }))
  await user.click(screen.getByRole('button', { name: /send invitation/i }))
}

describe('InviteUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoles).mockReturnValue({
      roles: [role('r-viewer', 'Viewer', 'viewer')],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoles>)
  })

  it('shows the invitation link from the create response, once', async () => {
    // The API keeps only a hash of the token: this response is the one place
    // the usable token appears. The invitation list returns the hash, which
    // makes a dead link, so the dialog is where the link has to come from.
    mockCreate.mockResolvedValue({
      id: 'inv1',
      email: 'ann@co.com',
      role: 'member',
      role_ids: ['r-viewer'],
      token: 'raw-token-abc',
      invited_by: 'u1',
      expires_at: '2026-10-08T00:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      pending: true,
    })
    const onInvited = vi.fn()
    render(<InviteUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} onInvited={onInvited} />)
    await fillAndSend()

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith('acme', {
        email: 'ann@co.com',
        role_ids: ['r-viewer'],
      })
    )
    expect(await screen.findByText('Invitation created')).toBeInTheDocument()
    expect(screen.getByTestId('invitation-link')).toHaveTextContent(
      `${window.location.origin}/invitations/raw-token-abc`
    )
    expect(onInvited).toHaveBeenCalled()
  })

  it('says the invitation was emailed when the response has no token', async () => {
    mockCreate.mockResolvedValue({
      id: 'inv1',
      email: 'ann@co.com',
      role: 'member',
      role_ids: ['r-viewer'],
      invited_by: 'u1',
      expires_at: '2026-10-08T00:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      pending: true,
    })
    render(<InviteUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await fillAndSend()
    expect(await screen.findByText('Invitation emailed')).toBeInTheDocument()
    expect(screen.queryByTestId('invitation-link')).toBeNull()
  })

  it('shows the server error and keeps the form', async () => {
    mockCreate.mockRejectedValue(
      new ApiClientError('A member with this email already exists', 'CONFLICT', 409)
    )
    render(<InviteUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await fillAndSend()
    expect(await screen.findByText('A member with this email already exists')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveValue('ann@co.com')
  })

  it('requires a role', async () => {
    const user = userEvent.setup()
    render(<InviteUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await user.type(screen.getByLabelText('Email address'), 'ann@co.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))
    expect(await screen.findByText('Select at least one role.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('buildInvitationLink', () => {
  it('points at the invitation page', () => {
    expect(buildInvitationLink('GWEu-eZWS_bit', 'https://x.test')).toBe(
      'https://x.test/invitations/GWEu-eZWS_bit'
    )
  })
})

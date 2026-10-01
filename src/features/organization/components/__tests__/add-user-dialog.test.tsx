import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiClientError } from '@/lib/api/error-handler'
import { useRoles } from '@/features/access-control/api/use-roles'
import { createTenantUser } from '../../api/use-members'
import { AddUserDialog } from '../add-user-dialog'
import { RoleChecklist } from '../role-checklist'

vi.mock('@/features/access-control/api/use-roles', () => ({ useRoles: vi.fn() }))
vi.mock('../../api/use-members', () => ({ createTenantUser: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const role = (id: string, name: string, is_system = true, slug = id) => ({
  id,
  name,
  slug,
  description: '',
  is_system,
  permission_count: 3,
  hierarchy_level: 0,
  has_full_data_access: false,
  permissions: [],
  created_at: '',
  updated_at: '',
})

const ROLES = [
  role('r-owner', 'Owner', true, 'owner'),
  role('r1', 'Analyst'),
  role('r2', 'Auditor', false),
]

const mockCreate = vi.mocked(createTenantUser)

// Radix Checkbox measures itself inside a <form>; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function fillForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Name'), 'Bob Builder')
  await user.type(screen.getByLabelText('Email'), 'bob@co.com')
  await user.click(screen.getByRole('checkbox', { name: 'Analyst' }))
  await user.click(screen.getByRole('button', { name: /^add user$/i }))
}

describe('AddUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoles).mockReturnValue({
      roles: ROLES,
      isLoading: false,
    } as unknown as ReturnType<typeof useRoles>)
  })

  it('creates the user and shows the one-time setup link once', async () => {
    mockCreate.mockResolvedValue({
      user: { id: 'u1', email: 'bob@co.com', name: 'Bob Builder' },
      membership_id: 'm1',
      role: 'member',
      email_sent: false,
      setup_token: 'tok-xyz',
      setup_expires_at: '2026-10-08T10:00:00Z',
    })
    const onCreated = vi.fn()
    render(<AddUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} onCreated={onCreated} />)

    // Owner is not grantable here.
    expect(screen.queryByRole('checkbox', { name: 'Owner' })).toBeNull()
    await fillForm()

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith('acme', {
        email: 'bob@co.com',
        name: 'Bob Builder',
        role_ids: ['r1'],
      })
    )
    expect(await screen.findByTestId('setup-link')).toHaveTextContent('/set-password?token=tok-xyz')
    expect(onCreated).toHaveBeenCalled()
  })

  it('says the email was sent when no token comes back', async () => {
    mockCreate.mockResolvedValue({
      user: { id: 'u1', email: 'bob@co.com', name: 'Bob Builder' },
      membership_id: 'm1',
      role: 'member',
      email_sent: true,
    })
    render(<AddUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await fillForm()
    expect(await screen.findByText('Setup email sent')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-link')).toBeNull()
  })

  it('shows the server message inline on 409', async () => {
    mockCreate.mockRejectedValue(
      new ApiClientError(
        'an account with this email already exists — invite them instead',
        'CONFLICT',
        409
      )
    )
    render(<AddUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await fillForm()
    expect(
      await screen.findByText('an account with this email already exists — invite them instead')
    ).toBeInTheDocument()
  })

  it('requires at least one role', async () => {
    const user = userEvent.setup()
    render(<AddUserDialog tenantSlug="acme" open onOpenChange={vi.fn()} />)
    await user.type(screen.getByLabelText('Name'), 'Bob')
    await user.type(screen.getByLabelText('Email'), 'bob@co.com')
    await user.click(screen.getByRole('button', { name: /^add user$/i }))
    expect(await screen.findByText('Select at least one role.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('RoleChecklist', () => {
  it('stops further selection at the maximum', () => {
    render(<RoleChecklist roles={ROLES} selected={['r1']} onChange={vi.fn()} max={1} />)
    expect(screen.getByRole('checkbox', { name: 'Analyst' })).not.toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Auditor' })).toBeDisabled()
  })

  it('toggles a role', async () => {
    const onChange = vi.fn()
    render(<RoleChecklist roles={ROLES} selected={['r1']} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Auditor' }))
    expect(onChange).toHaveBeenCalledWith(['r1', 'r2'])
  })
})

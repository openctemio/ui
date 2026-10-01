import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createOrganization,
  createOrganizationUser,
  useOrganizationUsers,
} from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import { AddOrganizationUserDialog } from '../components/add-organization-user-dialog'
import { CreateOrganizationDialog } from '../components/create-organization-dialog'
import { OrganizationUsersSection } from '../components/organization-users-section'

vi.mock('../api/use-admin-organizations', () => ({
  createOrganization: vi.fn(),
  createOrganizationUser: vi.fn(),
  useOrganizationUsers: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const ORG = {
  id: 't1',
  name: 'Acme',
  slug: 'acme',
  created_at: '2026-10-01T00:00:00Z',
  active_members: 1,
  owner_emails: ['owner@acme.test'],
  saml_enabled: false,
  active_identity_providers: 0,
  verified_domains: 0,
  sso_enforced: false,
}

async function fillOrg(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /new organization/i }))
  await user.type(screen.getByLabelText('Name'), 'Acme')
  await user.type(screen.getByLabelText('Owner email'), 'owner@acme.test')
  await user.type(screen.getByLabelText(/owner name/i), 'Olivia Owner')
  await user.click(screen.getByRole('button', { name: /create organization/i }))
}

describe('CreateOrganizationDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends owner_name and shows the new owner one-time link before moving on', async () => {
    vi.mocked(createOrganization).mockResolvedValue({
      ...ORG,
      owner_setup: {
        email_sent: false,
        setup_token: 'owner-tok',
        setup_expires_at: '2026-10-08T00:00:00Z',
      },
    })
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateOrganizationDialog onCreated={onCreated} />)
    await fillOrg(user)

    await waitFor(() =>
      expect(createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ owner_email: 'owner@acme.test', owner_name: 'Olivia Owner' })
      )
    )
    expect(await screen.findByTestId('setup-link')).toHaveTextContent(
      '/set-password?token=owner-tok'
    )
    expect(onCreated).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }))
  })

  it('goes straight to the organization when the owner already had an account', async () => {
    vi.mocked(createOrganization).mockResolvedValue(ORG)
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateOrganizationDialog onCreated={onCreated} />)
    await fillOrg(user)
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(screen.queryByTestId('setup-link')).toBeNull()
  })
})

describe('AddOrganizationUserDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates the user with the chosen role and shows the one-time link', async () => {
    vi.mocked(createOrganizationUser).mockResolvedValue({
      user: { id: 'u1', email: 'bob@acme.test', name: 'Bob' },
      membership_id: 'm1',
      role: 'member',
      email_sent: false,
      setup_token: 'bob-tok',
    })
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<AddOrganizationUserDialog tenantId="t1" onCreated={onCreated} />)
    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText('Name'), 'Bob')
    await user.type(screen.getByLabelText('Email'), 'bob@acme.test')
    await user.click(screen.getByRole('button', { name: /^add user$/i }))

    await waitFor(() =>
      expect(createOrganizationUser).toHaveBeenCalledWith('t1', {
        email: 'bob@acme.test',
        name: 'Bob',
        role: 'member',
      })
    )
    expect(await screen.findByTestId('setup-link')).toHaveTextContent('token=bob-tok')
    expect(onCreated).toHaveBeenCalled()
  })

  it('shows the API error inline', async () => {
    vi.mocked(createOrganizationUser).mockRejectedValue(
      new AdminApiError('email domain is not allowed for this organization', 400)
    )
    const user = userEvent.setup()
    render(<AddOrganizationUserDialog tenantId="t1" onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText('Name'), 'Bob')
    await user.type(screen.getByLabelText('Email'), 'bob@other.test')
    await user.click(screen.getByRole('button', { name: /^add user$/i }))
    expect(
      await screen.findByText('email domain is not allowed for this organization')
    ).toBeInTheDocument()
  })
})

describe('OrganizationUsersSection', () => {
  it('lists users with a pending-setup badge, and hides "Add user" without permission', () => {
    vi.mocked(useOrganizationUsers).mockReturnValue({
      data: {
        data: [
          {
            user_id: 'u1',
            email: 'new@acme.test',
            name: 'New Person',
            role: 'member',
            status: 'active',
            pending_setup: true,
            joined_at: '2026-10-01T00:00:00Z',
          },
        ],
        total: 1,
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useOrganizationUsers>)
    render(<OrganizationUsersSection tenantId="t1" canManage={false} />)
    expect(screen.getAllByText('New Person').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending setup').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /add user/i })).toBeNull()
  })
})

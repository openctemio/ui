import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createOrganization,
  createOrganizationUser,
  useOrganizationUsers,
} from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import { CreateFirstOwnerDialog } from '../components/create-first-owner-dialog'
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

  it('stays on the result when the owner email could not be sent (no link returned)', async () => {
    vi.mocked(createOrganization).mockResolvedValue({
      ...ORG,
      owner_setup: { email_sent: false, email_failed: true },
    })
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateOrganizationDialog onCreated={onCreated} />)
    await fillOrg(user)
    expect(await screen.findByText('Setup email not sent')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-link')).toBeNull()
    expect(onCreated).not.toHaveBeenCalled()
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

describe('CreateFirstOwnerDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates the first owner (no role choice) and shows the one-time link', async () => {
    vi.mocked(createOrganizationUser).mockResolvedValue({
      user: { id: 'u1', email: 'olivia@acme.test', name: 'Olivia' },
      membership_id: 'm1',
      role: 'owner',
      email_sent: false,
      setup_token: 'owner-tok',
    })
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateFirstOwnerDialog tenantId="t1" onCreated={onCreated} />)
    await user.click(screen.getByRole('button', { name: /create first owner/i }))
    expect(screen.queryByLabelText('Role')).toBeNull()
    await user.type(screen.getByLabelText('Name'), 'Olivia')
    await user.type(screen.getByLabelText('Email'), 'olivia@acme.test')
    await user.click(screen.getByRole('button', { name: /^create owner$/i }))

    await waitFor(() =>
      expect(createOrganizationUser).toHaveBeenCalledWith('t1', {
        email: 'olivia@acme.test',
        name: 'Olivia',
      })
    )
    expect(await screen.findByTestId('setup-link')).toHaveTextContent('token=owner-tok')
    expect(onCreated).toHaveBeenCalled()
  })

  it('says the email was sent and shows no link when SMTP is configured', async () => {
    vi.mocked(createOrganizationUser).mockResolvedValue({
      user: { id: 'u1', email: 'olivia@acme.test', name: 'Olivia' },
      membership_id: 'm1',
      role: 'owner',
      email_sent: true,
    })
    const user = userEvent.setup()
    render(<CreateFirstOwnerDialog tenantId="t1" onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /create first owner/i }))
    await user.type(screen.getByLabelText('Name'), 'Olivia')
    await user.type(screen.getByLabelText('Email'), 'olivia@acme.test')
    await user.click(screen.getByRole('button', { name: /^create owner$/i }))
    expect(await screen.findByText('Setup email sent')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-link')).toBeNull()
  })

  it('shows the API refusal inline (organization already has an owner)', async () => {
    vi.mocked(createOrganizationUser).mockRejectedValue(
      new AdminApiError(
        'This organization already has an owner. Its owner and administrators invite or create users themselves.',
        409
      )
    )
    const user = userEvent.setup()
    render(<CreateFirstOwnerDialog tenantId="t1" onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /create first owner/i }))
    await user.type(screen.getByLabelText('Name'), 'Bob')
    await user.type(screen.getByLabelText('Email'), 'bob@acme.test')
    await user.click(screen.getByRole('button', { name: /^create owner$/i }))
    expect(await screen.findByText(/already has an owner/i)).toBeInTheDocument()
  })
})

const usersResult = (rows: Record<string, unknown>[]) =>
  ({
    data: { data: rows, total: rows.length },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  }) as unknown as ReturnType<typeof useOrganizationUsers>

const ownerRow = {
  user_id: 'o1',
  email: 'owner@acme.test',
  name: 'Olivia Owner',
  role: 'owner',
  status: 'active',
  pending_setup: false,
  joined_at: '2026-10-01T00:00:00Z',
}

describe('OrganizationUsersSection', () => {
  it('offers "Create first owner" only while the organization has no owner', () => {
    vi.mocked(useOrganizationUsers).mockReturnValue(usersResult([]))
    render(<OrganizationUsersSection tenantId="t1" canManage />)
    expect(screen.getByRole('button', { name: /create first owner/i })).toBeInTheDocument()
  })

  it('explains that the owner adds users once an owner exists', () => {
    vi.mocked(useOrganizationUsers).mockReturnValue(usersResult([ownerRow]))
    render(<OrganizationUsersSection tenantId="t1" canManage />)
    expect(screen.queryByRole('button', { name: /create first owner/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /add user/i })).toBeNull()
    expect(screen.getByText(/owner and administrators invite/i)).toBeInTheDocument()
  })

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
    expect(screen.queryByRole('button', { name: /create first owner/i })).toBeNull()
  })
})

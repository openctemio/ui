import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarProvider } from '@/components/ui/sidebar'

// Radix Popover measures its content; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

type Org = { id: string; name: string; slug: string; role?: string; plan?: string }
const tenantState = {
  currentTenant: {
    id: '7f3c2a1e-0000-4000-8000-000000000001',
    name: 'ORG tenant',
    slug: 'org-tenant',
    role: 'owner',
    plan: 'free',
  } as { id: string; name: string; slug: string; role: string; plan?: string } | null,
  tenants: [] as Org[],
  isLoading: false,
  isSwitching: false,
  switchTeam: vi.fn(async () => {}),
  error: null,
  loadTenants: vi.fn(),
}
vi.mock('@/context/tenant-provider', () => ({ useTenant: () => tenantState }))
vi.mock('@/context/bootstrap-provider', () => ({
  useBootstrapContextSafe: () => ({ isBootstrapped: true }),
}))
let canCreate = false
vi.mock('@/features/auth/hooks/use-can-create-organization', () => ({
  useCanCreateOrganization: () => ({ canCreate }),
}))

// Settings items the user may open (permission-filtered in the real hook).
let visibleSettings: Array<{ id: string; label: string; url: string }> = []
vi.mock('@/hooks/use-settings-nav', () => ({
  useSettingsNav: () => [{ id: 'g', items: visibleSettings }],
}))

const memberStats = vi.fn()
let totalMembers: number | undefined = 12
vi.mock('@/features/organization/api/use-members', () => ({
  useMemberStats: (id: string | undefined) => {
    memberStats(id)
    return {
      stats: id && totalMembers !== undefined ? { total_members: totalMembers } : undefined,
      isLoading: false,
    }
  },
}))

vi.mock('@/hooks/use-display-user', () => ({
  useDisplayUser: () => ({ id: 'u1', name: 'Jane', email: 'jane@example.com' }),
}))

const copy = vi.fn(async (_value: string) => true)
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: (v: string) => copy(v) }))

import { TeamSwitcher } from '../team-switcher'

const ORG_ID = '7f3c2a1e-0000-4000-8000-000000000001'

function renderSwitcher() {
  return render(
    <SidebarProvider>
      <TeamSwitcher />
    </SidebarProvider>
  )
}

const org = (id: string, name: string, role = 'member'): Org => ({ id, name, slug: id, role })

async function openCard() {
  const user = userEvent.setup()
  await user.click(screen.getByTestId('team-switcher-trigger'))
  return { user, card: await screen.findByTestId('org-card') }
}

describe('TeamSwitcher', () => {
  beforeEach(() => {
    canCreate = false
    totalMembers = 12
    tenantState.isSwitching = false
    tenantState.tenants = [{ ...org(ORG_ID, 'ORG tenant', 'owner'), plan: 'free' }]
    tenantState.switchTeam.mockClear()
    tenantState.loadTenants.mockClear()
    memberStats.mockClear()
    copy.mockClear()
    push.mockClear()
    visibleSettings = [
      { id: 'members', label: 'Members', url: '/settings/members' },
      { id: 'api-keys', label: 'API keys', url: '/settings/api-keys' },
    ]
  })

  it('loads the organization list once the app is ready', () => {
    renderSwitcher()
    expect(tenantState.loadTenants).toHaveBeenCalled()
  })

  it('names the organization and its plan on the trigger', () => {
    renderSwitcher()
    const trigger = screen.getByTestId('team-switcher-trigger')
    expect(trigger).toHaveTextContent('ORG tenant')
    expect(trigger).toHaveTextContent('Free')
  })

  it('opens the card with a single organization, without a chevron', async () => {
    renderSwitcher()
    expect(screen.queryByTestId('team-switcher-chevron')).toBeNull()
    const { card } = await openCard()
    expect(within(card).getByText('ORG tenant')).toBeInTheDocument()
    expect(within(card).getByTestId('org-card-plan')).toHaveTextContent('Free')
  })

  it('shows the role, the member count linking to members, and the signed-in email', async () => {
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).getByText('Your role')).toBeInTheDocument()
    expect(within(card).getByText('Owner')).toBeInTheDocument()
    const members = within(card).getByTestId('org-card-members')
    expect(members).toHaveTextContent('12 members')
    expect(members).toHaveAttribute('href', '/settings/members')
    expect(within(card).getByTestId('org-card-email')).toHaveTextContent('jane@example.com')
    expect(card).toHaveTextContent('Signed in as jane@example.com')
  })

  it('says "1 member", not "1 members"', async () => {
    totalMembers = 1
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).getByTestId('org-card-members')).toHaveTextContent(/^1 member$/)
  })

  it('reads the member count only once the card is open', async () => {
    renderSwitcher()
    expect(memberStats).not.toHaveBeenCalledWith(ORG_ID)
    await openCard()
    expect(memberStats).toHaveBeenCalledWith(ORG_ID)
  })

  it('leaves out members and API keys when the user may not open them', async () => {
    visibleSettings = []
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).queryByTestId('org-card-members')).toBeNull()
    expect(within(card).queryByTestId('org-card-api-keys')).toBeNull()
    expect(memberStats).not.toHaveBeenCalledWith(ORG_ID)
  })

  it('links to the API keys page and never shows a key', async () => {
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).getByTestId('org-card-api-keys')).toHaveAttribute(
      'href',
      '/settings/api-keys'
    )
    expect(card.textContent).not.toMatch(/oct_/)
    expect(document.body.textContent).not.toMatch(/oct_[A-Za-z0-9]/)
  })

  it('shows the organization ID and copies it', async () => {
    renderSwitcher()
    const { user, card } = await openCard()
    expect(within(card).getByTestId('org-card-id')).toHaveTextContent(ORG_ID)
    await user.click(within(card).getByRole('button', { name: 'Copy organization ID' }))
    expect(copy).toHaveBeenCalledWith(ORG_ID)
    expect(await within(card).findByRole('status')).toHaveTextContent('Copied')
  })

  it('hides "Create organization" when creation is not allowed', async () => {
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).queryByText('Create organization')).toBeNull()
    expect(within(card).queryByText(/add team/i)).toBeNull()
  })

  it('offers "Create organization" and a chevron when creation is allowed', async () => {
    canCreate = true
    renderSwitcher()
    expect(screen.getByTestId('team-switcher-chevron')).toBeInTheDocument()
    const { user, card } = await openCard()
    await user.click(within(card).getByRole('button', { name: 'Create organization' }))
    expect(push).toHaveBeenCalledWith('/settings/tenant/create')
  })

  it('lists organizations to switch to only with more than one', async () => {
    renderSwitcher()
    const { card } = await openCard()
    expect(within(card).queryByText('Switch organization')).toBeNull()
    expect(within(card).queryAllByTestId('org-card-switch-item')).toHaveLength(0)
  })

  it('switches with the existing switch logic, marking the current one', async () => {
    tenantState.tenants = [
      { ...org(ORG_ID, 'ORG tenant', 'owner'), plan: 'free' },
      org('t2', 'Second org', 'viewer'),
    ]
    renderSwitcher()
    expect(screen.getByTestId('team-switcher-chevron')).toBeInTheDocument()
    const { user, card } = await openCard()
    expect(within(card).getByText('Switch organization')).toBeInTheDocument()
    const items = within(card).getAllByTestId('org-card-switch-item')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveAttribute('aria-current', 'true')
    expect(items[1]).toHaveTextContent('Viewer')

    // Keyboard: arrow down from the first moves to the second.
    items[0].focus()
    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(tenantState.switchTeam).toHaveBeenCalledWith('t2')
  })

  it('does not switch when the current organization is clicked', async () => {
    tenantState.tenants = [org(ORG_ID, 'ORG tenant', 'owner'), org('t2', 'Second org')]
    renderSwitcher()
    const { user, card } = await openCard()
    await user.click(within(card).getAllByTestId('org-card-switch-item')[0])
    expect(tenantState.switchTeam).not.toHaveBeenCalled()
  })
})

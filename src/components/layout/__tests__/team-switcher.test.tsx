import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const tenantState = {
  currentTenant: { id: 't1', name: 'ORG tenant', slug: 'org-tenant', role: 'owner' },
  tenants: [] as Array<{ id: string; name: string; slug: string }>,
  isLoading: false,
  isSwitching: false,
  switchTeam: vi.fn(),
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

import { TeamSwitcher } from '../team-switcher'

function renderSwitcher() {
  return render(
    <SidebarProvider>
      <TeamSwitcher />
    </SidebarProvider>
  )
}

const org = (id: string, name: string) => ({ id, name, slug: id })

describe('TeamSwitcher', () => {
  beforeEach(() => {
    canCreate = false
    tenantState.tenants = []
    tenantState.loadTenants.mockClear()
  })

  it('loads the organization list once the app is ready', () => {
    renderSwitcher()
    expect(tenantState.loadTenants).toHaveBeenCalled()
  })

  it('names the only organization without offering a selector', () => {
    tenantState.tenants = [org('t1', 'ORG tenant')]
    renderSwitcher()
    expect(screen.getByTestId('team-switcher-static')).toHaveTextContent('ORG tenant')
    expect(screen.queryByRole('button', { expanded: false })).toBeNull()
  })

  it('stays a plain label while the list is still loading', () => {
    renderSwitcher()
    expect(screen.getByTestId('team-switcher-static')).toBeInTheDocument()
  })

  it('offers the selector with two or more organizations', () => {
    tenantState.tenants = [org('t1', 'ORG tenant'), org('t2', 'Second org')]
    renderSwitcher()
    expect(screen.queryByTestId('team-switcher-static')).toBeNull()
    expect(screen.getByRole('button', { name: /ORG tenant/ })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    )
  })

  it('offers the selector with one organization when the user may create another', () => {
    canCreate = true
    tenantState.tenants = [org('t1', 'ORG tenant')]
    renderSwitcher()
    expect(screen.queryByTestId('team-switcher-static')).toBeNull()
  })
})

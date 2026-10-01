import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({
  pathname: '/sensors',
  permissions: new Set<string>(),
  moduleIds: ['dashboard'] as string[],
}))

vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))
vi.mock('@/lib/permissions/hooks', () => ({
  usePermissions: () => ({ can: (p: string) => state.permissions.has(p), isLoading: false }),
}))
vi.mock('@/context/bootstrap-provider', () => ({
  useBootstrapModules: () => ({ moduleIds: state.moduleIds, isLoading: false }),
  useBootstrapContextSafe: () => ({ isBootstrapped: true }),
}))

import { RouteGuard } from '../route-guard'

describe('RouteGuard', () => {
  beforeEach(() => {
    state.pathname = '/sensors'
    state.permissions = new Set()
    state.moduleIds = ['dashboard']
  })

  it('says access is denied, not "upgrade your plan", when the user lacks the permission', () => {
    // The API leaves a module out of the list when the user may not use it, so
    // a member without sensors:read has no "sensors" module either.
    render(<RouteGuard>page</RouteGuard>)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Feature Not Available')).toBeNull()
    expect(screen.queryByText('page')).toBeNull()
  })

  it('reports the plan when the user holds the permission but the module is missing', () => {
    state.permissions = new Set(['sensors:read'])
    render(<RouteGuard>page</RouteGuard>)
    expect(screen.getByText('Feature Not Available')).toBeInTheDocument()
  })

  it('renders the page with both the module and the permission', () => {
    state.permissions = new Set(['sensors:read'])
    state.moduleIds = ['sensors']
    render(<RouteGuard>page</RouteGuard>)
    expect(screen.getByText('page')).toBeInTheDocument()
  })

  it('is the main landmark and the skip link target when access is denied', () => {
    // The denied view replaces the layout's <main id="content">, so without its
    // own landmark the page had none and "Skip to Main" went nowhere.
    render(<RouteGuard>page</RouteGuard>)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'content')
    expect(main).toHaveTextContent('Access Denied')
  })
})

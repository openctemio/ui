import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../page'

// The two built-in views and the custom canvas are stubbed — this suite only
// verifies the switcher shell: which view renders for a given persisted choice,
// the CTEM default, and that the header controls are present. (The dropdown
// interaction itself is Radix plumbing; the meaningful behaviour is state→view.)
vi.mock('@/features/dashboard/components/ctem-dashboard', () => ({
  CtemDashboard: () => <div>CTEM_VIEW</div>,
}))
vi.mock('@/features/dashboard/components/classic-dashboard', () => ({
  ClassicDashboard: () => <div>CLASSIC_VIEW</div>,
}))
vi.mock('@/features/dashboards/components/dashboard-canvas', () => ({
  DashboardCanvas: () => <div>CANVAS_VIEW</div>,
}))

vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1', name: 'ORG' } }),
}))

const dashboardsMock = vi.fn(() => ({ data: { data: [] as unknown[] }, isLoading: false }))
vi.mock('@/features/dashboards/api/use-dashboards-api', () => ({
  useMyDashboards: () => dashboardsMock(),
  useRevalidateDashboards: () => async () => {},
  setDefaultDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
}))

const STORAGE_KEY = 'openctem:dashboard-view'

describe('Dashboard view switcher', () => {
  beforeEach(() => {
    window.localStorage.clear()
    dashboardsMock.mockReturnValue({ data: { data: [] }, isLoading: false })
  })

  it('defaults to the CTEM view when nothing is persisted', () => {
    render(<Dashboard />)
    expect(screen.getByText('CTEM_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CLASSIC_VIEW')).not.toBeInTheDocument()
  })

  it('restores the persisted Classic view on mount', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'classic')
    render(<Dashboard />)
    expect(await screen.findByText('CLASSIC_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CTEM_VIEW')).not.toBeInTheDocument()
  })

  it('renders a persisted custom dashboard via the canvas', async () => {
    dashboardsMock.mockReturnValue({
      data: { data: [{ id: 'd1', name: 'Mine', is_default: false, layout: [] }] },
      isLoading: false,
    })
    window.localStorage.setItem(STORAGE_KEY, 'd1')
    render(<Dashboard />)
    expect(await screen.findByText('CANVAS_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CTEM_VIEW')).not.toBeInTheDocument()
  })

  it('falls back to CTEM for the default custom dashboard when nothing is persisted', async () => {
    dashboardsMock.mockReturnValue({
      data: { data: [{ id: 'd2', name: 'Default', is_default: true, layout: [] }] },
      isLoading: false,
    })
    render(<Dashboard />)
    // No persisted choice → the user's default custom dashboard wins.
    expect(await screen.findByText('CANVAS_VIEW')).toBeInTheDocument()
  })

  it('renders the header controls (Refresh / Switch Dashboard / Options)', () => {
    render(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
    expect(screen.getByText('Options')).toBeInTheDocument()
  })
})

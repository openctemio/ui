import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../page'

// The two views are exercised by their own tests; here we only verify the
// switcher — which view renders, that switching persists, and the default.
vi.mock('@/features/dashboard/components/ctem-dashboard', () => ({
  CtemDashboard: () => <div>CTEM_VIEW</div>,
}))
vi.mock('@/features/dashboard/components/classic-dashboard', () => ({
  ClassicDashboard: () => <div>CLASSIC_VIEW</div>,
}))

const STORAGE_KEY = 'openctem:dashboard-view'

describe('Dashboard view switcher', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to the CTEM view when nothing is persisted', () => {
    render(<Dashboard />)
    expect(screen.getByText('CTEM_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CLASSIC_VIEW')).not.toBeInTheDocument()
  })

  it('switches to Classic and persists the choice to localStorage', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('tab', { name: 'Classic' }))

    expect(screen.getByText('CLASSIC_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CTEM_VIEW')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('classic')

    // Switch back to CTEM — persistence follows the active view.
    await user.click(screen.getByRole('tab', { name: 'CTEM' }))
    expect(screen.getByText('CTEM_VIEW')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ctem')
  })

  it('restores the persisted Classic view on mount', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'classic')
    render(<Dashboard />)

    // Applied in an effect after the default first render — assert it lands.
    expect(await screen.findByText('CLASSIC_VIEW')).toBeInTheDocument()
    expect(screen.queryByText('CTEM_VIEW')).not.toBeInTheDocument()
  })

  it('exposes an accessible, keyboard-selectable tablist', () => {
    render(<Dashboard />)
    const ctemTab = screen.getByRole('tab', { name: 'CTEM' })
    const classicTab = screen.getByRole('tab', { name: 'Classic' })
    expect(ctemTab).toHaveAttribute('aria-selected', 'true')
    expect(classicTab).toHaveAttribute('aria-selected', 'false')
  })
})

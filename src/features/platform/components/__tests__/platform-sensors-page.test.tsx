import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

const usage = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('@/lib/api/platform-hooks', () => ({ usePlatformUsage: () => usage.value }))
vi.mock('@/lib/api/sensor-hooks', () => ({ SENSOR_REFRESH_MS: 15000 }))

import { PlatformSensorsLink, PlatformSensorsPage } from '../platform-sensors-page'
import { PlatformStatsCard } from '../platform-stats-card'

const tier = (online: number, total: number, load = 0, cap = 0) => ({
  total_sensors: total,
  online_sensors: online,
  offline_sensors: total - online,
  total_capacity: cap,
  current_load: load,
  available_slots: cap - load,
})

const stats = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  max_tier: 'shared',
  accessible_tiers: ['shared'],
  max_concurrent: 5,
  max_queued: 15,
  current_active: 2,
  current_queued: 1,
  available_slots: 3,
  tier_stats: { shared: tier(1, 1, 2, 5) },
  ...over,
})

const withStats = (over: Record<string, unknown> = {}) => {
  const data = stats(over)
  usage.value = { isEnabled: data.enabled, isLoading: false, error: undefined, data }
}

const callout = () => document.querySelector('[data-slot="detail-callout"]')

describe('PlatformSensorsLink', () => {
  it('shows the header link only when the installation has platform sensors', () => {
    withStats()
    const { unmount } = render(<PlatformSensorsLink />)
    expect(screen.getByRole('link', { name: /Platform sensors/ })).toHaveAttribute(
      'href',
      '/sensors/platform'
    )
    unmount()
    withStats({ enabled: false })
    render(<PlatformSensorsLink />)
    expect(screen.queryByRole('link', { name: /Platform sensors/ })).toBeNull()
    expect(screen.queryByText(/plan|upgrade/i)).toBeNull()
  })
})

describe('PlatformSensorsPage', () => {
  beforeEach(() => withStats())

  it('loading: skeletons, no numbers', () => {
    usage.value = { isEnabled: false, isLoading: true, data: undefined }
    render(<PlatformSensorsPage />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('Your queued jobs')).toBeNull()
  })

  it('error: the shared error state', () => {
    usage.value = { isEnabled: false, isLoading: false, data: undefined, error: new Error('boom') }
    render(<PlatformSensorsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('no platform sensors: an empty state that points to your sensors, no upsell', () => {
    withStats({ enabled: false, tier_stats: {} })
    render(<PlatformSensorsPage />)
    expect(screen.getByText('No platform sensors')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your sensors' })).toHaveAttribute(
      'href',
      '/sensors'
    )
    expect(screen.queryByText(/upgrade|plan/i)).toBeNull()
  })

  it('healthy: no callout; the strip says what the numbers measure', () => {
    render(<PlatformSensorsPage />)
    expect(callout()).toBeNull()
    expect(screen.getByText('Your queued jobs')).toBeInTheDocument()
    expect(screen.getByText('waiting for a free slot')).toBeInTheDocument()
    expect(screen.getAllByText('all organizations').length).toBeGreaterThan(0)
    expect(screen.getAllByText('/ 5').length).toBeGreaterThan(0)
    expect(screen.getByText('ready for new jobs')).toBeInTheDocument()
    // Never shown: the invented queue cap, a tier-as-entitlement, a quota.
    expect(screen.queryByText('/ 15')).toBeNull()
    expect(screen.queryByText(/your tier|above your organization/i)).toBeNull()
    expect(screen.queryByText(/quota|resets/i)).toBeNull()
  })

  it('down (live today: 0 of 1 online): destructive callout, no free slots, queued jobs named', () => {
    withStats({
      current_active: 0,
      current_queued: 2,
      available_slots: 5,
      tier_stats: { shared: tier(0, 1, 0, 5) },
    })
    render(<PlatformSensorsPage />)
    const c = callout()!
    expect(c).toHaveAttribute('data-tone', 'destructive')
    expect(c.textContent).toContain('The platform sensor is offline')
    expect(c.textContent).toContain('You have 2 jobs waiting.')
    expect(c.textContent).toContain('fail after an hour')
    expect(screen.getByText('no sensor online')).toBeInTheDocument()
    expect(screen.getByText('waiting for a sensor to come online')).toBeInTheDocument()
  })

  it('full: warning callout with the pool numbers', () => {
    withStats({ tier_stats: { shared: tier(2, 2, 6, 6) }, current_queued: 0 })
    render(<PlatformSensorsPage />)
    const c = callout()!
    expect(c).toHaveAttribute('data-tone', 'warning')
    expect(c.textContent).toContain('Every platform job slot is in use')
    expect(c.textContent).toContain('6 of 6 slots')
    expect(c.textContent).not.toContain('You have')
    expect(screen.getByText('new jobs wait in the queue')).toBeInTheDocument()
  })

  it('degraded: says how many are offline', () => {
    withStats({ tier_stats: { shared: tier(2, 3, 1, 9) } })
    render(<PlatformSensorsPage />)
    expect(callout()!.textContent).toContain('1 of 3 platform sensors is offline')
    expect(screen.getByText('1 offline')).toHaveClass('text-destructive')
  })

  it('tiers: only tiers that have sensors, each with its own state; no greyed cards', () => {
    withStats({
      tier_stats: { shared: tier(1, 1, 1, 5), premium: tier(0, 2, 0, 4) },
    })
    render(<PlatformSensorsPage />)
    const list = screen.getByRole('list', { name: 'Platform sensors by tier' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(document.querySelector('[data-tier="dedicated"]')).toBeNull()
    const premium = document.querySelector('[data-tier="premium"]')!
    expect(premium.querySelector('[data-state="down"]')).not.toBeNull()
    expect(premium.className).not.toContain('opacity')
    expect(
      screen.getByRole('meter', { name: 'Premium: 0 of 4 job slots in use' })
    ).toBeInTheDocument()
  })

  it('one tier: no tier list (the strip already says it)', () => {
    render(<PlatformSensorsPage />)
    expect(screen.queryByRole('list', { name: 'Platform sensors by tier' })).toBeNull()
  })

  it('routing: explains which scans can land here', () => {
    render(<PlatformSensorsPage />)
    expect(screen.getByText('When your scans run here')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(screen.getByText(/scan public targets only/)).toBeInTheDocument()
  })
})

describe('PlatformStatsCard', () => {
  it('pool summary with a link; nothing without platform sensors', () => {
    withStats({ current_queued: 3 })
    const { unmount } = render(<PlatformStatsCard />)
    expect(screen.getByText('Your queued jobs').nextSibling?.textContent).toBe('3')
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/sensors/platform')
    unmount()
    withStats({ enabled: false, tier_stats: {} })
    const { container } = render(<PlatformStatsCard />)
    expect(container).toBeEmptyDOMElement()
  })
})

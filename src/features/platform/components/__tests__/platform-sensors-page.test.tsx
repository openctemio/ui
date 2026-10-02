import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const usage = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('@/lib/api/platform-hooks', () => ({ usePlatformUsage: () => usage.value }))
vi.mock('@/lib/api/sensor-hooks', () => ({ SENSOR_REFRESH_MS: 15000 }))

import { PlatformSensorsLink, PlatformSensorsPage } from '../platform-sensors-page'

const tier = (online: number, total: number, load = 0, cap = 0) => ({
  total_sensors: total,
  online_sensors: online,
  offline_sensors: total - online,
  total_capacity: cap,
  current_load: load,
  available_slots: cap - load,
})

const enabled = {
  isEnabled: true,
  isLoading: false,
  error: undefined,
  data: { enabled: true },
  maxTier: 'shared',
  accessibleTiers: ['shared'],
  maxConcurrent: 5,
  maxQueued: 15,
  currentActive: 2,
  currentQueued: 1,
  availableSlots: 3,
  tierStats: { shared: tier(1, 1, 2, 5) },
}

describe('PlatformSensorsLink', () => {
  it('shows the header link only when the tenant has platform sensors', () => {
    usage.value = { ...enabled }
    const { unmount } = render(<PlatformSensorsLink />)
    expect(screen.getByRole('link', { name: /Platform sensors/ })).toHaveAttribute(
      'href',
      '/sensors/platform'
    )
    unmount()
    usage.value = { ...enabled, isEnabled: false }
    render(<PlatformSensorsLink />)
    expect(screen.queryByRole('link', { name: /Platform sensors/ })).toBeNull()
    // Never an upsell in its place.
    expect(screen.queryByText(/plan/i)).toBeNull()
  })
})

describe('PlatformSensorsPage', () => {
  beforeEach(() => {
    usage.value = { ...enabled }
  })

  it('loading: skeletons, no numbers', () => {
    usage.value = { ...enabled, isLoading: true, data: undefined }
    render(<PlatformSensorsPage />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('Active jobs')).toBeNull()
  })

  it('error: the shared error state', () => {
    usage.value = { ...enabled, error: new Error('boom') }
    render(<PlatformSensorsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('empty (no platform sensors, the open-source build): says so, no plan talk', () => {
    usage.value = { ...enabled, isEnabled: false, data: { enabled: false } }
    render(<PlatformSensorsPage />)
    expect(screen.getByText('No platform sensors here')).toBeInTheDocument()
    expect(screen.queryByText(/upgrade|plan/i)).toBeNull()
  })

  it('data: capacity, the tenant tier, and tiers above it muted with the reason', () => {
    render(<PlatformSensorsPage />)
    expect(screen.getByText('Active jobs')).toBeInTheDocument()
    expect(screen.getByText('/ 5')).toBeInTheDocument()
    expect(screen.getByText('/ 15')).toBeInTheDocument()
    expect(screen.getByText('Your tier')).toBeInTheDocument()
    expect(screen.getByText('2 of 5 job slots in use')).toBeInTheDocument()
    const premium = document.querySelector('[data-tier="premium"]')!
    expect(premium.className).toContain('opacity-60')
    expect(premium.textContent).toContain("Above your organization's tier (Shared)")
    expect(
      document.querySelector('[data-tier="premium"] a, [data-tier="premium"] button')
    ).toBeNull()
  })
})

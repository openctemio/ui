import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { FleetHealthStrip } from '../fleet-health-strip'
import type { FleetSummary } from '../../lib/fleet'

const summary: FleetSummary = {
  total: 7,
  enabled: 6,
  byState: {
    online: 3,
    degraded: 1,
    stale: 1,
    offline: 1,
    idle: 0,
    never_connected: 0,
    disabled: 1,
    revoked: 0,
  },
  canTakeJobs: 4,
  needsAttention: 3,
  attentionKinds: ['backlog', 'key', 'version'],
  updates: 2,
  unsupported: 1,
  jobsRunning: 4,
  jobSlots: 23,
  zones: { total: 4, covered: 3, uncovered: ['branch-hanoi'] },
  protocolV1: 0,
  hasProtocolInfo: false,
}

function renderStrip(over: Partial<React.ComponentProps<typeof FleetHealthStrip>> = {}) {
  const props = {
    summary,
    channel: { latest: 'v0.4.2', min: 'v0.4.0' },
    attentionActive: false,
    onToggleAttention: vi.fn(),
    updatesActive: false,
    onToggleUpdates: vi.fn(),
    zoneGroupingActive: false,
    onToggleZoneGrouping: vi.fn(),
    protocolV1Active: false,
    onToggleProtocolV1: vi.fn(),
    ...over,
  }
  render(<FleetHealthStrip {...props} />)
  return props
}

describe('FleetHealthStrip', () => {
  it('shows how many sensors can take jobs, with the state mix', () => {
    renderStrip()
    expect(screen.getByText('Fleet health')).toBeInTheDocument()
    expect(screen.getByText('of 6 can take jobs')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: '3 online, 2 degraded or stale, 1 offline, 1 disabled' })
    ).toBeInTheDocument()
  })

  it('needs attention filters the table and says what kind of problems', () => {
    const p = renderStrip()
    expect(screen.getByText('backlog, key, version')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Needs attention/ }))
    expect(p.onToggleAttention).toHaveBeenCalledTimes(1)
  })

  it('updates show the latest release and the ones below the minimum', () => {
    const p = renderStrip({ updatesActive: true })
    expect(screen.getByText('latest v0.4.2')).toBeInTheDocument()
    expect(screen.getByText('1 below minimum v0.4.0')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /Update available/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(btn)
    expect(p.onToggleUpdates).toHaveBeenCalled()
  })

  it('zone coverage names the zone that has no online sensor and groups by zone', () => {
    const p = renderStrip()
    expect(screen.getByText('branch-hanoi has no online sensor')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Zone coverage/ }))
    expect(p.onToggleZoneGrouping).toHaveBeenCalled()
  })

  it('shows "Still on protocol v1" only while some sensor is, and it filters', () => {
    expect(renderStrip().onToggleProtocolV1).toBeDefined()
    expect(screen.queryByText('Still on protocol v1')).toBeNull()
  })

  it('counts sensors still on protocol v1 with the upgrade deadline', () => {
    const p = renderStrip({ summary: { ...summary, protocolV1: 2, hasProtocolInfo: true } })
    expect(screen.getByText('upgrade to v0.5.0 before 2027-04-01')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Still on protocol v1/ }))
    expect(p.onToggleProtocolV1).toHaveBeenCalled()
  })

  it('has no zone metric without zones, and the jobs metric shows the slots', () => {
    renderStrip({ summary: { ...summary, zones: null } })
    expect(screen.queryByText('Zone coverage')).toBeNull()
    expect(screen.getByText('/ 23 slots')).toBeInTheDocument()
  })
})

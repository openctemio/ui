import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'

import type { SensorActivityItem, SensorActivityResponse } from '@/lib/api/sensor-types'

const api = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
}))
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  get: api.get,
}))
vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1' } }),
}))

import { SensorActivity, SensorRecentActivity } from '../sensor-activity'

const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString()

function item(over: Partial<SensorActivityItem>): SensorActivityItem {
  return {
    id: over.id ?? `e:${Math.random()}`,
    at: ago(300),
    category: 'status',
    type: 'online',
    source: 'sensor',
    summary: 'server text',
    details: {},
    repeat_count: 1,
    ...over,
  }
}

function page(items: SensorActivityItem[], next = '', audit = true): SensorActivityResponse {
  return { items, next_cursor: next, audit_included: audit }
}

/** The query of the n-th activity request. */
function query(n: number): URLSearchParams {
  const url = api.get.mock.calls[n][0]
  return new URL(url, 'http://x').searchParams
}

function renderActivity(ui: React.ReactElement = <SensorActivity sensorId="s1" />) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>
  )
}

describe('SensorActivity', () => {
  beforeEach(() => api.get.mockReset())

  it('calls the sensor activity endpoint, not the audit log', async () => {
    api.get.mockResolvedValue(page([]))
    renderActivity()
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const url = api.get.mock.calls[0][0]
    expect(url).toMatch(/^\/api\/v1\/sensors\/s1\/activity\?/)
    expect(url).not.toMatch(/audit-logs/)
    expect(query(0).get('types')).toBeNull()
    expect(query(0).get('limit')).toBe('30')
  })

  it('renders one sentence per event type, with details, repeats and the summary fallback', async () => {
    api.get.mockResolvedValue(
      page([
        item({
          id: 'v',
          category: 'updates',
          type: 'version_changed',
          details: { from: '0.4.2', to: 'v0.5.0', direction: 'upgrade' },
        }),
        item({
          id: 'r',
          type: 'restarted',
          details: { downtime_seconds: 120 },
          repeat_count: 3,
          last_at: ago(60),
        }),
        item({
          id: 't',
          category: 'updates',
          type: 'tools_changed',
          details: {
            added: [{ name: 'nuclei', version: '3.2.0' }],
            removed: [{ name: 'trivy' }],
            updated: [{ name: 'semgrep', from: '1.90.0', to: '1.91.0' }],
          },
        }),
        item({
          id: 'j',
          category: 'jobs',
          type: 'job_failed',
          source: 'job',
          details: {
            command_id: 'abcdef1234567890',
            command_type: 'scan',
            error: 'nuclei exited 2',
            duration_seconds: 45,
          },
        }),
        item({
          id: 'a',
          category: 'people',
          type: 'audit',
          source: 'audit',
          action: 'sensor.key_regenerated',
          actor: 'admin@example.com',
          result: 'success',
        }),
        item({ id: 'x', type: 'something_new', summary: 'A brand new event' }),
      ])
    )
    renderActivity()
    expect(await screen.findByText('Upgraded to v0.5.0')).toBeInTheDocument()
    expect(screen.getByText('v0.4.2 → v0.5.0 · upgrade')).toBeInTheDocument()
    expect(screen.getByText('Restarted')).toBeInTheDocument()
    expect(screen.getByText('Down 2m')).toBeInTheDocument()
    expect(screen.getByText('×3')).toBeInTheDocument()
    expect(screen.getByText('Tools changed')).toBeInTheDocument()
    expect(screen.getByText('Added: nuclei 3.2.0')).toBeInTheDocument()
    expect(screen.getByText('Removed: trivy')).toBeInTheDocument()
    expect(screen.getByText('Updated: semgrep 1.90.0 → 1.91.0')).toBeInTheDocument()
    expect(screen.getByText('A job failed')).toBeInTheDocument()
    expect(screen.getByText('scan · abcdef12 · took 45s')).toBeInTheDocument()
    expect(screen.getByText('nuclei exited 2')).toBeInTheDocument()
    expect(screen.getByText('API key rotated')).toBeInTheDocument()
    expect(screen.getByText('By admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('A brand new event')).toBeInTheDocument()
    // Relative time, with the absolute time on hover.
    const times = screen.getAllByText(/ago$/)
    expect(times.length).toBeGreaterThan(0)
    expect(times[0]).toHaveAttribute('title')
  })

  it('toggling chips refetches with the selected types; none selected means all', async () => {
    api.get.mockResolvedValue(page([item({ id: 'o' })]))
    renderActivity()
    await screen.findByText('Came back online')
    const chips = screen.getByRole('group', { name: 'Filter activity' })
    expect(
      within(chips)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['People', 'Status', 'Updates', 'Jobs'])

    await userEvent.click(within(chips).getByRole('button', { name: 'Updates' }))
    await waitFor(() => expect(query(api.get.mock.calls.length - 1).get('types')).toBe('updates'))
    expect(within(chips).getByRole('button', { name: 'Updates' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await userEvent.click(within(chips).getByRole('button', { name: 'Status' }))
    await waitFor(() =>
      expect(query(api.get.mock.calls.length - 1).get('types')).toBe('status,updates')
    )

    await userEvent.click(within(chips).getByRole('button', { name: 'Status' }))
    await userEvent.click(within(chips).getByRole('button', { name: 'Updates' }))
    await waitFor(() => expect(query(api.get.mock.calls.length - 1).get('types')).toBeNull())
  })

  it('Load more requests the next cursor and appends the page', async () => {
    api.get.mockImplementation(async (url: string) =>
      new URL(url, 'http://x').searchParams.get('cursor') === 'c2'
        ? page([item({ id: 'old', type: 'offline' })])
        : page([item({ id: 'new', type: 'online' })], 'c2')
    )
    renderActivity()
    await screen.findByText('Came back online')
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('Went offline')).toBeInTheDocument()
    // Appended, newest first, and no more pages.
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-entry'))).toEqual(['new', 'old'])
    expect(api.get.mock.calls.some(([u]) => u.includes('cursor=c2'))).toBe(true)
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })

  it('explains what will appear when there is nothing yet', async () => {
    api.get.mockResolvedValue(page([]))
    renderActivity()
    expect(await screen.findByText('No activity yet')).toBeInTheDocument()
    expect(
      screen.getByText(/Restarts, upgrades, protocol and tool changes, connection changes/)
    ).toBeInTheDocument()
  })

  it('without audit access: says administrator actions are hidden and disables People', async () => {
    api.get.mockResolvedValue(page([item({ id: 'o' })], '', false))
    renderActivity()
    expect(
      await screen.findByText('Administrator actions are visible to owners and administrators')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'People' })).toBeDisabled()
  })

  it('shows an error with a retry', async () => {
    api.get.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(page([item({ id: 'o' })]))
    renderActivity()
    expect(await screen.findByText('Failed to load sensor activity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }))
    expect(await screen.findByText('Came back online')).toBeInTheDocument()
  })

  it('the overview lists the latest events from the same endpoint', async () => {
    api.get.mockResolvedValue(
      page([
        item({
          id: 'a',
          type: 'audit',
          category: 'people',
          action: 'sensor.updated',
          actor: 'admin@example.com',
        }),
      ])
    )
    const onAll = vi.fn()
    renderActivity(<SensorRecentActivity sensorId="s1" onAll={onAll} />)
    expect(await screen.findByText('Sensor settings changed')).toBeInTheDocument()
    expect(screen.getByText('· admin@example.com')).toBeInTheDocument()
    expect(query(0).get('limit')).toBe('5')
    await userEvent.click(screen.getByRole('button', { name: 'All activity' }))
    expect(onAll).toHaveBeenCalled()
  })
})

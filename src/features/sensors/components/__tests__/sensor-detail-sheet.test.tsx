import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Sensor } from '@/lib/api/sensor-types'

const perms = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/lib/permissions', () => ({
  Permission: {
    SensorsWrite: 'sensors:write',
    SensorsDelete: 'sensors:delete',
    AuditRead: 'audit:read',
    CommandsRead: 'sensors:commands:read',
  },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
const phone = vi.hoisted(() => ({ value: false }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => phone.value }))
vi.mock('@/lib/api/sensor-hooks', () => ({
  SENSOR_REFRESH_MS: 15000,
  useSensor: () => ({ data: undefined }),
  useSensorCommands: () => ({ data: { data: [] }, isLoading: false }),
}))
vi.mock('@/features/scan-zones', () => ({ SensorZonesSection: () => null }))
vi.mock('../sensor-activity', () => ({
  SensorActivity: ({ sensorId }: { sensorId: string }) => <p>activity of {sensorId}</p>,
  SensorRecentActivity: () => <p>recent activity</p>,
}))
vi.mock('../sensor-install-snippets', () => ({
  SensorInstallSnippets: ({ sensorId }: { sensorId: string }) => <p>snippets for {sensorId}</p>,
}))

import { SensorDetailSheet } from '../sensor-detail-sheet'

const now = Date.now()
const sensor: Sensor = {
  id: 's1',
  tenant_id: 't',
  name: 'k8s-scanner-a',
  type: 'worker',
  capabilities: [],
  tools: ['nuclei'],
  execution_mode: 'daemon',
  status: 'active',
  health: 'online',
  api_key_prefix: 'rda_9f3c',
  cpu_percent: 0,
  memory_percent: 0,
  max_concurrent_jobs: 8,
  current_jobs: 1,
  labels: { env: 'prod' },
  config: {},
  metadata: {},
  total_findings: 1034,
  total_scans: 212,
  error_count: 0,
  created_at: new Date(now - 86400000).toISOString(),
  updated_at: new Date(now).toISOString(),
  last_seen_at: new Date(now - 4000).toISOString(),
  version: 'v0.4.2',
  hostname: 'sensor-7d9f-a',
  ip_address: '10.40.3.17',
  key_expires_at: new Date(now + 6 * 86400000).toISOString(),
  protocol: {
    version: 1,
    user_agent: 'openctem-sdk-go/0.6.0',
    seen_at: new Date(now).toISOString(),
    deprecated: true,
  },
}

function open(extra: Partial<React.ComponentProps<typeof SensorDetailSheet>> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onEdit: vi.fn(),
    onRegenerateKey: vi.fn(),
    onDelete: vi.fn(),
    onDeactivate: vi.fn(),
    onRevoke: vi.fn(),
  }
  render(
    <SensorDetailSheet
      sensor={sensor}
      open
      channel={{ latest: 'v0.4.2', min: 'v0.4.0' }}
      {...handlers}
      {...extra}
    />
  )
  return handlers
}

describe('SensorDetailSheet', () => {
  beforeEach(() => perms.granted.clear())

  it('leads with the health checklist and four tabs (no Analytics)', () => {
    open()
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog)
        .getAllByRole('tab')
        .map((t) => t.textContent)
    ).toEqual(['Overview', 'Jobs', 'Activity', 'Config'])
    const health = screen.getByRole('list', { name: 'Health' })
    expect(within(health).getByText('Heartbeat')).toBeInTheDocument()
    expect(within(health).getByText(/Expires in 6 days/)).toBeInTheDocument()
    expect(within(health).getByText(/v0.4.2, the latest release/)).toBeInTheDocument()
  })

  it('shows the reported tools with versions, missing ones, and the capacity', () => {
    open({
      sensor: {
        ...sensor,
        tools: ['nuclei', 'semgrep'],
        reported: {
          tools: [
            { name: 'semgrep', version: '1.90.0', installed: true },
            { name: 'nuclei', installed: false },
          ],
          capabilities: ['semgrep', 'sast'],
          max_concurrent_jobs: 3,
          os: 'linux',
          arch: 'amd64',
          reported_at: new Date(now).toISOString(),
        },
        effective: {
          tools: ['semgrep'],
          capabilities: ['semgrep', 'sast'],
          max_concurrent_jobs: 3,
        },
        capability_mismatch: { tools_not_installed: ['nuclei'] },
      },
    })
    expect(screen.getByText('1.90.0')).toBeInTheDocument()
    expect(screen.getByText('not installed')).toBeInTheDocument()
    expect(screen.getByText(/As the sensor reported \(linux\/amd64\)/)).toBeInTheDocument()
    expect(screen.getByText(/1 running · 3 slots \(reported 3 · limit 8\)/)).toBeInTheDocument()
    const health = screen.getByRole('list', { name: 'Health' })
    expect(within(health).getByText(/Set but not installed: nuclei/)).toBeInTheDocument()
  })

  it('shows the set tools when the sensor reports none', () => {
    open()
    expect(screen.getByText(/the sensor has not reported its tools/)).toBeInTheDocument()
    expect(screen.getByText(/1 running · 8 slots \(limit 8\)/)).toBeInTheDocument()
  })

  it('shows protocol v1 as deprecated with the upgrade deadline in the runtime section', () => {
    open()
    expect(
      screen.getByText(/Protocol v1, deprecated: upgrade the sensor to v0.5.0 before 2027-04-01/)
    ).toBeInTheDocument()
    expect(screen.getByText('openctem-sdk-go/0.6.0')).toBeInTheDocument()
    expect(screen.getByText('v1 · deprecated')).toBeInTheDocument()
  })

  it('a member sees a lock hint, no key or lifecycle actions, and never a plan message', () => {
    open()
    // The activity timeline is for every sensor reader (sensors:read); the
    // API leaves administrator actions out for members.
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Overview',
      'Jobs',
      'Activity',
      'Config',
    ])
    expect(screen.getByText('Editing, keys and disabling need an admin')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rotate key' })).toBeNull()
    expect(screen.queryByText(/plan/i)).toBeNull()
  })

  it('an admin gets Rotate key (also on the expiring-key line) and the actions menu', async () => {
    perms.granted.add('sensors:write').add('sensors:delete')
    const h = open()
    const rotate = screen.getAllByRole('button', { name: 'Rotate key' })
    // The header button and the key line's fix action (rendered for phone and desktop).
    expect(rotate.length).toBeGreaterThanOrEqual(2)
    await userEvent.click(rotate[1])
    expect(h.onRegenerateKey).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(await screen.findByRole('menuitem', { name: /Disable/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Revoke access/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument()
  })

  it('opens as a bottom sheet on a phone', () => {
    phone.value = true
    open()
    expect(screen.getByRole('dialog').className).toContain('rounded-t-2xl')
    phone.value = false
  })

  it('the runtime section shows the sensor and SDK versions with an SDK warning', () => {
    open({
      sensor: {
        ...sensor,
        sdk_name: 'openctem-sdk-go',
        sdk_version: 'v0.8.0',
        sdk_status: 'unsupported',
        sensor_commit: 'abc1234',
      },
    })
    const line = screen.getByTitle(/Commit: abc1234/)
    expect(line.textContent).toBe('Sensor v0.4.2 · SDK v0.8.0')
    expect(screen.getByText('SDK unsupported')).toBeInTheDocument()
    expect(screen.getByText('recent activity')).toBeInTheDocument()
  })

  it('a member opens the Activity tab (the sensor activity endpoint, not the audit log)', async () => {
    open()
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(screen.getByText('activity of s1')).toBeInTheDocument()
  })

  it('Install command opens the Config tab with the snippets', async () => {
    open()
    // The header button (the protocol line offers the same fix).
    await userEvent.click(screen.getAllByRole('button', { name: /Install command/ })[0])
    expect(screen.getByText('snippets for s1')).toBeInTheDocument()
  })
})

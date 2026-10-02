import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Sensor, SensorContent } from '@/lib/api/sensor-types'

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
const content = vi.hoisted(() => ({ refreshSensorContent: vi.fn(), refreshFleetContent: vi.fn() }))
vi.mock('@/lib/api/sensor-content-hooks', () => content)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))
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
  started_at: new Date(now - 3 * 3600 * 1000).toISOString(),
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

/** A healthy, current sensor: no issue to call out. */
const healthy: Sensor = {
  ...sensor,
  key_expires_at: null,
  protocol: { version: 2, user_agent: 'openctemio-sensor/0.6.0', seen_at: '', deprecated: false },
  outbox: {
    pending_count: 0,
    pending_bytes: 0,
    oldest_age_seconds: 0,
    dead_letter_count: 0,
    evicted_count: 0,
    reported_at: new Date(now).toISOString(),
  },
}

const failedNuclei: SensorContent = {
  tool: 'nuclei',
  name: 'nuclei-templates',
  version: '',
  managed: true,
  stale: true,
  max_age_hours: 336,
  error:
    'resolve: checksums: Get "https://release-assets.githubusercontent.com/github-production-release-asset/253044228/35da6c58?sp=r&sv=2018-11-09',
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
  beforeEach(() => {
    perms.granted.clear()
    vi.clearAllMocks()
  })

  it('has four tabs and the health checklist one click away', async () => {
    open()
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog)
        .getAllByRole('tab')
        .map((t) => t.textContent)
    ).toEqual(['Overview', 'Jobs', 'Activity', 'Config'])
    expect(screen.queryByRole('list', { name: 'Health' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Health checks/ }))
    const health = screen.getByRole('list', { name: 'Health' })
    expect(within(health).getByText('Heartbeat')).toBeInTheDocument()
    expect(within(health).getByText(/Expires in 6 days/)).toBeInTheDocument()
    expect(within(health).getByText(/v0.4.2, the latest release/)).toBeInTheDocument()
  })

  describe('health callout', () => {
    it('says why a degraded sensor is degraded, in plain words, with the fix', async () => {
      perms.granted.add('sensors:write')
      open({
        sensor: {
          ...healthy,
          state: 'degraded',
          content: [failedNuclei],
          content_refresh_supported: true,
        },
      })
      const callout = screen.getByRole('region', { name: 'Health' })
      expect(within(callout).getByText('Nuclei templates: refresh failed')).toBeInTheDocument()
      expect(within(callout).getByText(/None is installed yet/)).toBeInTheDocument()
      // The signed download URL is not in the sentence; the raw error is folded away.
      expect(within(callout).getByText('Show the error')).toBeInTheDocument()
      content.refreshSensorContent.mockResolvedValueOnce({
        command_id: 'c',
        already_pending: false,
      })
      await userEvent.click(within(callout).getByRole('button', { name: /Refresh content/ }))
      expect(content.refreshSensorContent).toHaveBeenCalledWith('s1')
      expect(within(callout).getByRole('button', { name: /View activity/ })).toBeInTheDocument()
    })

    it('a member does not get Refresh content in the callout', () => {
      open({
        sensor: { ...healthy, content: [failedNuclei], content_refresh_supported: true },
      })
      const callout = screen.getByRole('region', { name: 'Health' })
      expect(within(callout).queryByRole('button', { name: /Refresh content/ })).toBeNull()
    })

    it('lists every problem when there are several', () => {
      open()
      const callout = screen.getByRole('region', { name: 'Health' })
      expect(within(callout).getByText('2 problems need attention')).toBeInTheDocument()
      expect(within(callout).getByText('API key expires soon')).toBeInTheDocument()
      expect(within(callout).getByText('Protocol v1 is deprecated')).toBeInTheDocument()
    })

    it('tells a never connected sensor to install, with the install command', async () => {
      open({ sensor: { ...healthy, last_seen_at: undefined, started_at: null } })
      const callout = screen.getByRole('region', { name: 'Health' })
      expect(within(callout).getByText('Not connected yet')).toBeInTheDocument()
      await userEvent.click(within(callout).getByRole('button', { name: 'Install command' }))
      expect(screen.getByText('snippets for s1')).toBeInTheDocument()
    })

    it('shows no callout for a healthy sensor, just the passing checks', () => {
      open({ sensor: healthy })
      expect(screen.queryByRole('region', { name: 'Health' })).toBeNull()
      expect(screen.getByRole('button', { name: /All \d+ health checks passing/ })).toBeVisible()
    })
  })

  describe('header', () => {
    it('leaves the host name out of the subline when it is the sensor name', () => {
      open({ sensor: { ...healthy, name: 'sensor-docker-01', hostname: 'sensor-docker-01' } })
      const sub = screen.getByText(/^Scanner · long-running/)
      expect(sub.textContent).toBe('Scanner · long-running · 10.40.3.17')
    })

    it('shows a host name that differs from the name', () => {
      open({ sensor: healthy })
      expect(screen.getByText(/^Scanner · long-running/).textContent).toBe(
        'Scanner · long-running · sensor-7d9f-a · 10.40.3.17'
      )
    })

    it('an admin gets Edit and Install command; Rotate key and the rest are in the menu', async () => {
      perms.granted.add('sensors:write').add('sensors:delete')
      const h = open({ sensor: healthy })
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Install command' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Rotate key' })).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
      await userEvent.click(await screen.findByRole('menuitem', { name: /Rotate key/ }))
      expect(h.onRegenerateKey).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
    })

    it('the menu holds Disable, Revoke and Delete', async () => {
      perms.granted.add('sensors:write').add('sensors:delete')
      const h = open()
      await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
      expect(await screen.findByRole('menuitem', { name: /Disable/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Revoke access/ })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('menuitem', { name: /Delete/ }))
      // The page asks for confirmation before anything is deleted.
      expect(h.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
    })

    it('the expiring key can be rotated from the callout', async () => {
      perms.granted.add('sensors:write')
      const h = open()
      const callout = screen.getByRole('region', { name: 'Health' })
      await userEvent.click(within(callout).getByRole('button', { name: 'Rotate key' }))
      expect(h.onRegenerateKey).toHaveBeenCalled()
    })

    it('a member sees a lock hint, no key or lifecycle actions, and never a plan message', () => {
      open()
      expect(screen.getByText('Editing, keys and disabling need an admin')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Rotate key' })).toBeNull()
      expect(screen.queryByText(/plan/i)).toBeNull()
    })
  })

  describe('stat strip', () => {
    it('shows jobs over slots, the heartbeat, the uptime and the scans', () => {
      open({ sensor: healthy })
      const stats = screen.getByLabelText('Key numbers')
      expect(within(stats).getByText('Jobs running')).toBeInTheDocument()
      expect(within(stats).getByText('/ 8')).toBeInTheDocument()
      expect(within(stats).getByRole('meter', { name: 'Job slots in use' })).toHaveAttribute(
        'aria-valuenow',
        '1'
      )
      expect(within(stats).getByText('Last heartbeat')).toBeInTheDocument()
      expect(within(stats).getByText('Up for')).toBeInTheDocument()
      expect(within(stats).getByText('3h')).toBeInTheDocument()
      expect(within(stats).getByText('212')).toBeInTheDocument()
      expect(within(stats).getByText('1,034 findings')).toBeInTheDocument()
    })

    it('leaves out the numbers a never connected sensor does not have', () => {
      open({ sensor: { ...healthy, last_seen_at: undefined, started_at: null } })
      const stats = screen.getByLabelText('Key numbers')
      expect(within(stats).queryByText('Last heartbeat')).toBeNull()
      expect(within(stats).queryByText('Up for')).toBeNull()
      expect(within(stats).getByText('Not taking jobs')).toBeInTheDocument()
    })

    it('a CI sensor has no job slots', () => {
      open({
        sensor: { ...healthy, type: 'runner', execution_mode: 'standalone', tools: ['semgrep'] },
      })
      const stats = screen.getByLabelText('Key numbers')
      expect(within(stats).queryByText('Jobs running')).toBeNull()
      expect(within(stats).getByText('Last run')).toBeInTheDocument()
    })
  })

  it('shows the reported tools with versions, missing ones, and the capacity explained', () => {
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
    const tools = screen.getByRole('list', { name: 'Tools' })
    expect(within(tools).getByText('1.90.0')).toBeInTheDocument()
    expect(within(tools).getByText('not installed')).toBeInTheDocument()
    expect(screen.getByText('linux/amd64')).toBeInTheDocument()
    expect(screen.getByText('3 at once')).toBeInTheDocument()
    expect(screen.getByText('sensor reports 3 · limit 8')).toBeInTheDocument()
    const callout = screen.getByRole('region', { name: 'Health' })
    expect(within(callout).getByText('Tools not installed')).toBeInTheDocument()
  })

  it('shows the set tools when the sensor reports none', () => {
    open()
    expect(screen.getByText(/it has not reported its tools yet/)).toBeInTheDocument()
    expect(screen.getByText('limit 8; the sensor reports none')).toBeInTheDocument()
  })

  it('shows protocol v1 as deprecated with the upgrade deadline', () => {
    open()
    expect(screen.getByText('Upgrade to v0.5.0 before 2027-04-01')).toBeInTheDocument()
    expect(screen.getByLabelText('Protocol v1, openctem-sdk-go/0.6.0')).toBeInTheDocument()
    expect(screen.getAllByText('v1 · deprecated').length).toBeGreaterThanOrEqual(1)
  })

  it('opens as a bottom sheet on a phone', () => {
    phone.value = true
    open()
    expect(screen.getByRole('dialog').className).toContain('rounded-t-2xl')
    phone.value = false
  })

  it('the identity section shows the sensor and SDK versions with an SDK warning', () => {
    open({
      sensor: {
        ...sensor,
        sdk_name: 'openctem-sdk-go',
        sdk_version: 'v0.8.0',
        sdk_status: 'unsupported',
        sensor_commit: 'abc1234',
      },
    })
    const cell = screen.getByTitle(/Commit: abc1234/)
    expect(cell.querySelector('[data-slot="sensor-version"]')?.textContent).toBe('v0.4.2')
    expect(cell.querySelector('[data-slot="sdk-version"]')?.textContent).toBe('SDK v0.8.0')
    expect(screen.getByText('SDK unsupported')).toBeInTheDocument()
    expect(screen.getByText('recent activity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy sensor ID' })).toBeInTheDocument()
  })

  it('a member opens the Activity tab (the sensor activity endpoint, not the audit log)', async () => {
    open()
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(screen.getByText('activity of s1')).toBeInTheDocument()
  })

  it('Install command opens the Config tab with the snippets', async () => {
    open()
    // The header button (the protocol problem in the callout offers the same fix).
    await userEvent.click(screen.getAllByRole('button', { name: 'Install command' })[0])
    expect(screen.getByText('snippets for s1')).toBeInTheDocument()
  })
})

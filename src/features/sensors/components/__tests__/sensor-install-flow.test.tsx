import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
// Radix Select uses pointer capture and scrollIntoView, which jsdom lacks.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(async () => ({})),
  assign: vi.fn(async () => ({})),
  sensor: { value: undefined as unknown },
  zones: { value: [] as unknown[] },
}))
const perms = vi.hoisted(() => ({ granted: new Set<string>() }))

vi.mock('@/lib/permissions', () => ({
  Permission: { ScanZonesRead: 'zones:read', ScanZonesWrite: 'zones:write' },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
vi.mock('@/lib/api/sensor-hooks', () => ({
  useCreateSensor: () => ({ trigger: api.create, isMutating: false }),
  useSensor: () => ({ data: api.sensor.value }),
  useUpdateSensor: () => ({ trigger: api.update, isMutating: false }),
  invalidateSensorsCache: vi.fn(async () => undefined),
}))
vi.mock('@/lib/api/scan-zone-hooks', () => ({
  useScanZones: () => ({ data: { data: api.zones.value } }),
  assignSensorToZone: api.assign,
}))
vi.mock('../../hooks', () => ({
  useSensorFormOptions: () => ({
    getCapabilitiesForTools: (t: string[]) => (t.length ? ['dast'] : []),
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../sensor-install-snippets', () => ({
  SensorInstallSnippets: ({ sensorId, apiKey }: { sensorId: string; apiKey?: string }) => (
    <pre>
      docker run for {sensorId} with {apiKey}
    </pre>
  ),
}))

import { SensorInstallFlow, installStepLabel } from '../sensor-install-flow'
import { TEST_SENSOR_KEY } from '@/test/sensor-keys'

const created = {
  sensor: { id: 'new-1', name: 'dmz-scanner-01', last_seen_at: undefined },
  api_key: TEST_SENSOR_KEY,
}

describe('SensorInstallFlow', () => {
  beforeEach(() => {
    api.create.mockReset().mockResolvedValue(created)
    api.update.mockClear()
    api.assign.mockClear()
    api.sensor.value = undefined
    api.zones.value = []
    perms.granted.clear()
  })

  it('creates a long-running scanner without guessing its tools', async () => {
    render(<SensorInstallFlow />)
    const create = screen.getByRole('button', { name: /Create and show the command/ })
    expect(create).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(create)
    expect(api.create).toHaveBeenCalledWith({
      name: 'dmz-scanner-01',
      type: 'worker',
      execution_mode: 'daemon',
    })
  })

  it('has no tool picker at create: the sensor reports its tools', () => {
    render(<SensorInstallFlow />)
    expect(screen.queryByText(/Limit to tools/)).toBeNull()
    for (const tool of ['nuclei', 'trivy', 'semgrep', 'betterleaks']) {
      expect(screen.queryByRole('button', { name: tool })).toBeNull()
    }
    expect(screen.getByText(/You choose its tools after it connects/)).toBeInTheDocument()
  })

  it('a CI runner is one-shot; a collector has no scan tools', async () => {
    render(<SensorInstallFlow />)
    await userEvent.type(screen.getByLabelText('Name'), 'ci')
    await userEvent.click(screen.getByRole('radio', { name: /CI runner/ }))
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    expect(api.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'runner', execution_mode: 'standalone' })
    )
  })

  it('refuses a name a shell or a container cannot use', async () => {
    render(<SensorInstallFlow />)
    await userEvent.type(screen.getByLabelText('Name'), '$(rm -rf)')
    expect(screen.getByText(/Letters, digits/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create and show the command/ })).toBeDisabled()
  })

  it('shows the key once, inside the commands, then waits for the first heartbeat', async () => {
    render(<SensorInstallFlow />)
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    expect(await screen.findByText(/Copy the key now./)).toBeInTheDocument()
    expect(screen.getByText(`docker run for new-1 with ${TEST_SENSOR_KEY}`)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the first heartbeat/)).toBeInTheDocument()
  })

  const reportedSensor = {
    ...created.sensor,
    last_seen_at: new Date().toISOString(),
    version: '0.6.1',
    sdk_version: 'v0.11.0',
    hostname: 'dmz-host-7',
    tools: [],
    protocol: { version: 2, user_agent: 'openctemio-sensor/0.6.1', seen_at: '', deprecated: false },
    reported: {
      tools: [
        { name: 'nuclei', version: '3.4.2', installed: true },
        { name: 'trivy', version: '0.58.1', installed: true },
        { name: 'semgrep', installed: false },
      ],
      capabilities: ['dast', 'sca'],
      max_concurrent_jobs: 4,
      os: 'linux',
      arch: 'amd64',
      reported_at: new Date().toISOString(),
    },
  }

  async function connect(props: React.ComponentProps<typeof SensorInstallFlow> = {}) {
    render(<SensorInstallFlow {...props} />)
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    await screen.findByText('Connected')
  }

  it('after the first heartbeat: shows what it reported, every installed tool checked', async () => {
    api.sensor.value = reportedSensor
    const onOpen = vi.fn()
    const onStepChange = vi.fn()
    await connect({ onOpen, onStepChange })
    await waitFor(() => expect(onStepChange).toHaveBeenLastCalledWith('connected'))
    expect(installStepLabel('connected')).toBe('Step 3 of 3: Review what it reported')
    // The key and the commands are gone once it is connected.
    expect(screen.queryByText(/Copy the key now./)).toBeNull()
    expect(screen.getByText('dmz-host-7')).toBeInTheDocument()
    expect(screen.getByText('linux/amd64')).toBeInTheDocument()
    expect(screen.getByText('v0.6.1')).toBeInTheDocument()
    expect(screen.getByText('SDK v0.11.0')).toBeInTheDocument()
    expect(screen.getByText('4 jobs at once')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /nuclei/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /trivy/ })).toBeChecked()
    const semgrep = screen.getByRole('checkbox', { name: /semgrep/ })
    expect(semgrep).not.toBeChecked()
    expect(semgrep).toBeDisabled()
    expect(screen.getByText('not installed')).toBeInTheDocument()
    expect(
      screen.getByText(/Jobs can use every reported tool until you narrow this/)
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open sensor' }))
    expect(onOpen).toHaveBeenCalled()
  })

  it('Done with every tool checked sends nothing (all reported tools stay allowed)', async () => {
    api.sensor.value = reportedSensor
    const onDone = vi.fn()
    await connect({ onDone })
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(api.update).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  it('unchecking a tool sends only the allowed subset', async () => {
    api.sensor.value = reportedSensor
    const onDone = vi.fn()
    await connect({ onDone })
    await userEvent.click(screen.getByRole('checkbox', { name: /trivy/ }))
    expect(screen.getByText(/Only the checked tools get jobs/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith({ tools: ['nuclei'], capabilities: [] })
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('unchecking every tool is refused', async () => {
    api.sensor.value = reportedSensor
    await connect()
    await userEvent.click(screen.getByRole('checkbox', { name: /trivy/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /nuclei/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Allow at least one tool.')
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  })

  it('a sensor that reports no tools: says so, no checklist', async () => {
    api.sensor.value = { ...reportedSensor, reported: { ...reportedSensor.reported, tools: [] } }
    const onDone = vi.fn()
    await connect({ onDone })
    expect(screen.getByText('It reported no scanning tools.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(api.update).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  it('a sensor without a tool report: says so, no checklist', async () => {
    api.sensor.value = { ...reportedSensor, reported: null }
    await connect()
    expect(screen.getByText('It has not reported its tools.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('assigns the zone picked before creating (zone admins only)', async () => {
    perms.granted.add('zones:read').add('zones:write')
    api.zones.value = [{ id: 'z1', name: 'dmz', ranges: ['203.0.113.0/24'], sensor_ids: [] }]
    render(<SensorInstallFlow />)
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(screen.getByRole('combobox', { name: 'Zone' }))
    await userEvent.click(await screen.findByRole('option', { name: /dmz/ }))
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    await waitFor(() => expect(api.assign).toHaveBeenCalledWith('z1', 'new-1'))
  })

  it('has no zone picker without zones', () => {
    render(<SensorInstallFlow />)
    expect(screen.queryByRole('combobox', { name: 'Zone' })).toBeNull()
  })

  it('in a dialog: no own title (the header bar has it) and reports the step', async () => {
    const onStepChange = vi.fn()
    render(<SensorInstallFlow variant="dialog" onStepChange={onStepChange} />)
    expect(screen.queryByRole('heading', { name: 'Install a sensor' })).toBeNull()
    expect(screen.getByRole('list', { name: 'Steps' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith('install'))
    expect(installStepLabel('install')).toBe('Step 2 of 3: Run the command on the host')
  })
})

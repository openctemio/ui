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
vi.mock('../sensor-install-snippets', () => ({
  SensorInstallSnippets: ({ sensorId, apiKey }: { sensorId: string; apiKey?: string }) => (
    <pre>
      docker run for {sensorId} with {apiKey}
    </pre>
  ),
}))

import { SensorInstallFlow, installStepLabel } from '../sensor-install-flow'

const created = {
  sensor: { id: 'new-1', name: 'dmz-scanner-01', last_seen_at: undefined },
  api_key: 'rda_4b1e0123456789',
}

describe('SensorInstallFlow', () => {
  beforeEach(() => {
    api.create.mockReset().mockResolvedValue(created)
    api.assign.mockClear()
    api.sensor.value = undefined
    api.zones.value = []
    perms.granted.clear()
  })

  it('creates a long-running scanner with the image tools by default', async () => {
    render(<SensorInstallFlow />)
    const create = screen.getByRole('button', { name: /Create and show the command/ })
    expect(create).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(create)
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dmz-scanner-01',
        type: 'worker',
        execution_mode: 'daemon',
        tools: ['nuclei', 'trivy', 'semgrep', 'betterleaks'],
        capabilities: ['dast'],
      })
    )
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
    expect(screen.getByText(/docker run for new-1 with rda_4b1e0123456789/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the first heartbeat/)).toBeInTheDocument()
  })

  it('says Connected once the sensor heartbeats', async () => {
    api.sensor.value = {
      ...created.sensor,
      last_seen_at: new Date().toISOString(),
      version: '0.4.2',
    }
    const onOpen = vi.fn()
    render(<SensorInstallFlow onOpen={onOpen} />)
    await userEvent.type(screen.getByLabelText('Name'), 'dmz-scanner-01')
    await userEvent.click(screen.getByRole('button', { name: /Create and show the command/ }))
    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.getByText(/running v0.4.2/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open sensor' }))
    expect(onOpen).toHaveBeenCalled()
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
    expect(installStepLabel('install')).toBe('Step 2 of 4: Run the command on the host')
  })
})

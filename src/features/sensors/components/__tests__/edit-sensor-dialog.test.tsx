import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Sensor } from '@/lib/api/sensor-types'

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const api = vi.hoisted(() => ({
  update: vi.fn(async () => ({})),
  revoke: vi.fn(async () => ({})),
  remove: vi.fn(async () => undefined),
  assign: vi.fn(async () => ({})),
  unassign: vi.fn(async () => undefined),
  zones: { value: [] as unknown[] },
}))
const perms = vi.hoisted(() => ({ granted: new Set<string>() }))

vi.mock('@/lib/permissions', () => ({
  Permission: {
    SensorsDelete: 'sensors:delete',
    ScanZonesRead: 'zones:read',
    ScanZonesWrite: 'zones:write',
  },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
vi.mock('@/lib/api/sensor-hooks', () => ({
  useUpdateSensor: () => ({ trigger: api.update, isMutating: false }),
  useRevokeSensor: () => ({ trigger: api.revoke, isMutating: false }),
  useDeleteSensor: () => ({ trigger: api.remove, isMutating: false }),
  invalidateSensorsCache: vi.fn(async () => undefined),
}))
vi.mock('@/lib/api/scan-zone-hooks', () => ({
  useScanZones: () => ({ data: { data: api.zones.value } }),
  assignSensorToZone: api.assign,
  unassignSensorFromZone: api.unassign,
  invalidateScanZonesCache: vi.fn(async () => undefined),
}))
vi.mock('../../hooks', () => ({
  useSensorFormOptions: () => ({ getCapabilitiesForTools: (t: string[]) => t }),
}))

import { EditSensorDialog } from '../edit-sensor-dialog'

const sensor: Sensor = {
  id: 's1',
  tenant_id: 't',
  name: 'sensor-docker-01',
  type: 'worker',
  capabilities: [],
  tools: [],
  execution_mode: 'daemon',
  status: 'active',
  health: 'online',
  api_key_prefix: 'rda_9f3c',
  cpu_percent: 0,
  memory_percent: 0,
  max_concurrent_jobs: 5,
  current_jobs: 0,
  labels: {},
  config: {},
  metadata: {},
  total_findings: 0,
  total_scans: 0,
  error_count: 0,
  version: 'v0.6.0',
  sdk_version: 'v0.9.0',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  last_seen_at: new Date().toISOString(),
  protocol: { version: 2, user_agent: 'openctem-sensor/0.6.0', seen_at: '', deprecated: false },
  reported: {
    tools: [
      { name: 'nuclei', version: '3.3.0', installed: true },
      { name: 'trivy', version: '0.58.0', installed: true },
    ],
    capabilities: ['dast', 'sca'],
    max_concurrent_jobs: 4,
    os: 'linux',
    arch: 'amd64',
    reported_at: '2026-10-01T00:00:00Z',
  },
}

function renderDialog(s: Partial<Sensor> = {}, onOpenChange = vi.fn()) {
  render(<EditSensorDialog open onOpenChange={onOpenChange} sensor={{ ...sensor, ...s }} />)
  return { onOpenChange, dialog: screen.getByRole('dialog', { name: 'Edit sensor' }) }
}

describe('EditSensorDialog', () => {
  beforeEach(() => {
    for (const f of [api.update, api.revoke, api.remove, api.assign, api.unassign]) f.mockClear()
    perms.granted = new Set(['sensors:delete'])
    api.zones.value = []
  })

  it('opens with focus on Name, not on the close button', () => {
    const { dialog } = renderDialog()
    const name = within(dialog).getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    expect(name).toHaveFocus()
    // Caret at the end, the name is not selected.
    expect(name.selectionStart).toBe(name.value.length)
    expect(name.selectionEnd).toBe(name.value.length)
  })

  it('has an Enabled switch and no Revoked status option', () => {
    const { dialog } = renderDialog()
    expect(within(dialog).getByRole('switch', { name: 'Enabled' })).toBeChecked()
    expect(within(dialog).queryByRole('radio', { name: /revoked/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Revoked')).not.toBeInTheDocument()
    // Execution mode is information, not a choice.
    expect(within(dialog).queryByRole('radio', { name: /daemon|standalone/i })).toBeNull()
    expect(within(dialog).getByText('Daemon')).toBeInTheDocument()
  })

  it('shows what the sensor reports about itself', () => {
    const { dialog } = renderDialog()
    const about = within(dialog).getByLabelText('About this sensor')
    expect(about).toHaveTextContent('v0.6.0')
    expect(about).toHaveTextContent('v2')
    expect(about).toHaveTextContent('v0.9.0')
    expect(about).toHaveTextContent('linux/amd64')
    expect(within(dialog).getByText(/reports 4 slots/)).toBeInTheDocument()
  })

  it('keeps Save disabled until something changes, then sends only the change', async () => {
    const user = userEvent.setup()
    const { dialog, onOpenChange } = renderDialog()
    const save = within(dialog).getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    await user.click(within(dialog).getByRole('switch', { name: 'Enabled' }))
    expect(save).toBeEnabled()
    await user.click(save)
    expect(api.update).toHaveBeenCalledWith({ status: 'disabled' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('limits to a subset of the reported tools', async () => {
    const user = userEvent.setup()
    const { dialog } = renderDialog()
    expect(within(dialog).getByRole('radio', { name: 'All reported tools' })).toBeChecked()

    await user.click(within(dialog).getByRole('radio', { name: /Only the tools/ }))
    // Nothing picked yet: not saveable.
    expect(within(dialog).getByText(/Pick at least one tool/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: 'nuclei 3.3.0' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(api.update).toHaveBeenCalledWith({ tools: ['nuclei'], capabilities: [] })
  })

  it('says so when the sensor has not reported tools, with nothing to pick', () => {
    const { dialog } = renderDialog({ reported: null, last_seen_at: undefined })
    expect(within(dialog).getByText(/hasn't reported its tools yet/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: 'All reported tools' })).toBeNull()
    expect(within(dialog).getByText('Never connected')).toBeInTheDocument()
  })

  it('revoke asks for the sensor name before it does anything', async () => {
    const user = userEvent.setup()
    const { dialog } = renderDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }))

    const confirm = screen.getByRole('alertdialog', { name: 'Revoke sensor access' })
    const go = within(confirm).getByRole('button', { name: 'Revoke access' })
    expect(go).toBeDisabled()
    await user.type(within(confirm).getByRole('textbox'), 'sensor-docker')
    expect(go).toBeDisabled()
    await user.type(within(confirm).getByRole('textbox'), '-01')
    expect(go).toBeEnabled()
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(api.revoke).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }))
    const again = screen.getByRole('alertdialog', { name: 'Revoke sensor access' })
    await user.type(within(again).getByRole('textbox'), 'sensor-docker-01')
    await user.click(within(again).getByRole('button', { name: 'Revoke access' }))
    expect(api.revoke).toHaveBeenCalledWith('s1')
  })

  it('delete also asks for the name', async () => {
    const user = userEvent.setup()
    const { dialog } = renderDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Delete sensor' })
    expect(within(confirm).getByRole('button', { name: 'Delete sensor' })).toBeDisabled()
  })

  it('hides the danger zone without the delete permission', () => {
    perms.granted = new Set()
    const { dialog } = renderDialog()
    expect(within(dialog).queryByText('Danger zone')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Revoke' })).toBeNull()
  })

  it('a revoked sensor shows a notice instead of the form, and can still be deleted', () => {
    const { dialog } = renderDialog({ status: 'revoked' })
    expect(within(dialog).getByText('This sensor is revoked')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox', { name: 'Name' })).toBeNull()
    expect(within(dialog).queryByRole('switch')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Revoke' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Save changes' })).toBeNull()
  })

  it('asks before closing with unsaved changes', async () => {
    const user = userEvent.setup()
    const { dialog, onOpenChange } = renderDialog()
    await user.clear(within(dialog).getByRole('textbox', { name: 'Name' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'renamed')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    const confirm = screen.getByRole('alertdialog', { name: 'Discard changes?' })
    expect(onOpenChange).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Discard' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(api.update).not.toHaveBeenCalled()
  })

  it('closes at once when nothing changed', async () => {
    const user = userEvent.setup()
    const { dialog, onOpenChange } = renderDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('joins and leaves scan zones through the zone API', async () => {
    const user = userEvent.setup()
    perms.granted = new Set(['zones:read', 'zones:write'])
    api.zones.value = [
      { id: 'z1', name: 'DMZ', ranges: [], sensor_ids: ['s1'] },
      { id: 'z2', name: 'Office', ranges: [], sensor_ids: [] },
    ]
    const { dialog } = renderDialog()
    expect(within(dialog).getByRole('button', { name: 'DMZ' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await user.click(within(dialog).getByRole('button', { name: 'DMZ' }))
    await user.click(within(dialog).getByRole('button', { name: 'Office' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(api.update).not.toHaveBeenCalled()
    expect(api.assign).toHaveBeenCalledWith('z2', 's1')
    expect(api.unassign).toHaveBeenCalledWith('z1', 's1')
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiClientError } from '@/lib/api/error-handler'
import type { ScanZone } from '@/lib/api/scan-zone-types'
import type { RunDispatch } from '@/lib/api/scan-types'
import type { Sensor } from '@/lib/api/sensor-types'

// Radix Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const perms = vi.hoisted(() => ({ granted: new Set<string>() }))
const api = vi.hoisted(() => ({
  createScanZone: vi.fn(),
  updateScanZone: vi.fn(),
  invalidateScanZonesCache: vi.fn(async () => undefined),
}))

vi.mock('@/lib/permissions', () => ({
  Can: ({ permission, children }: { permission: string; children: React.ReactNode }) =>
    perms.granted.has(permission) ? children : null,
  Permission: {
    ScanZonesRead: 'sensors:zones:read',
    ScanZonesWrite: 'sensors:zones:write',
    ScanZonesDelete: 'sensors:zones:delete',
    SensorsRead: 'sensors:read',
  },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/scan-zone-hooks', () => ({
  ...api,
  useScanZones: () => ({ data: { data: [], total: 0 } }),
}))
vi.mock('@/lib/api/sensor-hooks', () => ({
  useSensors: () => ({ data: { items: [] }, isLoading: false }),
  useAllSensors: () => ({ data: { items: [] }, isLoading: false }),
}))

import { ScanZoneTable } from '../components/scan-zone-table'
import { ScanZoneDialog } from '../components/scan-zone-dialog'
import { RunDispatchPanel } from '../components/run-dispatch-panel'
import { addressesOutsideZones } from '../components/zone-coverage-card'
import { describeScanZoneError, scanZoneErrorCode, triggerErrorHint } from '../lib/errors'

const zone: ScanZone = {
  id: 'z1',
  tenant_id: 't1',
  name: 'HQ',
  description: 'Head office',
  is_default: false,
  ranges: ['10.1.0.0/16', '10.2.0.0/16', '10.3.0.0/16', '10.4.0.0/16'],
  sensor_ids: ['s1'],
  created_at: '',
  updated_at: '',
}
const sensor = {
  id: 's1',
  tenant_id: 't1',
  name: 'hq-scanner',
  status: 'active',
  health: 'online',
} as Sensor

function renderTable() {
  return render(
    <ScanZoneTable
      zones={[zone]}
      coverageByZone={new Map()}
      sensorsById={new Map([['s1', sensor]])}
      onEdit={vi.fn()}
      onSensors={vi.fn()}
      onDelete={vi.fn()}
    />
  )
}

describe('ScanZoneTable', () => {
  beforeEach(() => perms.granted.clear())

  it('shows ranges truncated with +N and the assigned sensor', () => {
    renderTable()
    expect(screen.getByText('10.1.0.0/16')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByText('hq-scanner')).toBeInTheDocument()
  })

  it('gives a read-only user no row actions', () => {
    perms.granted.add('sensors:zones:read')
    renderTable()
    expect(screen.queryByRole('button', { name: /actions for hq/i })).not.toBeInTheDocument()
  })

  it('offers edit, assign and delete to a zone admin', async () => {
    perms.granted = new Set(['sensors:zones:read', 'sensors:zones:write', 'sensors:zones:delete'])
    renderTable()
    await userEvent.click(screen.getByRole('button', { name: /actions for hq/i }))
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /assign sensors/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
  })
})

describe('ScanZoneDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks a deny-listed range before calling the API', async () => {
    render(<ScanZoneDialog open onOpenChange={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Name'), 'Lab')
    await userEvent.type(screen.getByLabelText('Ranges'), '0.0.0.0/0')
    expect(screen.getByTestId('zone-range-errors')).toHaveTextContent(/deny list/)
    await userEvent.click(screen.getByRole('button', { name: /create zone/i }))
    expect(api.createScanZone).not.toHaveBeenCalled()
  })

  it('surfaces the server message and hint on a duplicate name (409)', async () => {
    api.createScanZone.mockRejectedValueOnce(
      new ApiClientError('scan zone name "Lab" is already used', 'ZONE_NAME_TAKEN', 409)
    )
    render(<ScanZoneDialog open onOpenChange={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Name'), 'Lab')
    await userEvent.type(screen.getByLabelText('Ranges'), '10.9.0.0/16')
    await userEvent.click(screen.getByRole('button', { name: /create zone/i }))
    const alert = await screen.findByTestId('zone-server-error')
    expect(alert).toHaveTextContent('already used')
    expect(alert).toHaveTextContent(/unique per team/)
    expect(api.createScanZone).toHaveBeenCalledWith({
      name: 'Lab',
      description: '',
      is_default: false,
      ranges: ['10.9.0.0/16'],
    })
  })
})

describe('RunDispatchPanel', () => {
  it('lists uncovered targets once, with their reasons, and other warnings', () => {
    perms.granted.clear()
    const dispatch: RunDispatch = {
      resolved_targets: 3,
      excluded_targets: 1,
      warnings: ['10.9.9.9 not scanned: private address outside every scan zone', 'other note'],
      uncovered_targets: [
        { target: '10.9.9.9', reason: 'private address outside every scan zone' },
      ],
      zone_routing: {
        jobs: 2,
        unzoned_targets: 0,
        uncovered_targets: 1,
        zones: [
          { zone_id: 'z1', zone_name: 'HQ', targets: 2, jobs: 2, queued_jobs: 0, sensor_ids: [] },
        ],
      },
      sensor_routing: 'tenant',
    }
    render(<RunDispatchPanel dispatch={dispatch} />)
    const uncovered = screen.getByTestId('run-uncovered')
    expect(within(uncovered).getByText('10.9.9.9')).toBeInTheDocument()
    const warnings = screen.getByTestId('run-warnings')
    expect(within(warnings).queryByText(/10\.9\.9\.9/)).not.toBeInTheDocument()
    expect(within(warnings).getByText('other note')).toBeInTheDocument()
    expect(screen.getByText('HQ')).toBeInTheDocument()
  })
})

describe('helpers', () => {
  it('lists inventory addresses outside every zone, private first', () => {
    const out = addressesOutsideZones(
      [
        { id: 'a', name: '10.1.2.3', type: 'ip_address' },
        { id: 'b', name: '203.0.113.5', type: 'ip_address' },
        { id: 'c', name: '192.168.7.7', type: 'host' },
        { id: 'd', name: 'web.example.com', type: 'host' },
      ],
      [zone]
    )
    expect(out.map((o) => [o.address, o.private])).toEqual([
      ['192.168.7.7', true],
      ['203.0.113.5', false],
    ])
  })

  it('explains trigger refusals', () => {
    const err = new ApiClientError('No target...', 'NO_ZONE_COVERAGE', 400)
    expect(triggerErrorHint(err)).toMatch(/outside every scan zone/)
    expect(describeScanZoneError(err, 'x').status).toBe(400)
    expect(triggerErrorHint(new Error('x'))).toBeUndefined()
  })

  it('tells zone conflicts apart when the server sends the generic CONFLICT code', () => {
    const conflict = (m: string) => new ApiClientError(m, 'CONFLICT', 409)
    expect(scanZoneErrorCode(conflict('a scan zone with this name already exists'))).toBe(
      'ZONE_NAME_TAKEN'
    )
    expect(scanZoneErrorCode(conflict('the tenant already has a default scan zone'))).toBe(
      'DEFAULT_ZONE_EXISTS'
    )
    expect(
      scanZoneErrorCode(conflict('2 scan(s) are pinned to this scan zone; switch them first'))
    ).toBe('ZONE_IN_USE')
    expect(scanZoneErrorCode(new ApiClientError('x', 'ZONE_IN_USE', 409))).toBe('ZONE_IN_USE')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Sensor, SensorContent } from '@/lib/api/sensor-types'

const perms = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/lib/permissions', () => ({
  Permission: { SensorsWrite: 'sensors:write' },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
const api = vi.hoisted(() => ({
  refreshSensorContent: vi.fn(),
  refreshFleetContent: vi.fn(),
}))
vi.mock('@/lib/api/sensor-content-hooks', () => api)
const toasts = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toasts }))

import { SensorContentSection } from '../sensor-content-section'
import {
  FleetContentRefreshButton,
  SensorContentCell,
  contentRefreshTargets,
} from '../sensor-content-cells'

const NOW = new Date('2026-10-05T00:00:00Z').getTime()

const trivy: SensorContent = {
  tool: 'trivy',
  name: 'trivy-db',
  version: '2026-10-02T01:05:41Z',
  updated_at: '2026-10-02T01:05:41Z',
  source: 'mirror.gcr.io/aquasec/trivy-db:2',
  digest: 'sha256:3b169afdc4a0862bcd1dd493d9fedb5ba26be377f9d541cb3fdde9e2bebadfab',
  managed: true,
  stale: true,
  age_seconds: 3 * 86400,
  max_age_hours: 48,
}
const nuclei: SensorContent = {
  tool: 'nuclei',
  name: 'nuclei-templates',
  version: 'v10.4.9',
  managed: true,
  stale: false,
  pinned_version: 'v10.4.9',
}
const semgrep: SensorContent = {
  tool: 'semgrep',
  name: 'semgrep-rules',
  version: '',
  managed: false,
  stale: false,
  source: 'semgrep registry (fetched per scan, --config auto)',
}

function sensorWith(over: Partial<Sensor> = {}) {
  return {
    id: 's1',
    name: 'k8s-scanner-a',
    status: 'active',
    content: [trivy, nuclei, semgrep],
    content_refresh_supported: true,
    ...over,
  } as Sensor
}

beforeEach(() => {
  perms.granted = new Set()
  vi.clearAllMocks()
})

describe('SensorContentSection', () => {
  it('lists each content item with its state, version, age, pin, digest and source', () => {
    render(<SensorContentSection sensor={sensorWith()} now={NOW} canManage={false} />)
    const rows = document.querySelectorAll('[data-content]')
    expect(
      [...rows].map((r) => [r.getAttribute('data-content'), r.getAttribute('data-state')])
    ).toEqual([
      ['trivy-db', 'stale'],
      ['nuclei-templates', 'fresh'],
      ['semgrep-rules', 'unmanaged'],
    ])
    expect(screen.getByText('Trivy vulnerability DB')).toBeInTheDocument()
    expect(screen.getByText('3d old · limit 2d')).toBeInTheDocument()
    expect(screen.getByText('sha256:3b169afdc4a0')).toBeInTheDocument()
    expect(screen.getByText('mirror.gcr.io/aquasec/trivy-db:2')).toBeInTheDocument()
    expect(screen.getByText(/not controlled/)).toBeInTheDocument()
  })

  it('shows when the sensor last checked for a newer version', () => {
    render(
      <SensorContentSection
        sensor={sensorWith({
          content: [{ ...nuclei, checked_at: new Date(NOW - 2 * 3600 * 1000).toISOString() }],
        })}
        now={NOW}
        canManage={false}
      />
    )
    expect(screen.getByText('checked 2h ago')).toBeInTheDocument()
  })

  it('keeps the API stale flag even when a recent check is reported', () => {
    render(
      <SensorContentSection
        sensor={sensorWith({ content: [{ ...trivy, checked_at: new Date(NOW).toISOString() }] })}
        now={NOW}
        canManage={false}
      />
    )
    expect(document.querySelector('[data-content="trivy-db"]')).toHaveAttribute(
      'data-state',
      'stale'
    )
    expect(screen.getByText('checked just now')).toBeInTheDocument()
  })

  it('shows the last refresh error', () => {
    render(
      <SensorContentSection
        sensor={sensorWith({
          content: [{ ...trivy, stale: false, error: 'registry unreachable' }],
        })}
        now={NOW}
        canManage={false}
      />
    )
    expect(screen.getByText('Refresh failed')).toBeInTheDocument()
    expect(screen.getByText('registry unreachable')).toBeInTheDocument()
  })

  it('says the refresh failed in plain words; the error, without URL tokens, is under Details', () => {
    render(
      <SensorContentSection
        sensor={sensorWith({
          content: [
            {
              ...nuclei,
              version: '',
              error: 'resolve: Get "https://release-assets.example.com/asset/1?sig=SECRET&se=2026"',
            },
          ],
        })}
        now={NOW}
        canManage={false}
      />
    )
    const row = document.querySelector('[data-content="nuclei-templates"]') as HTMLElement
    expect(row.querySelector('p.text-destructive')?.textContent).toBe('Last refresh failed')
    const details = row.querySelector('details') as HTMLElement
    expect(details.textContent).toContain('https://release-assets.example.com/asset/1?…')
    expect(row.textContent).not.toContain('SECRET')
  })

  it('renders nothing without reported content', () => {
    const { container } = render(
      <SensorContentSection sensor={sensorWith({ content: [] })} now={NOW} canManage />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('hides Refresh content without sensors:write', () => {
    render(<SensorContentSection sensor={sensorWith()} now={NOW} canManage={false} />)
    expect(screen.queryByRole('button', { name: /refresh content/i })).toBeNull()
  })

  it('disables Refresh content when the sensor cannot refresh', () => {
    render(
      <SensorContentSection
        sensor={sensorWith({ content_refresh_supported: false })}
        now={NOW}
        canManage
      />
    )
    expect(screen.getByRole('button', { name: /refresh content/i })).toBeDisabled()
  })

  it('requests a refresh and reports an already queued one', async () => {
    api.refreshSensorContent.mockResolvedValueOnce({ command_id: 'c1', already_pending: false })
    api.refreshSensorContent.mockResolvedValueOnce({ command_id: 'c1', already_pending: true })
    render(<SensorContentSection sensor={sensorWith()} now={NOW} canManage />)
    const btn = screen.getByRole('button', { name: /refresh content/i })
    await userEvent.click(btn)
    await waitFor(() => expect(toasts.success).toHaveBeenCalled())
    expect(api.refreshSensorContent).toHaveBeenCalledWith('s1')
    await userEvent.click(btn)
    await waitFor(() => expect(toasts.info).toHaveBeenCalled())
  })

  it('explains a 409 (the sensor manages no content)', async () => {
    api.refreshSensorContent.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), { statusCode: 409 })
    )
    render(<SensorContentSection sensor={sensorWith()} now={NOW} canManage />)
    await userEvent.click(screen.getByRole('button', { name: /refresh content/i }))
    await waitFor(() =>
      expect(toasts.error).toHaveBeenCalledWith(expect.stringContaining('does not manage any'))
    )
  })
})

describe('SensorContentCell', () => {
  it('shows the worst state, or a dash', () => {
    const { rerender } = render(<SensorContentCell sensor={sensorWith()} now={NOW} />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
    rerender(<SensorContentCell sensor={sensorWith({ content: [nuclei] })} now={NOW} />)
    expect(screen.getByText('Up to date')).toBeInTheDocument()
    rerender(<SensorContentCell sensor={sensorWith({ content: undefined })} now={NOW} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('FleetContentRefreshButton', () => {
  const fleet = [
    sensorWith(),
    sensorWith({ id: 's2', content_refresh_supported: false }),
    sensorWith({ id: 's3', status: 'disabled' }),
    sensorWith({ id: 's4' }),
  ]

  it('targets active sensors that can refresh', () => {
    expect(contentRefreshTargets(fleet).map((s) => s.id)).toEqual(['s1', 's4'])
  })

  it('is hidden without sensors:write or without targets', () => {
    const { container, rerender } = render(<FleetContentRefreshButton sensors={fleet} />)
    expect(container).toBeEmptyDOMElement()
    perms.granted.add('sensors:write')
    rerender(<FleetContentRefreshButton sensors={[fleet[1]]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('confirms with the count, then asks the fleet', async () => {
    perms.granted.add('sensors:write')
    api.refreshFleetContent.mockResolvedValueOnce({ commands_created: 2, skipped: 1 })
    const onDone = vi.fn()
    render(<FleetContentRefreshButton sensors={fleet} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: /refresh content/i }))
    expect(screen.getByText(/^2 sensors will download/)).toBeInTheDocument()
    const confirm = screen.getAllByRole('button', { name: /refresh content/i }).at(-1)!
    await userEvent.click(confirm)
    await waitFor(() => expect(api.refreshFleetContent).toHaveBeenCalled())
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('2 sensors (1 skipped'))
    expect(onDone).toHaveBeenCalled()
  })
})

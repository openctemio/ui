import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Sensor, SensorManifestVersion } from '@/lib/api/sensor-types'

const manifests = vi.hoisted(() => ({
  value: {
    data: undefined as { items: SensorManifestVersion[] } | undefined,
    error: undefined as unknown,
    isLoading: false,
  },
}))
vi.mock('@/lib/api/sensor-hooks', () => ({
  useSensorManifests: () => ({ ...manifests.value, mutate: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

import { SensorManifestTab } from '../sensor-manifest-tab'

const sensor = { id: 's1', name: 'scanner' } as Sensor
const at = new Date(Date.now() - 3600_000).toISOString()

function version(digest: string, nucleiVersion: string, current: boolean): SensorManifestVersion {
  return {
    digest,
    source: 'sensor',
    current,
    manifest: {
      schema: 1,
      sensor: { name: 'openctemio-sensor', version: '0.6.4' },
      sdk: { name: 'openctem-sdk-go', version: '0.15.0' },
      platform: { os: 'linux', arch: 'amd64' },
      resources: { cpu_cores: 4, mem_total_bytes: 8 * 1024 ** 3 },
      concurrency: { ceiling: 0, model: 'dynamic' },
      capabilities: ['validate'],
      tools: [
        {
          name: 'nuclei',
          kind: 'scanner',
          version: nucleiVersion,
          installed: true,
          capabilities: ['dast', 'validate:nuclei'],
          content: [{ name: 'nuclei-templates', version: 'v10.4.9', managed: true }],
        },
      ],
    },
    ignored: current ? [{ path: 'tools[1]', value: 'zap2', reason: 'unknown-tool' }] : [],
    first_seen_at: at,
    current_since: at,
    last_seen_at: at,
  }
}

describe('SensorManifestTab', () => {
  it('shows the current manifest, what was ignored and the history with its diff', async () => {
    const items = [
      version(`sha256:${'b'.repeat(64)}`, 'v3.12.0', true),
      version(`sha256:${'a'.repeat(64)}`, 'v3.11.1', false),
    ]
    manifests.value = { data: { items }, error: undefined, isLoading: false }
    render(<SensorManifestTab sensor={sensor} now={Date.now()} />)

    expect(screen.getByText('registered by the sensor · current since 1h ago')).toBeInTheDocument()
    expect(screen.getByText(/^4 CPU cores · .+ memory$/)).toBeInTheDocument()
    expect(
      screen.getByText('no operator cap · slots sized from CPU and memory')
    ).toBeInTheDocument()
    const tools = screen.getByRole('list', { name: 'Manifest tools' })
    expect(within(tools).getByLabelText('nuclei capabilities')).toHaveTextContent(
      'dastvalidate:nuclei'
    )
    expect(within(tools).getByText('nuclei-templates v10.4.9')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('"zap2": not in the tool catalog')

    const history = screen.getByRole('list', { name: 'Manifest versions' })
    expect(within(history).getByText('nuclei v3.11.1 → v3.12.0')).toBeInTheDocument()
    expect(within(history).getByText('First version kept.')).toBeInTheDocument()
    expect(within(history).getByText('current')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /Copy manifest digest/ })[0])
  })

  it('says when there is no manifest yet', () => {
    manifests.value = { data: { items: [] }, error: undefined, isLoading: false }
    render(<SensorManifestTab sensor={sensor} now={Date.now()} />)
    expect(screen.getByText(/No manifest yet/)).toBeInTheDocument()
  })

  it('shows a load error in place', () => {
    manifests.value = { data: undefined, error: new Error('boom'), isLoading: false }
    render(<SensorManifestTab sensor={sensor} now={Date.now()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('The manifest could not be loaded.')
  })
})

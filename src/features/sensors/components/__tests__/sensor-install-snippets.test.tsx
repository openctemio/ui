import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { availableFormats, SensorInstallSnippets } from '../sensor-install-snippets'
import { TEST_SENSOR_KEY } from '@/test/sensor-keys'

const templates = {
  docker: `docker run -d --name dmz \\\n  -e API_KEY='${TEST_SENSOR_KEY}' \\\n  ghcr.io/openctemio/sensor:v0.4.2\n`,
  compose: 'services:\n  sensor:\n    image: ghcr.io/openctemio/sensor:v0.4.2\n',
  kubernetes: 'apiVersion: v1\nkind: Secret\n',
  helm: 'helm upgrade openctem openctem/openctem --reuse-values \\\n  --set sensor.enabled=true\n',
  yaml: 'sensor:\n  name: dmz\n',
  env: "export API_URL='https://x'\n",
  cli: './openctemio-sensor -daemon\n',
  image: 'ghcr.io/openctemio/sensor:v0.4.2',
  api_url: 'https://192.168.8.204',
  api_key_included: true,
  ca_certificate: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n',
  ca_fingerprint_sha256: 'AA:BB',
}

function mockFetch(body: unknown, ok = true) {
  const fn = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }))
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('availableFormats', () => {
  it('lists the formats the API rendered, in order (older APIs send four)', () => {
    expect(availableFormats(templates)).toEqual([
      'docker',
      'compose',
      'kubernetes',
      'helm',
      'yaml',
      'env',
      'cli',
    ])
    expect(availableFormats({ docker: 'x', yaml: 'y', env: '', cli: 'c' })).toEqual([
      'docker',
      'yaml',
      'cli',
    ])
  })
})

describe('SensorInstallSnippets', () => {
  it('sends a just-issued key in a header (never the URL) and renders the commands', async () => {
    const fetchFn = mockFetch(templates)
    render(
      <SensorInstallSnippets
        sensorId="11111111-1111-4111-8111-111111111111"
        apiKey={TEST_SENSOR_KEY}
      />
    )
    await screen.findByText(/docker run -d --name dmz/)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/sensors/11111111-1111-4111-8111-111111111111/config-templates')
    expect(url).not.toContain(TEST_SENSOR_KEY)
    expect((init.headers as Record<string, string>)['X-Sensor-API-Key']).toBe(TEST_SENSOR_KEY)
    expect(init.cache).toBe('no-store')
    expect(
      screen.getByText('ghcr.io/openctemio/sensor:v0.4.2', { selector: 'span' })
    ).toBeInTheDocument()
    for (const tab of [
      'docker run',
      'Compose',
      'Kubernetes',
      'Helm',
      'Config file',
      'Env',
      'Binary',
    ]) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument()
    }
  })

  it('switches format and explains the private CA with its fingerprint', async () => {
    mockFetch(templates)
    render(<SensorInstallSnippets sensorId="s1" />)
    await screen.findByRole('tab', { name: 'Compose' })
    await userEvent.click(screen.getByRole('tab', { name: 'Compose' }))
    await waitFor(() => expect(screen.getByText(/services:/)).toBeInTheDocument())
    expect(screen.getByText(/private certificate authority/)).toBeInTheDocument()
    expect(screen.getByText('AA:BB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download CA certificate/ })).toBeInTheDocument()
  })

  it('no CA note when the platform certificate is public; an error state on failure', async () => {
    mockFetch({ ...templates, ca_certificate: '', ca_fingerprint_sha256: '' })
    const { unmount } = render(<SensorInstallSnippets sensorId="s1" />)
    await screen.findByRole('tab', { name: 'docker run' })
    expect(screen.queryByText(/private certificate authority/)).toBeNull()
    unmount()
    mockFetch({}, false)
    render(<SensorInstallSnippets sensorId="s2" />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

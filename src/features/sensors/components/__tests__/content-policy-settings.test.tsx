import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { ContentPolicyResponse } from '@/lib/api/sensor-types'

const perms = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/lib/permissions', () => ({
  Permission: { SensorsWrite: 'sensors:write' },
  useHasPermission: (p: string) => perms.granted.has(p),
}))
const api = vi.hoisted(() => ({
  data: undefined as ContentPolicyResponse | undefined,
  mutate: vi.fn(),
  updateContentPolicy: vi.fn(),
}))
vi.mock('@/lib/api/sensor-content-hooks', () => ({
  useContentPolicy: () => ({
    data: api.data,
    error: undefined,
    isLoading: false,
    mutate: api.mutate,
  }),
  updateContentPolicy: api.updateContentPolicy,
}))
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toasts }))

import { ContentPolicySettings } from '../content-policy-settings'

// Radix Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const response: ContentPolicyResponse = {
  policy: {
    refresh_interval_hours: 12,
    content: { 'nuclei-templates': { max_age_hours: 168, version: 'v10.4.9' } },
  },
  defaults: {
    refresh_interval_hours: 6,
    content: {
      'trivy-db': { max_age_hours: 48 },
      'trivy-java-db': { max_age_hours: 168 },
      'nuclei-templates': { max_age_hours: 168 },
      'semgrep-rules': { max_age_hours: 168 },
    },
  },
  updated_at: null,
  updated_by: null,
}

beforeEach(() => {
  perms.granted = new Set()
  api.data = response
  vi.clearAllMocks()
})

describe('ContentPolicySettings', () => {
  it('shows the policy with defaults as placeholders', () => {
    render(<ContentPolicySettings />)
    expect(screen.getByLabelText('Check every (hours)')).toHaveValue('12')
    expect(document.querySelector('#trivy-db-max-age')).toHaveAttribute(
      'placeholder',
      '48 (2 days)'
    )
    expect(document.querySelector('#nuclei-templates-version')).toHaveValue('v10.4.9')
    expect(screen.getByText(/configured on each sensor host/)).toBeInTheDocument()
  })

  it('is read-only without sensors:write', () => {
    render(<ContentPolicySettings />)
    expect(screen.getByLabelText('Check every (hours)')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull()
    expect(screen.getByText(/needs an admin/)).toBeInTheDocument()
  })

  it('saves the policy and applies it now', async () => {
    perms.granted.add('sensors:write')
    api.updateContentPolicy.mockResolvedValueOnce({
      policy: response.policy,
      commands_created: 3,
      skipped: 0,
    })
    render(<ContentPolicySettings />)
    const max = document.querySelector('#trivy-db-max-age') as HTMLInputElement
    await userEvent.type(max, '72')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(api.updateContentPolicy).toHaveBeenCalled())
    expect(api.updateContentPolicy).toHaveBeenCalledWith({
      policy: {
        refresh_interval_hours: 12,
        content: {
          'trivy-db': { max_age_hours: 72 },
          'nuclei-templates': { max_age_hours: 168, version: 'v10.4.9' },
        },
      },
      apply_now: true,
    })
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('3 sensors'))
  })

  it('does not save an invalid pin', async () => {
    perms.granted.add('sensors:write')
    render(<ContentPolicySettings />)
    await userEvent.type(document.querySelector('#trivy-db-version') as HTMLInputElement, 'latest')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/sha256: and 64/)).toBeInTheDocument()
    expect(api.updateContentPolicy).not.toHaveBeenCalled()
  })
})

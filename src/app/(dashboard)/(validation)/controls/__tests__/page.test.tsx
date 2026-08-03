import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompensatingControlsPage from '../page'

const mockSWRData = {
  data: undefined as unknown,
  isLoading: false,
}

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockSWRData.data,
    isLoading: mockSWRData.isLoading,
    mutate: vi.fn(),
  })),
}))

const mockPost = vi.fn()
vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: (...args: unknown[]) => mockPost(...args),
  del: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/lib/api/error-handler', () => ({
  getErrorMessage: vi.fn((_error, fallback) => fallback || 'Error'),
}))

// Render permission gates open so the write actions are present.
vi.mock('@/lib/permissions', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  Permission: { CompensatingControlsWrite: 'ctem:compensating_controls:write' },
}))

// The link dialog pulls in the assets SWR stack; it has its own surface and is
// not what these tests are about.
vi.mock('@/features/controls/components/link-assets-dialog', () => ({
  LinkAssetsDialog: () => null,
}))

/**
 * The vocabulary the database actually accepts, copied from the CHECK
 * constraint in api/migrations/000146_compensating_controls.up.sql.
 */
const BACKEND_CONTROL_TYPES = ['segmentation', 'identity', 'runtime', 'detection', 'other']

describe('CompensatingControlsPage — create payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSWRData.data = { data: [], total: 0, page: 1, per_page: 100 }
    mockSWRData.isLoading = false
  })

  /**
   * The regression guard. Every create used to fail because the form sent
   * control_type='compensating' (rejected outright by the CHECK constraint)
   * and reduction_factor=20 (20x the 0..1 ceiling). This asserts the body the
   * form actually puts on the wire satisfies both constraints.
   */
  it('sends a control_type the backend accepts and a 0-1 reduction factor', async () => {
    const user = userEvent.setup()
    render(<CompensatingControlsPage />)

    await user.click(screen.getByRole('button', { name: /new control/i }))
    await user.type(screen.getByLabelText(/name/i), 'WAF Rate Limiting')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(mockPost).toHaveBeenCalledTimes(1)
    const [endpoint, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>]

    expect(endpoint).toBe('/api/v1/compensating-controls')

    // CHECK (control_type IN ('segmentation','identity','runtime','detection','other'))
    expect(BACKEND_CONTROL_TYPES).toContain(body.control_type)

    // CHECK (reduction_factor >= 0 AND reduction_factor <= 1), and > 0 or the
    // control is a silent no-op. Also DECIMAL(3,2) — at most 2 decimals.
    const factor = body.reduction_factor as number
    expect(factor).toBeGreaterThan(0)
    expect(factor).toBeLessThanOrEqual(1)
    expect(Number(factor.toFixed(2))).toBe(factor)

    // The default 20% must go out as the fraction 0.2, not as 20.
    expect(factor).toBe(0.2)
  })

  it('never offers a control type the backend rejects', async () => {
    const user = userEvent.setup()
    render(<CompensatingControlsPage />)
    await user.click(screen.getByRole('button', { name: /new control/i }))

    // The dropdown's current value is what an unmodified create submits.
    const trigger = screen.getByRole('combobox')
    const shown = (trigger.textContent || '').trim().toLowerCase()

    expect(shown.length).toBeGreaterThan(0)
    expect(BACKEND_CONTROL_TYPES).toContain(shown)
    for (const rejected of ['preventive', 'detective', 'corrective', 'compensating']) {
      expect(shown).not.toBe(rejected)
    }
  })

  it('refuses a 0% reduction instead of creating a control that does nothing', async () => {
    const user = userEvent.setup()
    render(<CompensatingControlsPage />)

    await user.click(screen.getByRole('button', { name: /new control/i }))
    await user.type(screen.getByLabelText(/name/i), 'No-op control')

    const percentInput = screen.getByLabelText(/risk reduction/i)
    await user.clear(percentInput)
    await user.type(percentInput, '0')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(mockPost).not.toHaveBeenCalled()
  })
})

describe('CompensatingControlsPage — display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSWRData.isLoading = false
  })

  it('renders a stored 0-1 factor as a percentage', () => {
    mockSWRData.data = {
      data: [
        {
          id: 'c1',
          name: 'WAF Rate Limiting',
          description: '',
          control_type: 'runtime',
          status: 'active',
          reduction_factor: 0.3,
          last_tested_at: null,
          test_result: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 100,
    }

    render(<CompensatingControlsPage />)

    // Read and write must agree: 0.3 stored -> "30%" shown, not "0.3%".
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.queryByText('0.3%')).not.toBeInTheDocument()
  })
})

describe('CompensatingControlsPage — record test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSWRData.isLoading = false
    mockSWRData.data = {
      data: [
        {
          id: 'c1',
          name: 'WAF Rate Limiting',
          description: '',
          control_type: 'runtime',
          status: 'active',
          reduction_factor: 0.3,
          last_tested_at: null,
          test_result: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 100,
    }
  })

  /** The route is POST /{id}/test; the page used to send PATCH and got a 405. */
  it('records a test result with POST, not PATCH', async () => {
    const user = userEvent.setup()
    render(<CompensatingControlsPage />)

    await user.click(screen.getByRole('button', { name: /^test$/i }))
    await user.click(screen.getByRole('button', { name: /^record$/i }))

    expect(mockPost).toHaveBeenCalledWith('/api/v1/compensating-controls/c1/test', {
      test_result: 'pass',
    })
  })
})

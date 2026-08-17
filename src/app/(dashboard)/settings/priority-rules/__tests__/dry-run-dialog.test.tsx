import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { DryRunDialog, type DryRunRule, type DryRunResult } from '../dry-run-dialog'

// ── mocks ──────────────────────────────────────────────────

const mockPost = vi.fn()
vi.mock('@/lib/api/client', () => ({
  post: (url: string, body: unknown) => mockPost(url, body),
}))

// Radix Tooltip needs a provider ancestor; flatten it so PriorityClassBadge
// renders its label directly (matches the repo's other badge tests).
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

// ── fixtures ───────────────────────────────────────────────

const rule: DryRunRule = {
  name: 'KEV on crown jewel',
  priority_class: 'P0',
  conditions: [
    { field: 'is_in_kev', operator: 'eq', value: true },
    { field: 'severity', operator: 'eq', value: 'critical' },
  ],
}

function result(overrides: Partial<DryRunResult> = {}): DryRunResult {
  return {
    evaluated: 340,
    matched: 12,
    capped: false,
    cap: 50,
    sample: [
      {
        finding_id: 'f1',
        title: 'OpenSSL heap overflow',
        severity: 'critical',
        current_class: 'P2',
        would_be_class: 'P0',
      },
    ],
    would_be_distribution: { P0: 12, P1: 0, P2: 0, P3: 0 },
    ...overrides,
  }
}

describe('DryRunDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('POSTs the current conditions + priority_class to the dry-run endpoint', async () => {
    mockPost.mockResolvedValue(result())
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1))
    expect(mockPost).toHaveBeenCalledWith('/api/v1/priority-rules/dry-run', {
      conditions: rule.conditions,
      priority_class: 'P0',
    })
  })

  test('renders the exact matched / evaluated counts from the engine', async () => {
    mockPost.mockResolvedValue(result({ matched: 7, evaluated: 340 }))
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    // Matched count (7) is the prominent number in the impact block.
    expect(await screen.findByText('7')).toBeInTheDocument()
    // "of 340 findings would be reclassified…" — copy is split across nodes.
    expect(screen.getByText(/of/)).toHaveTextContent('340')
  })

  test('shows a "showing first N of M (capped)" note when the sample is capped', async () => {
    mockPost.mockResolvedValue(
      result({
        matched: 200,
        capped: true,
        cap: 50,
        sample: Array.from({ length: 50 }, (_, i) => ({
          finding_id: `f${i}`,
          title: `Finding ${i}`,
          severity: 'high',
          current_class: 'P2' as const,
          would_be_class: 'P0' as const,
        })),
      })
    )
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    const note = await screen.findByText(/Showing first/)
    expect(note).toHaveTextContent('50')
    expect(note).toHaveTextContent('200')
    expect(note).toHaveTextContent(/capped/i)
  })

  test('renders sample rows with title, severity and current→would-be classes', async () => {
    mockPost.mockResolvedValue(result())
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    expect(await screen.findByText('OpenSSL heap overflow')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    // Both the current (P2) and would-be (P0) class labels are present.
    expect(screen.getAllByText('P2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('P0').length).toBeGreaterThan(0)
  })

  test('shows an informative empty state when nothing was evaluated', async () => {
    mockPost.mockResolvedValue(
      result({ evaluated: 0, matched: 0, sample: [], would_be_distribution: {} })
    )
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    expect(await screen.findByText('No findings to evaluate')).toBeInTheDocument()
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  test('shows "no findings match" when evaluated > 0 but matched === 0', async () => {
    mockPost.mockResolvedValue(
      result({ matched: 0, sample: [], would_be_distribution: { P0: 0, P1: 0, P2: 0, P3: 0 } })
    )
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    expect(await screen.findByText(/No findings match this rule/)).toBeInTheDocument()
  })

  test('shows a graceful error message when the endpoint fails (does not crash)', async () => {
    mockPost.mockRejectedValue(new Error('boom'))
    render(<DryRunDialog open onOpenChange={() => {}} rule={rule} />)

    expect(await screen.findByText('Could not evaluate the rule')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  test('does not call the endpoint while closed', () => {
    mockPost.mockResolvedValue(result())
    render(<DryRunDialog open={false} onOpenChange={() => {}} rule={rule} />)
    expect(mockPost).not.toHaveBeenCalled()
  })

  test('renders nothing when there is no rule', () => {
    const { container } = render(<DryRunDialog open onOpenChange={() => {}} rule={null} />)
    expect(container).toBeEmptyDOMElement()
    expect(mockPost).not.toHaveBeenCalled()
  })
})

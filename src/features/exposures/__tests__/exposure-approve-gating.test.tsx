import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  APPROVE_REQUIRED_REASON,
  ExposureBulkActions,
  ExposureQuickActions,
} from '../components/exposure-state-actions'
import type { ExposureEvent } from '@/lib/api/exposure-types'

// api#675: accepting a risk and marking a false positive need findings:approve
// (resolve and reactivate keep findings:write). Members do not hold it.
let canApprove = false
vi.mock('@/lib/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/permissions')>()),
  useHasPermission: (p: string) => (p === 'findings:approve' ? canApprove : true),
}))
vi.mock('../hooks/use-exposures', () => ({
  resolveExposure: vi.fn(),
  acceptExposure: vi.fn(),
  markExposureFalsePositive: vi.fn(),
  reactivateExposure: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const exposure = { id: 'e1', state: 'active', title: 'Open port' } as unknown as ExposureEvent

describe('exposure approval gating', () => {
  beforeEach(() => {
    canApprove = false
  })

  it('quick actions: Accept and False positive are disabled with the reason without findings:approve', () => {
    render(<ExposureQuickActions exposure={exposure} />)
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'False positive' })).toBeDisabled()
    expect(screen.getAllByLabelText(APPROVE_REQUIRED_REASON).length).toBe(2)
  })

  it('quick actions: enabled with findings:approve', () => {
    canApprove = true
    render(<ExposureQuickActions exposure={exposure} />)
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'False positive' })).toBeEnabled()
  })

  it('bulk bar: Accept risk and False positive are disabled without findings:approve', async () => {
    render(
      <ExposureBulkActions
        selectedIds={['e1', 'e2']}
        onClearSelection={vi.fn()}
        onBulkResolve={vi.fn()}
        onBulkAccept={vi.fn()}
        onBulkFalsePositive={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /resolve/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /accept risk/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /false positive/i })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: /resolve/i }))
  })
})

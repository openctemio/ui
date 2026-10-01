import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createTargetMapping,
  targetMappingListPath,
  updateTargetMapping,
  useExistingTargetMapping,
  useTargetMappingStats,
  useTargetMappings,
} from '../api/use-target-mappings'
import { AdminApiError } from '../api/admin-client'
import { useAdmin } from '../components/admin-console-shell'
import { TargetMappingDialog } from '../components/target-mapping-dialog'
import { validateTargetMappingForm } from '../lib/target-mappings'
import type { AdminRole, TargetMapping } from '../types'
import TargetMappingsPage from '@/app/(admin-console)/admin/(console)/scanning/target-mappings/page'

vi.mock('../api/use-target-mappings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/use-target-mappings')>()
  return {
    targetMappingListPath: actual.targetMappingListPath,
    createTargetMapping: vi.fn(),
    updateTargetMapping: vi.fn(),
    deleteTargetMapping: vi.fn(),
    useExistingTargetMapping: vi.fn(),
    useTargetMappings: vi.fn(),
    useTargetMappingStats: vi.fn(),
  }
})
vi.mock('../components/admin-console-shell', () => ({ useAdmin: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const MAPPING: TargetMapping = {
  id: 'm1',
  target_type: 'url',
  asset_type: 'website',
  priority: 10,
  is_active: true,
  is_primary: true,
  description: 'Primary URL mapping',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

describe('validateTargetMappingForm', () => {
  it.each([
    ['1', undefined],
    ['1000', undefined],
    ['100', undefined],
    ['0', 'Between 1 and 1000'],
    ['1001', 'Between 1 and 1000'],
    ['-3', 'Between 1 and 1000'],
    ['2.5', 'Enter a whole number'],
    ['', 'Enter a whole number'],
    ['abc', 'Enter a whole number'],
  ])('priority %s', (priority, expected) => {
    expect(validateTargetMappingForm({ priority, description: '' }).priority).toBe(expected)
  })

  it('limits the description to 500 characters', () => {
    expect(
      validateTargetMappingForm({ priority: '10', description: 'a'.repeat(500) }).description
    ).toBeUndefined()
    expect(
      validateTargetMappingForm({ priority: '10', description: 'a'.repeat(501) }).description
    ).toBe('At most 500 characters')
  })
})

describe('targetMappingListPath', () => {
  it('maps the filters onto the API query', () => {
    expect(
      targetMappingListPath({ targetType: 'url', status: 'inactive', page: 2, perPage: 20 })
    ).toBe('/target-mappings?page=2&per_page=20&target_type=url&is_active=false')
    expect(targetMappingListPath({ assetType: 'host', status: 'active' })).toBe(
      '/target-mappings?page=1&per_page=50&asset_type=host&is_active=true'
    )
    expect(targetMappingListPath({})).toBe('/target-mappings?page=1&per_page=50')
  })
})

describe('TargetMappingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useExistingTargetMapping).mockReturnValue(undefined)
  })

  it('flags a pair that already exists and does not submit', async () => {
    vi.mocked(useExistingTargetMapping).mockReturnValue(MAPPING)
    const user = userEvent.setup()
    render(
      <TargetMappingDialog open onOpenChange={() => {}} defaultTargetType="url" onSaved={vi.fn()} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/already mapped to Website/)
    const submit = screen.getByRole('button', { name: 'Create mapping' })
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(createTargetMapping).not.toHaveBeenCalled()
  })

  it('refuses an out-of-range priority before calling the API', async () => {
    const user = userEvent.setup()
    render(
      <TargetMappingDialog open onOpenChange={() => {}} defaultTargetType="url" onSaved={vi.fn()} />
    )
    const priority = screen.getByLabelText('Priority')
    await user.clear(priority)
    await user.type(priority, '0')
    expect(screen.getByText('Between 1 and 1000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create mapping' }))
    expect(createTargetMapping).not.toHaveBeenCalled()
  })

  it('edits without resending an unchanged priority, and the primary switch sets 10', async () => {
    vi.mocked(updateTargetMapping).mockResolvedValue({ ...MAPPING, description: 'Edited' })
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    // A legacy priority outside today's bounds must not block an unrelated edit.
    render(
      <TargetMappingDialog
        open
        onOpenChange={onOpenChange}
        mapping={{ ...MAPPING, priority: 5000, is_primary: false }}
        onSaved={onSaved}
      />
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument() // the pair is read-only
    const description = screen.getByLabelText('Description (optional)')
    await user.clear(description)
    await user.type(description, 'Edited')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(updateTargetMapping).toHaveBeenCalledWith('m1', {
        is_active: true,
        description: 'Edited',
      })
    )
    expect(onSaved).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await user.click(screen.getByLabelText('Primary mapping'))
    expect(screen.getByLabelText('Priority')).toHaveValue(10)
  })

  it('explains a conflict reported by the API', async () => {
    vi.mocked(updateTargetMapping).mockRejectedValue(new AdminApiError('conflict', 409))
    const user = userEvent.setup()
    render(<TargetMappingDialog open onOpenChange={() => {}} mapping={MAPPING} onSaved={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This target type is already mapped to this asset type.'
    )
  })
})

describe('TargetMappingsPage', () => {
  const asRole = (role: AdminRole) =>
    vi.mocked(useAdmin).mockReturnValue({ id: 'a1', email: 'a@x.test', name: 'A', role })

  const listOf = (data: TargetMapping[]) =>
    vi.mocked(useTargetMappings).mockReturnValue({
      data: { data, total: data.length, page: 1, per_page: 50, total_pages: 1 },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTargetMappings>)

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/admin/scanning/target-mappings')
    vi.mocked(useTargetMappingStats).mockReturnValue({
      data: {
        total: 1,
        by_target_type: { url: 1 },
        by_asset_type: { website: 1 },
        active_count: 1,
        inactive_count: 0,
      },
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTargetMappingStats>)
    listOf([MAPPING])
  })

  async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('Primary URL'))!
    const buttons = row.querySelectorAll('button')
    await user.click(buttons[buttons.length - 1])
  }

  it('shows a read-only admin no write controls', () => {
    asRole('readonly')
    render(<TargetMappingsPage />)
    expect(screen.getAllByText('Primary URL mapping').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /new mapping/i })).not.toBeInTheDocument()
    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('Primary URL'))!
    expect(row.querySelectorAll('button')).toHaveLength(0)
  })

  it('lets an ops admin edit and deactivate but not delete', async () => {
    asRole('ops_admin')
    const user = userEvent.setup()
    render(<TargetMappingsPage />)
    expect(screen.getByRole('button', { name: /new mapping/i })).toBeInTheDocument()
    await openRowMenu(user)
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Deactivate' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('offers delete to a super admin', async () => {
    asRole('super_admin')
    const user = userEvent.setup()
    render(<TargetMappingsPage />)
    await openRowMenu(user)
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('explains what an empty installation means', () => {
    asRole('super_admin')
    listOf([])
    render(<TargetMappingsPage />)
    expect(screen.getByText('No target mappings')).toBeInTheDocument()
    expect(screen.getByText(/scans skip every asset/i)).toBeInTheDocument()
  })
})

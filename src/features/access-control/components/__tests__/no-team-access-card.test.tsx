import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoTeamAccessCard } from '../no-team-access-card'

const mockUpdate = vi.fn()
const mockMutate = vi.fn()
let mockPolicy: 'everything' | 'nothing' | undefined = 'everything'
let mockIsAdmin = true

vi.mock('@/features/organization/api/use-data-scope-policy', () => ({
  useDataScopePolicy: () => ({
    policy: mockPolicy,
    isLoading: false,
    isError: false,
    mutate: mockMutate,
  }),
  useUpdateDataScopePolicy: () => ({ updatePolicy: mockUpdate, isUpdating: false }),
}))
vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1' } }),
}))
vi.mock('@/lib/permissions', () => ({
  usePermissions: () => ({ isAdmin: () => mockIsAdmin }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('NoTeamAccessCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPolicy = 'everything'
    mockIsAdmin = true
  })

  it('is hidden from members who are not owner or admin', () => {
    mockIsAdmin = false
    const { container } = render(<NoTeamAccessCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the current policy', () => {
    render(<NoTeamAccessCard />)
    expect(screen.getByText('Members without a team')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Everything' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Nothing' })).not.toBeChecked()
  })

  it('asks before hiding data, and saves only on confirm', async () => {
    mockUpdate.mockResolvedValueOnce({ members_without_group_see: 'nothing' })
    render(<NoTeamAccessCard />)

    await userEvent.click(screen.getByRole('radio', { name: 'Nothing' }))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Hide data from members without a team?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hide data' }))
    expect(mockUpdate).toHaveBeenCalledWith('nothing')
  })

  it('cancelling the confirmation changes nothing', async () => {
    render(<NoTeamAccessCard />)
    await userEvent.click(screen.getByRole('radio', { name: 'Nothing' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('switching back to everything saves without a confirmation', async () => {
    mockPolicy = 'nothing'
    mockUpdate.mockResolvedValueOnce({ members_without_group_see: 'everything' })
    render(<NoTeamAccessCard />)
    await userEvent.click(screen.getByRole('radio', { name: 'Everything' }))
    expect(mockUpdate).toHaveBeenCalledWith('everything')
  })
})

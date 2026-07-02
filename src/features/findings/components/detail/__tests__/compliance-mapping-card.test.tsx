/**
 * ComplianceMappingCard — empty state, mapped list, auto-map trigger, gating.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComplianceMappingCard } from '../compliance-mapping-card'

const mockAutoMap = vi.fn()
const mockMutate = vi.fn()
let mockMappings: Array<{ id: string; impact: string }> = []
let mockHasPermission = (_: string) => true

vi.mock('@/features/compliance/api/use-compliance-api', () => ({
  useFindingControls: () => ({
    data: { data: mockMappings },
    isLoading: false,
    mutate: mockMutate,
  }),
  useAutoMapFinding: () => ({ trigger: mockAutoMap, isMutating: false }),
}))

vi.mock('@/context/permission-provider', () => ({
  usePermissions: () => ({ hasPermission: (p: string) => mockHasPermission(p) }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

describe('ComplianceMappingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMappings = []
    mockHasPermission = () => true
    mockAutoMap.mockResolvedValue({ created: [], count: 2 })
  })

  it('shows the empty state when no controls are mapped', () => {
    render(<ComplianceMappingCard findingId="f-1" />)
    expect(screen.getByText(/Not mapped to any control yet/i)).toBeInTheDocument()
  })

  it('renders the mapped controls count', () => {
    mockMappings = [
      { id: 'm1', impact: 'direct' },
      { id: 'm2', impact: 'direct' },
    ]
    render(<ComplianceMappingCard findingId="f-1" />)
    expect(screen.getByText(/2 controls mapped/i)).toBeInTheDocument()
  })

  it('triggers auto-map on click', async () => {
    const user = userEvent.setup()
    render(<ComplianceMappingCard findingId="f-1" />)
    await user.click(screen.getByRole('button', { name: /auto-map to owasp/i }))
    expect(mockAutoMap).toHaveBeenCalledTimes(1)
  })

  it('hides the auto-map action without compliance:mappings:write', () => {
    mockHasPermission = () => false
    render(<ComplianceMappingCard findingId="f-1" />)
    expect(screen.queryByRole('button', { name: /auto-map/i })).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InScopeServicesField } from '../in-scope-services-field'

/**
 * The API snapshots a cycle's scope from charter.in_scope_services as
 * business-service IDs (`service_id = ANY($ids::uuid[])`). The field used to be
 * free text ("e.g. Checkout API"), so a typed name made the snapshot query fail
 * and the cycle activated with no assets in scope. These tests pin that the
 * field stores IDs, shows names, and surfaces old free-text entries.
 */

const mockUseSWR = vi.fn()
vi.mock('swr', () => ({ default: (...args: unknown[]) => mockUseSWR(...args) }))
vi.mock('@/lib/api/client', () => ({ get: vi.fn() }))

const SERVICES = {
  data: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Customer Portal',
      criticality: 'critical',
    },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Internal API', criticality: 'high' },
  ],
}

describe('InScopeServicesField', () => {
  beforeEach(() => {
    mockUseSWR.mockReturnValue({ data: SERVICES, error: undefined, isLoading: false })
  })

  it('stores the business-service ID, not its name, when a service is picked', () => {
    const onChange = vi.fn()
    render(<InScopeServicesField value={[]} onChange={onChange} editable />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Customer Portal' }))
    expect(onChange).toHaveBeenCalledWith(['11111111-1111-1111-1111-111111111111'])
  })

  it('unchecking removes the ID', () => {
    const onChange = vi.fn()
    render(
      <InScopeServicesField
        value={['11111111-1111-1111-1111-111111111111']}
        onChange={onChange}
        editable
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Customer Portal' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('lists a free-text entry from an older charter so it can be removed', () => {
    const onChange = vi.fn()
    render(
      <InScopeServicesField
        value={['Checkout API', '22222222-2222-2222-2222-222222222222']}
        onChange={onChange}
        editable
      />
    )
    expect(screen.getByText(/not business services/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Checkout API' }))
    expect(onChange).toHaveBeenCalledWith(['22222222-2222-2222-2222-222222222222'])
  })

  it('read-only shows service names, and marks unknown entries', () => {
    render(
      <InScopeServicesField
        value={['22222222-2222-2222-2222-222222222222', 'Checkout API']}
        onChange={vi.fn()}
        editable={false}
      />
    )
    expect(screen.getByText('Internal API')).toBeInTheDocument()
    expect(screen.getByText(/Checkout API \(not a business service\)/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('read-only with nothing selected says every asset is in scope', () => {
    render(<InScopeServicesField value={[]} onChange={vi.fn()} editable={false} />)
    expect(screen.getByText(/All assets/)).toBeInTheDocument()
  })

  it('does not flag entries as unknown before the service list has loaded', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true })
    render(<InScopeServicesField value={['Checkout API']} onChange={vi.fn()} editable />)
    expect(screen.queryByText(/not business services/i)).not.toBeInTheDocument()
  })
})

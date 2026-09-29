import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionBar } from '../bulk-action-bar'

describe('BulkActionBar', () => {
  it('renders nothing when no rows are selected', () => {
    const { container } = render(
      <BulkActionBar count={0} onClear={() => {}}>
        <button>Assign</button>
      </BulkActionBar>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the count and the actions as a toolbar', () => {
    render(
      <BulkActionBar count={3} onClear={() => {}} noun="findings selected">
        <button>Assign</button>
      </BulkActionBar>
    )
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('3 findings selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument()
  })

  it('clears via its button and via Escape', () => {
    const onClear = vi.fn()
    render(
      <BulkActionBar count={2} onClear={onClear}>
        <span />
      </BulkActionBar>
    )
    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClear).toHaveBeenCalledTimes(2)
  })
})

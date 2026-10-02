import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { GatedButton } from '../gated-button'
import { DataTableRowActions } from '../data-table-row-actions'

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('GatedButton', () => {
  it('is a normal button when allowed', async () => {
    const onClick = vi.fn()
    render(
      <GatedButton allowed reason="nope" onClick={onClick}>
        Accept risk
      </GatedButton>
    )
    const btn = screen.getByRole('button', { name: 'Accept risk' })
    expect(btn).toBeEnabled()
    await userEvent.setup().click(btn)
    expect(onClick).toHaveBeenCalled()
    expect(screen.queryByLabelText('nope')).toBeNull()
  })

  it('is disabled with the reason when not allowed', () => {
    const onClick = vi.fn()
    render(
      <GatedButton allowed={false} reason="Needs findings:approve" onClick={onClick}>
        Accept risk
      </GatedButton>
    )
    expect(screen.getByRole('button', { name: 'Accept risk' })).toBeDisabled()
    expect(screen.getByLabelText('Needs findings:approve')).toBeInTheDocument()
  })
})

describe('DataTableRowActions disabledReason', () => {
  it('renders a disabled item that carries its reason', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTableRowActions
        actions={[
          {
            label: 'Accept risk',
            onClick,
            disabled: true,
            disabledReason: 'Needs approval rights',
          },
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: /open row actions/i }))
    const item = await screen.findByRole('menuitem', { name: /accept risk/i })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByLabelText(/needs approval rights/i)).toBeInTheDocument()
  })
})

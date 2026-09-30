import { describe, it, expect, vi } from 'vitest'
import { createPortal } from 'react-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table/data-table'

type Row = { id: string; name: string }

// A cell that, like a row menu, renders part of itself into a portal.
const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    id: 'actions',
    cell: () => (
      <>
        <button type="button">Menu</button>
        {createPortal(<div>Menu separator</div>, document.body)}
      </>
    ),
  },
]

function renderTable(onRowClick: (r: Row) => void) {
  render(
    <DataTable
      columns={columns}
      data={[{ id: '1', name: 'payment-service' }]}
      onRowClick={onRowClick}
      showSearch={false}
      showPagination={false}
      showColumnToggle={false}
    />
  )
}

describe('DataTable row click', () => {
  it('fires for a click on the row itself', () => {
    const onRowClick = vi.fn()
    renderTable(onRowClick)
    fireEvent.click(screen.getByText('payment-service'))
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'payment-service' })
  })

  it('ignores the row’s own controls', () => {
    const onRowClick = vi.fn()
    renderTable(onRowClick)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('ignores clicks inside portaled content such as an open row menu', () => {
    const onRowClick = vi.fn()
    renderTable(onRowClick)
    fireEvent.click(screen.getByText('Menu separator'))
    expect(onRowClick).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table/data-table'
import { DataTableColumnHeader } from '../data-table/data-table-column-header'

type Row = { id: string; name: string; status: string; target_count: number }

const columns: ColumnDef<Row>[] = [
  { id: 'select', cell: () => <input type="checkbox" aria-label="Select row" /> },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'target_count' },
  { id: 'actions', cell: () => <button type="button">Row actions</button> },
]

const data: Row[] = [{ id: '1', name: 'Daily external recon', status: 'Active', target_count: 12 }]

const tableWrap = () => screen.getByRole('table').closest('.rounded-md.border')

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

describe('DataTable phone cards', () => {
  const originalWidth = window.innerWidth
  afterEach(() => setWidth(originalWidth))

  function renderTable(onRowClick = vi.fn(), props: { mobileCards?: boolean } = {}) {
    render(
      <DataTable
        columns={columns}
        data={data}
        onRowClick={onRowClick}
        showSearch={false}
        showPagination={false}
        {...props}
      />
    )
    return onRowClick
  }

  it('renders rows as cards on a phone, labelled from the column headers', () => {
    setWidth(390)
    renderTable()
    expect(tableWrap()).toHaveClass('hidden')
    // String header, a DataTableColumnHeader title, and an id fallback.
    expect(screen.getByText('Status', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Target count', { selector: 'dt' })).toBeInTheDocument()
    // The title column is not repeated as a field; controls are not fields.
    expect(screen.queryByText('Name', { selector: 'dt' })).not.toBeInTheDocument()
    expect(screen.queryByText('Actions', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('opens the row on tap but not from its checkbox or actions', () => {
    setWidth(390)
    const onRowClick = renderTable()
    const card = screen.getByText('Status', { selector: 'dt' }).closest('dl')!.parentElement!
    fireEvent.click(card)
    expect(onRowClick).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getAllByRole('button', { name: 'Row actions' })[0])
    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    expect(onRowClick).toHaveBeenCalledTimes(1)
  })

  it('keeps the table on wider screens, and on phones when opted out', () => {
    setWidth(1024)
    renderTable()
    expect(tableWrap()).not.toHaveClass('hidden')
    expect(screen.queryByText('Status', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('keeps the table on a phone with mobileCards={false}', () => {
    setWidth(390)
    renderTable(vi.fn(), { mobileCards: false })
    expect(tableWrap()).not.toHaveClass('hidden')
    expect(screen.queryByText('Status', { selector: 'dt' })).not.toBeInTheDocument()
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table/data-table'

type Row = { id: string; name: string }

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'actions', cell: () => <button type="button">Row actions</button> },
]

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

describe('DataTable isLoading', () => {
  const originalWidth = window.innerWidth
  afterEach(() => setWidth(originalWidth))

  it('shows skeleton rows instead of the empty message while loading', () => {
    setWidth(1440)
    const { container } = render(
      <DataTable columns={columns} data={[]} isLoading emptyMessage="No hosts yet" />
    )
    expect(screen.queryByText('No hosts yet')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-loading-row]').length).toBeGreaterThan(0)
  })

  it('keeps the toolbar search mounted while loading', () => {
    setWidth(1440)
    render(
      <DataTable
        columns={columns}
        data={[]}
        isLoading
        toolbarStart={<input aria-label="Search hosts" />}
      />
    )
    expect(screen.getByLabelText('Search hosts')).toBeInTheDocument()
  })

  it('keeps rows already on screen visible during a refetch', () => {
    setWidth(1440)
    const { container } = render(
      <DataTable columns={columns} data={[{ id: '1', name: 'web-01' }]} isLoading />
    )
    expect(screen.getByText('web-01')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-loading-row]').length).toBe(0)
  })

  it('shows the empty message once loading finishes with no rows', () => {
    setWidth(1440)
    render(<DataTable columns={columns} data={[]} emptyMessage="No hosts yet" />)
    expect(screen.getByText('No hosts yet')).toBeInTheDocument()
  })

  it('shows skeleton cards on a phone while loading', () => {
    setWidth(390)
    render(<DataTable columns={columns} data={[]} isLoading emptyMessage="No hosts yet" />)
    expect(screen.queryByText('No hosts yet')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0)
  })
})

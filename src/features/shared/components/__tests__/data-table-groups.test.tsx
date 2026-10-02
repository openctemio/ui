import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, groupRowsForDisplay } from '../data-table/data-table'

type Row = { id: string; name: string; zone: string }

const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }]
const rows: Row[] = [
  { id: '1', name: 'a', zone: 'lab' },
  { id: '2', name: 'b', zone: 'dmz' },
  { id: '3', name: 'c', zone: 'lab' },
  { id: '4', name: 'd', zone: 'none' },
]

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

describe('groupRowsForDisplay', () => {
  it('keeps rows stable inside a group and orders groups by `order`, then appearance', () => {
    const g = groupRowsForDisplay(rows, (r) => r.zone, ['dmz'])
    expect(g.map((x) => [x.key, x.rows.map((r) => r.name)])).toEqual([
      ['dmz', ['b']],
      ['lab', ['a', 'c']],
      ['none', ['d']],
    ])
  })
})

describe('DataTable rowGroups', () => {
  const originalWidth = window.innerWidth
  afterEach(() => setWidth(originalWidth))

  it('renders a full-width header row before each group', () => {
    setWidth(1440)
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        showSearch={false}
        rowGroups={{
          getKey: (r) => r.zone,
          order: ['dmz', 'lab', 'none'],
          renderHeader: (key, groupRows) => `${key} · ${groupRows.length}`,
        }}
      />
    )
    const body = container.querySelector('tbody')!
    const cells = within(body)
      .getAllByRole('row')
      .map((r) => r.textContent)
    expect(cells).toEqual(['dmz · 1', 'b', 'lab · 2', 'a', 'c', 'none · 1', 'd'])
    const header = container.querySelector('[data-slot="row-group-header"] td')!
    expect(header.getAttribute('colspan')).toBe('1')
  })

  it('renders group headers between the phone cards too', () => {
    setWidth(390)
    render(
      <DataTable
        columns={columns}
        data={rows}
        showSearch={false}
        mobileRow={(r) => <span>card {r.name}</span>}
        rowGroups={{ getKey: (r) => r.zone, renderHeader: (key) => `group ${key}` }}
      />
    )
    // The card list (the table stays mounted but hidden on phones).
    const cardHeaders = [...document.querySelectorAll('div[data-slot="row-group-header"]')].map(
      (el) => el.textContent
    )
    expect(cardHeaders).toEqual(['group lab', 'group dmz', 'group none'])
    expect(screen.getByText('card c')).toBeInTheDocument()
  })

  it('without rowGroups the body has no header rows', () => {
    setWidth(1440)
    const { container } = render(<DataTable columns={columns} data={rows} showSearch={false} />)
    expect(container.querySelector('[data-slot="row-group-header"]')).toBeNull()
  })
})

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, rowsForServerGroups } from '../data-table/data-table'

type Row = { id: string; name: string; zone: string }

const nameCol: ColumnDef<Row> = { accessorKey: 'name', header: 'Name' }
const selectCol: ColumnDef<Row> = {
  id: 'select',
  header: () => null,
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      aria-label={`Select ${row.original.name}`}
    />
  ),
}

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

const bodyRows = (container: HTMLElement) =>
  [...container.querySelectorAll('tbody tr')].map((r) => r.textContent)

describe('rowsForServerGroups', () => {
  it('lists every server group in order, empty ones included, and drops unlisted rows', () => {
    const rows: Row[] = [
      { id: '1', name: 'a', zone: 'x' },
      { id: '2', name: 'b', zone: 'stray' },
      { id: '3', name: 'c', zone: 'x' },
    ]
    const g = rowsForServerGroups(rows, (r) => r.zone, ['y', 'x'])
    expect(g.map((x) => [x.key, x.rows.map((r) => r.name)])).toEqual([
      ['y', []],
      ['x', ['a', 'c']],
    ])
  })
})

describe('DataTable client pagination', () => {
  it('pages forward (the table owns pagination when it is not manual)', () => {
    setWidth(1440)
    const data: Row[] = ['a', 'b', 'c'].map((name, i) => ({ id: String(i), name, zone: 'z' }))
    const { container } = render(
      <DataTable columns={[nameCol]} data={data} showSearch={false} pageSize={2} />
    )
    expect(bodyRows(container)).toEqual(['a', 'b'])
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyRows(container)).toEqual(['c'])
  })
})

describe('DataTable grouped lists', () => {
  const originalWidth = window.innerWidth
  afterEach(() => setWidth(originalWidth))

  it('pages a client-grouped table group by group (a group is not split across pages)', () => {
    setWidth(1440)
    // Interleaved input: without group ordering, page 1 would hold a, b and
    // page 2 c, d — both pages showing both groups.
    const data: Row[] = [
      { id: '1', name: 'a', zone: 'lab' },
      { id: '2', name: 'b', zone: 'dmz' },
      { id: '3', name: 'c', zone: 'lab' },
      { id: '4', name: 'd', zone: 'dmz' },
    ]
    const { container } = render(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        pageSize={2}
        rowGroups={{ getKey: (r) => r.zone, renderHeader: (k, rows) => `${k} ${rows.length}` }}
      />
    )
    expect(bodyRows(container)).toEqual(['lab 2', 'a', 'c'])
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyRows(container)).toEqual(['dmz 2', 'b', 'd'])
  })

  it('client group headers count the whole group when it runs past a page break', () => {
    setWidth(1440)
    const data: Row[] = ['a', 'b', 'c'].map((name, i) => ({ id: String(i), name, zone: 'lab' }))
    const { container } = render(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        pageSize={2}
        rowGroups={{ getKey: (r) => r.zone, renderHeader: (k, rows) => `${k} ${rows.length}` }}
      />
    )
    expect(bodyRows(container)).toEqual(['lab 3', 'a', 'b'])
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyRows(container)).toEqual(['lab 3', 'c'])
  })

  it('collapses and expands a group from its header chevron', () => {
    setWidth(1440)
    const data: Row[] = [
      { id: '1', name: 'a', zone: 'lab' },
      { id: '2', name: 'b', zone: 'dmz' },
    ]
    const { container } = render(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        rowGroups={{
          getKey: (r) => r.zone,
          collapsible: true,
          renderHeader: (k) => `group ${k}`,
          getLabel: (k) => `zone ${k}`,
        }}
      />
    )
    const toggle = screen.getByRole('button', { name: 'Collapse zone lab' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(bodyRows(container)).toEqual(['group lab', 'group dmz', 'b'])
    const expand = screen.getByRole('button', { name: 'Expand zone lab' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(expand)
    expect(bodyRows(container)).toEqual(['group lab', 'a', 'group dmz', 'b'])
  })

  it('starts collapsed with defaultExpanded=false, and honours controlled expandedKeys', () => {
    setWidth(1440)
    const data: Row[] = [
      { id: '1', name: 'a', zone: 'lab' },
      { id: '2', name: 'b', zone: 'dmz' },
    ]
    const onChange = vi.fn()
    const { container, rerender } = render(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        rowGroups={{
          getKey: (r) => r.zone,
          collapsible: true,
          defaultExpanded: false,
          renderHeader: (k) => k,
        }}
      />
    )
    expect(bodyRows(container)).toEqual(['lab', 'dmz'])

    rerender(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        rowGroups={{
          getKey: (r) => r.zone,
          collapsible: true,
          expandedKeys: ['dmz'],
          onExpandedKeysChange: onChange,
          renderHeader: (k) => k,
        }}
      />
    )
    expect(bodyRows(container)).toEqual(['lab', 'dmz', 'b'])
    fireEvent.click(screen.getByRole('button', { name: 'Expand lab' }))
    expect(onChange).toHaveBeenCalledWith(['dmz', 'lab'])
  })

  it('selects and clears a whole group from the header checkbox', () => {
    setWidth(1440)
    const data: Row[] = [
      { id: '1', name: 'a', zone: 'lab' },
      { id: '2', name: 'b', zone: 'dmz' },
      { id: '3', name: 'c', zone: 'lab' },
    ]
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={[selectCol, nameCol]}
        data={data}
        showSearch={false}
        getRowId={(r) => r.id}
        onSelectionChange={onSelectionChange}
        rowGroups={{ getKey: (r) => r.zone, selectable: true, renderHeader: (k) => k }}
      />
    )
    const groupBox = screen.getByRole('checkbox', { name: 'Select the 2 rows of lab' })
    fireEvent.click(groupBox)
    expect(onSelectionChange).toHaveBeenLastCalledWith([data[0], data[2]])
    expect(groupBox).toHaveAttribute('data-state', 'checked')

    // One row off: the group box turns indeterminate.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a' }))
    expect(groupBox).toHaveAttribute('data-state', 'indeterminate')

    fireEvent.click(groupBox)
    expect(onSelectionChange).toHaveBeenLastCalledWith([data[0], data[2]])
    fireEvent.click(groupBox)
    expect(onSelectionChange).toHaveBeenLastCalledWith([])
  })

  it('server groups: headers before rows load, a loading group, a footer, group actions and the page noun', () => {
    setWidth(1440)
    const loaded: Row[] = [{ id: '1', name: 'a', zone: 'g1' }]
    const { container } = render(
      <DataTable
        columns={[nameCol]}
        data={loaded}
        showSearch={false}
        manualPagination
        rowCount={57}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={() => {}}
        paginationNoun="groups"
        pageSizeLabel="Groups per page"
        rowGroups={{
          getKey: (r) => r.zone,
          groups: ['g1', 'g2', 'g3'],
          collapsible: true,
          expandedKeys: ['g1', 'g2'],
          onExpandedKeysChange: () => {},
          isGroupLoading: (k) => k === 'g2',
          renderHeader: (k) => `header ${k}`,
          renderActions: (k) => <button type="button">View {k}</button>,
          renderFooter: (k) => (k === 'g1' ? 'Show 20 more' : null),
        }}
      />
    )
    const tbodies = container.querySelectorAll('tbody')
    expect(tbodies).toHaveLength(3)
    expect(within(tbodies[0] as HTMLElement).getByText('a')).toBeInTheDocument()
    expect(tbodies[0].querySelector('[data-slot="row-group-footer"]')?.textContent).toBe(
      'Show 20 more'
    )
    // g2 is expanded and loading: skeleton rows, no footer.
    expect(tbodies[1].querySelectorAll('[data-loading-row]').length).toBeGreaterThan(0)
    // g3 is collapsed: its header only.
    expect(tbodies[2].querySelectorAll('tr')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'View g3' })).toBeInTheDocument()
    // Each tbody is named by its header.
    const labelledBy = tbodies[0].getAttribute('aria-labelledby')!
    expect(document.getElementById(labelledBy)?.textContent).toBe('header g1')
    expect(screen.getByText('Groups per page')).toBeInTheDocument()
    expect(container.textContent).toContain('of 57 groups')
  })

  it('renders server group headers when no rows are loaded yet (not the empty state)', () => {
    setWidth(1440)
    render(
      <DataTable
        columns={[nameCol]}
        data={[]}
        showSearch={false}
        emptyMessage="Nothing here"
        rowGroups={{ getKey: (r) => r.zone, groups: ['g1'], renderHeader: (k) => `header ${k}` }}
      />
    )
    expect(screen.getByText('header g1')).toBeInTheDocument()
    expect(screen.queryByText('Nothing here')).toBeNull()
  })

  it('has no group checkbox unless the page asks for one (sensors keep their plain headers)', () => {
    setWidth(1440)
    render(
      <DataTable
        columns={[selectCol, nameCol]}
        data={[{ id: '1', name: 'a', zone: 'lab' }]}
        showSearch={false}
        rowGroups={{ getKey: (r) => r.zone, renderHeader: (k) => k }}
      />
    )
    expect(screen.queryByRole('checkbox', { name: /rows of lab/ })).toBeNull()
  })

  it('phone cards: collapsed groups hide their cards', () => {
    setWidth(390)
    const data: Row[] = [
      { id: '1', name: 'a', zone: 'lab' },
      { id: '2', name: 'b', zone: 'dmz' },
    ]
    render(
      <DataTable
        columns={[nameCol]}
        data={data}
        showSearch={false}
        mobileRow={(r) => <span>card {r.name}</span>}
        rowGroups={{
          getKey: (r) => r.zone,
          collapsible: true,
          renderHeader: (k) => `group ${k}`,
        }}
      />
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse lab' })[0])
    expect(screen.queryByText('card a')).toBeNull()
    expect(screen.getByText('card b')).toBeInTheDocument()
  })
})

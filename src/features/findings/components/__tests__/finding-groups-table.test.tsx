import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { FindingGroup } from '../../api/use-finding-groups'
import type { ApiFinding } from '../../api/finding-api.types'

const groupsState: { data: { data: FindingGroup[]; pagination: unknown } | undefined } = {
  data: undefined,
}
const groupsArgs: unknown[] = []
vi.mock('../../api/use-finding-groups', () => ({
  useFindingGroups: (args: unknown) => {
    groupsArgs.push(args)
    return { data: groupsState.data, error: undefined, isLoading: false, mutate: vi.fn() }
  },
}))

// The URL builder is replaced by one that exposes the filters it was given.
const fetchFindings = vi.fn()
vi.mock('../../api/use-findings-api', () => ({
  buildFindingsEndpoint: (filters: unknown) => JSON.stringify(filters),
  fetchFindings: (url: string) => fetchFindings(JSON.parse(url)),
}))

import { FindingGroupsTable, groupRowFilter } from '../finding-groups-table'

type Row = { id: string; title: string }
const columns: ColumnDef<Row>[] = [{ accessorKey: 'title', header: 'Title' }]
const toRow = (f: ApiFinding): Row => ({ id: f.id, title: f.title ?? f.id })

function group(key: string, type: string, total: number, extra: Partial<FindingGroup> = {}) {
  return {
    group_key: key,
    group_type: type,
    label: `label ${key}`,
    severity: '',
    metadata: {},
    stats: {
      total,
      open: total,
      in_progress: 0,
      fix_applied: 0,
      resolved: 0,
      affected_assets: 1,
      resolved_assets: 0,
      progress_pct: 0,
    },
    ...extra,
  } as FindingGroup
}

const finding = (id: string, extra: Partial<ApiFinding> = {}) =>
  ({ id, title: `finding ${id}`, ...extra }) as ApiFinding

function renderTable(props: Partial<Parameters<typeof FindingGroupsTable<Row>>[0]> = {}) {
  return render(
    <FindingGroupsTable<Row>
      dimension="asset_id"
      columns={columns}
      toRow={toRow}
      pagination={{ pageIndex: 0, pageSize: 20 }}
      onPaginationChange={() => {}}
      {...props}
    />
  )
}

beforeEach(() => {
  groupsArgs.length = 0
  fetchFindings.mockReset()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
})

describe('groupRowFilter', () => {
  it('maps each dimension the list can filter on, and nothing else', () => {
    expect(groupRowFilter('asset_id', 'a1')).toEqual({ asset_id: 'a1' })
    expect(groupRowFilter('cve_id', 'CVE-1')).toEqual({ cve_ids: ['CVE-1'] })
    expect(groupRowFilter('severity', 'high')).toEqual({ severities: ['high'] })
    expect(groupRowFilter('source', 'sca')).toEqual({ sources: ['sca'] })
    expect(groupRowFilter('component_id', 'c1')).toEqual({ component_id: 'c1' })
    expect(groupRowFilter('finding_type', 'secret')).toEqual({ finding_types: ['secret'] })
    expect(groupRowFilter('owner_id', 'u1')).toBeNull()
  })
})

describe('FindingGroupsTable', () => {
  it('asks the groups API for the page of groups, and opens the first three groups', async () => {
    groupsState.data = {
      data: ['a1', 'a2', 'a3', 'a4'].map((k) => group(k, 'asset', 2)),
      pagination: { total: 4, page: 1, per_page: 20 },
    }
    fetchFindings.mockImplementation(async (f: { asset_id: string }) => ({
      data: [finding(`${f.asset_id}-x`, { asset_id: f.asset_id })],
      total: 1,
    }))
    renderTable({ pagination: { pageIndex: 1, pageSize: 10 } })
    expect(groupsArgs[0]).toMatchObject({ group_by: 'asset_id', page: 2, per_page: 10 })

    await screen.findByText('finding a1-x')
    await screen.findByText('finding a3-x')
    expect(screen.queryByText('finding a4-x')).toBeNull()
    const asked = fetchFindings.mock.calls.map((c) => c[0])
    expect(asked.map((f) => f.asset_id).sort()).toEqual(['a1', 'a2', 'a3'])
    // First 5 rows, scoped to the open-to-resolved statuses.
    expect(asked[0]).toMatchObject({ per_page: 5, page: 1 })
    expect(asked[0].statuses).toEqual([
      'new',
      'confirmed',
      'in_progress',
      'fix_applied',
      'resolved',
    ])

    // Opening a fourth group loads it.
    fireEvent.click(screen.getByRole('button', { name: 'Expand label a4' }))
    await screen.findByText('finding a4-x')
  })

  it('shows a group header with its counts and the page actions', async () => {
    groupsState.data = {
      data: [group('a1', 'asset', 3, { metadata: { asset_type: 'host', owner: 'Ann' } })],
      pagination: { total: 1, page: 1, per_page: 20 },
    }
    fetchFindings.mockResolvedValue({ data: [], total: 0 })
    renderTable({
      renderGroupActions: (g) => <button type="button">Mark {g.group_key}</button>,
    })
    expect(screen.getByText('label a1')).toBeInTheDocument()
    expect(screen.getByText(/Host · Owner Ann · 3 findings/)).toBeInTheDocument()
    expect(screen.getByText('0% verified')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark a1' })).toBeInTheDocument()
    expect(document.body.textContent).toContain('of 1 groups')
  })

  it('offers "Show 20 more" when a group has more rows, and loads them', async () => {
    groupsState.data = {
      data: [group('a1', 'asset', 30)],
      pagination: { total: 1, page: 1, per_page: 20 },
    }
    fetchFindings.mockImplementation(async (f: { per_page: number }) => ({
      data: Array.from({ length: f.per_page }, (_, i) => finding(`r${i}`, { asset_id: 'a1' })),
      total: 30,
    }))
    renderTable()
    await screen.findByText('Showing 5 of 30')
    fireEvent.click(screen.getByRole('button', { name: 'Show 20 more' }))
    await screen.findByText('Showing 25 of 30')
    expect(fetchFindings.mock.calls.at(-1)?.[0]).toMatchObject({ per_page: 25 })
  })

  it('does not put foreign rows under a group when the API ignores the group filter', async () => {
    groupsState.data = {
      data: [group('CVE-1', 'cve', 2)],
      pagination: { total: 1, page: 1, per_page: 20 },
    }
    // An API without cve_ids returns findings of every CVE.
    fetchFindings.mockResolvedValue({
      data: [finding('x', { cve_id: 'CVE-1' }), finding('y', { cve_id: 'CVE-9' })],
      total: 50,
    })
    const onViewGroup = vi.fn()
    renderTable({ dimension: 'cve_id', onViewGroup })
    await screen.findByText(/These findings open in the list/)
    expect(screen.queryByText('finding y')).toBeNull()
    expect(screen.queryByText('finding x')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View 2 findings' }))
    expect(onViewGroup).toHaveBeenCalledWith(expect.objectContaining({ group_key: 'CVE-1' }))
  })

  it('groups the API cannot list rows for are headers only (no chevron, no requests)', async () => {
    groupsState.data = {
      data: [group('u1', 'owner', 4)],
      pagination: { total: 1, page: 1, per_page: 20 },
    }
    renderTable({ dimension: 'owner_id' })
    expect(screen.getByText('label u1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Expand|Collapse/ })).toBeNull()
    await act(async () => {})
    expect(fetchFindings).not.toHaveBeenCalled()
  })

  it('reloads the open groups when reloadKey changes', async () => {
    groupsState.data = {
      data: [group('a1', 'asset', 1)],
      pagination: { total: 1, page: 1, per_page: 20 },
    }
    fetchFindings.mockResolvedValue({ data: [finding('f1', { asset_id: 'a1' })], total: 1 })
    const { rerender } = renderTable({ reloadKey: 0 })
    await screen.findByText('finding f1')
    const before = fetchFindings.mock.calls.length
    rerender(
      <FindingGroupsTable<Row>
        dimension="asset_id"
        columns={columns}
        toRow={toRow}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={() => {}}
        reloadKey={1}
      />
    )
    await waitFor(() => expect(fetchFindings.mock.calls.length).toBe(before + 1))
    // The rows stay on screen while they reload.
    expect(screen.getByText('finding f1')).toBeInTheDocument()
  })
})

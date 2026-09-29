import { describe, it, expect } from 'vitest'
import {
  countActiveFilters,
  isInventoryFilterEmpty,
  parseInventoryFilters,
  serializeInventoryFilters,
  sortingToSort,
  sortToSorting,
  type InventoryFilters,
} from './inventory-url'

describe('inventory URL codec', () => {
  it('round-trips every kind of filter through the query string', () => {
    const filters: InventoryFilters = {
      search: 'web',
      types: ['host', 'domain'],
      criticalities: ['critical'],
      hasOwner: false,
      isInternetAccessible: true,
      lastSeenBefore: '2026-01-01T00:00:00.000Z',
      sort: '-risk_score',
      page: 3,
      pageSize: 50,
    }
    const qs = serializeInventoryFilters(filters)
    expect(qs.get('types')).toBe('host,domain')
    expect(qs.get('has_owner')).toBe('false')
    expect(parseInventoryFilters(qs)).toEqual(filters)
  })

  it('omits page 1 and the default page size from the URL', () => {
    const qs = serializeInventoryFilters({ page: 1, pageSize: 25 })
    expect(qs.toString()).toBe('')
  })

  it('counts each selected value, each boolean and the search', () => {
    const f: InventoryFilters = { types: ['host', 'domain'], hasOwner: false, search: 'x' }
    expect(countActiveFilters(f)).toBe(4)
    expect(isInventoryFilterEmpty(f)).toBe(false)
    expect(isInventoryFilterEmpty({ sort: 'name', page: 2, pageSize: 50 })).toBe(true)
  })
})

describe('inventory sort mapping', () => {
  it('maps the URL sort field to the table column and back', () => {
    expect(sortToSorting('-risk_score')).toEqual([{ id: 'risk', desc: true }])
    expect(sortToSorting('finding_count')).toEqual([{ id: 'findings', desc: false }])
    expect(sortingToSort([{ id: 'risk', desc: true }])).toBe('-risk_score')
    expect(sortingToSort([{ id: 'name', desc: false }])).toBe('name')
  })

  it('ignores fields and columns the API cannot sort', () => {
    expect(sortToSorting('owner')).toEqual([])
    expect(sortToSorting(undefined)).toEqual([])
    expect(sortingToSort([{ id: 'owner', desc: false }])).toBeUndefined()
    expect(sortingToSort([])).toBeUndefined()
  })
})

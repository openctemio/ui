/**
 * fetchAllAssets walks EVERY page so "Export" covers the whole filtered
 * dataset, not just the page rendered in the table (regression: export
 * previously only emitted the first page).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

import { get } from '@/lib/api/client'
import { fetchAllAssets } from '../use-assets'

function pageResponse(page: number, count: number, totalPages: number, total: number) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `p${page}-${i}`,
      name: `asset-${page}-${i}`,
      type: 'domain',
    })),
    total,
    page,
    per_page: 100,
    total_pages: totalPages,
  }
}

describe('fetchAllAssets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accumulates every page (not just the first)', async () => {
    ;(get as Mock).mockImplementation(async (url: string) => {
      const page = Number(new URLSearchParams(url.split('?')[1]).get('page')) || 1
      const sizes: Record<number, number> = { 1: 100, 2: 100, 3: 50 }
      return pageResponse(page, sizes[page] ?? 0, 3, 250)
    })

    const all = await fetchAllAssets({ search: 'x' })

    expect(all).toHaveLength(250)
    expect(get).toHaveBeenCalledTimes(3)
    // Distinct ids across pages (no accidental page-1 repetition).
    expect(new Set(all.map((a) => a.id)).size).toBe(250)
  })

  it('passes the current filters and pages at per_page=100', async () => {
    ;(get as Mock).mockResolvedValue(pageResponse(1, 3, 1, 3))

    await fetchAllAssets({ search: 'db', tags: ['prod'], types: ['host'] })

    const url = (get as Mock).mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('search')).toBe('db')
    expect(params.get('tags')).toBe('prod')
    expect(params.get('types')).toBe('host')
    expect(params.get('per_page')).toBe('100')
    expect(get).toHaveBeenCalledTimes(1) // total_pages=1 → single call
  })

  it('single page returns just that page', async () => {
    ;(get as Mock).mockResolvedValue(pageResponse(1, 7, 1, 7))
    const all = await fetchAllAssets()
    expect(all).toHaveLength(7)
    expect(get).toHaveBeenCalledTimes(1)
  })
})

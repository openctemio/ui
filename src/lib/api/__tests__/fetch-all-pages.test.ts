import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('../client', () => ({ get: vi.fn() }))

import { get } from '../client'
import { fetchAllPages } from '../fetch-all-pages'

describe('fetchAllPages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('walks every page and concatenates data', async () => {
    ;(get as Mock).mockImplementation(async (url: string) => {
      const page = Number(new URLSearchParams(url.split('?')[1]).get('p')) || 1
      const sizes: Record<number, number> = { 1: 100, 2: 100, 3: 40 }
      return {
        data: Array.from({ length: sizes[page] ?? 0 }, (_, i) => ({ id: `${page}-${i}` })),
        total_pages: 3,
      }
    })

    const all = await fetchAllPages<{ id: string }>((page, perPage) => `/x?p=${page}&pp=${perPage}`)

    expect(all).toHaveLength(240)
    expect(get).toHaveBeenCalledTimes(3)
    expect(new Set(all.map((r) => r.id)).size).toBe(240)
  })

  it('stops after a single page when total_pages is 1', async () => {
    ;(get as Mock).mockResolvedValue({ data: [{ id: 'a' }], total_pages: 1 })
    const all = await fetchAllPages<{ id: string }>((page) => `/x?p=${page}`)
    expect(all).toHaveLength(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('uses perPage=100 by default in the URL builder', async () => {
    ;(get as Mock).mockResolvedValue({ data: [], total_pages: 1 })
    await fetchAllPages<unknown>((page, perPage) => `/x?p=${page}&pp=${perPage}`)
    expect((get as Mock).mock.calls[0][0]).toContain('pp=100')
  })

  it('respects the maxPages cap', async () => {
    ;(get as Mock).mockResolvedValue({ data: [{ id: 'x' }], total_pages: 9999 })
    await fetchAllPages<{ id: string }>((page) => `/x?p=${page}`, { maxPages: 3 })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('invokes onTruncated when the cap cuts the result short', async () => {
    ;(get as Mock).mockResolvedValue({ data: [{ id: 'x' }], total_pages: 9999 })
    const onTruncated = vi.fn()
    const all = await fetchAllPages<{ id: string }>((page) => `/x?p=${page}`, {
      maxPages: 3,
      perPage: 100,
      onTruncated,
    })
    expect(all).toHaveLength(3)
    expect(onTruncated).toHaveBeenCalledTimes(1)
    expect(onTruncated).toHaveBeenCalledWith(3, 300) // loaded rows, cap
  })

  it('does NOT invoke onTruncated when all pages fit', async () => {
    ;(get as Mock).mockResolvedValue({ data: [{ id: 'x' }], total_pages: 1 })
    const onTruncated = vi.fn()
    await fetchAllPages<{ id: string }>((page) => `/x?p=${page}`, { onTruncated })
    expect(onTruncated).not.toHaveBeenCalled()
  })
})

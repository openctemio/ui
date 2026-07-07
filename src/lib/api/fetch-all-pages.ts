'use client'

import { get } from './client'

interface PagedResponse<T> {
  data?: T[]
  total_pages?: number
}

/**
 * Walk every page of a paginated list endpoint and return the concatenated
 * `data` rows. Used by "Export" actions so a CSV covers the whole filtered
 * dataset rather than only the page currently rendered.
 *
 * `buildUrl(page, perPage)` produces the request URL for a given page — pass the
 * list's current filters so the export honors them. Pages at `perPage` (default
 * 100, the common API maximum) with a hard `maxPages` cap to avoid a runaway
 * loop on an unexpected `total_pages`.
 */
export async function fetchAllPages<T>(
  buildUrl: (page: number, perPage: number) => string,
  opts?: {
    perPage?: number
    maxPages?: number
    /** Called when the maxPages cap truncated the result (loaded rows, cap rows). */
    onTruncated?: (loaded: number, cap: number) => void
  }
): Promise<T[]> {
  const perPage = opts?.perPage ?? 100
  const maxPages = opts?.maxPages ?? 500
  const all: T[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= maxPages) {
    const resp = await get<PagedResponse<T>>(buildUrl(page, perPage))
    if (resp?.data?.length) {
      all.push(...resp.data)
    }
    hasMore = page < (resp?.total_pages ?? 1)
    page++
  }

  // Stopped at the cap with pages still remaining → the export is incomplete.
  if (hasMore) {
    opts?.onTruncated?.(all.length, maxPages * perPage)
  }

  return all
}

/**
 * URL <-> filter-state codec for the unified All-Assets inventory.
 *
 * Every filter lives in the query string so an inventory view is deep-linkable
 * and shareable (scoped to the viewer's own tenant + permissions — the URL
 * carries the *filter*, never data). Reading the URL on load fully restores the
 * filter state; writing replaces the URL without a history push so the back
 * button still leaves the page rather than unwinding each keystroke.
 *
 * Saved views (persisting a named filter set server-side) are intentionally out
 * of scope here — that is a v2 concern.
 */

import type { SortingState } from '@tanstack/react-table'
import type { AssetSearchFilters } from '../hooks/use-assets'
import type { AssetType, Criticality, ExposureLevel, AssetScope } from '../types/asset.types'

/** The subset of AssetSearchFilters the inventory page drives + syncs to the URL. */
export type InventoryFilters = Pick<
  AssetSearchFilters,
  | 'search'
  | 'types'
  | 'criticalities'
  | 'statuses'
  | 'scopes'
  | 'exposures'
  | 'tags'
  | 'dataClassifications'
  | 'environments'
  | 'providers'
  | 'businessUnitIds'
  | 'hasOwner'
  | 'isControlPlane'
  | 'isInternetAccessible'
  | 'isCrownJewel'
  | 'hasFindings'
  | 'lastSeenBefore'
  | 'lastSeenAfter'
  | 'sort'
  | 'page'
  | 'pageSize'
>

// Array-valued filter keys and their URL param names.
const ARRAY_PARAMS = {
  types: 'types',
  criticalities: 'criticalities',
  statuses: 'statuses',
  scopes: 'scopes',
  exposures: 'exposures',
  tags: 'tags',
  dataClassifications: 'data_classifications',
  environments: 'environments',
  providers: 'providers',
  businessUnitIds: 'business_unit_ids',
} as const

// Boolean-valued filter keys and their URL param names.
const BOOL_PARAMS = {
  hasOwner: 'has_owner',
  isControlPlane: 'is_control_plane',
  isInternetAccessible: 'is_internet_accessible',
  isCrownJewel: 'is_crown_jewel',
  hasFindings: 'has_findings',
} as const

// String-valued filter keys and their URL param names.
const STRING_PARAMS = {
  search: 'q',
  sort: 'sort',
  lastSeenBefore: 'last_seen_before',
  lastSeenAfter: 'last_seen_after',
} as const

type ArrayKey = keyof typeof ARRAY_PARAMS
type BoolKey = keyof typeof BOOL_PARAMS
type StringKey = keyof typeof STRING_PARAMS

/** Parse the current URLSearchParams into an InventoryFilters object. */
export function parseInventoryFilters(sp: URLSearchParams): InventoryFilters {
  const out: InventoryFilters = {}

  for (const key of Object.keys(ARRAY_PARAMS) as ArrayKey[]) {
    const raw = sp.get(ARRAY_PARAMS[key])
    if (raw) {
      const vals = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      if (vals.length > 0) {
        // The filter fields are typed string[] under different unions; a single
        // cast at the boundary keeps the codec generic without per-key noise.
        ;(out as Record<string, unknown>)[key] = vals
      }
    }
  }

  for (const key of Object.keys(BOOL_PARAMS) as BoolKey[]) {
    const raw = sp.get(BOOL_PARAMS[key])
    if (raw === 'true') out[key] = true
    else if (raw === 'false') out[key] = false
  }

  for (const key of Object.keys(STRING_PARAMS) as StringKey[]) {
    const raw = sp.get(STRING_PARAMS[key])
    if (raw) out[key] = raw
  }

  const page = Number(sp.get('page'))
  if (Number.isFinite(page) && page > 0) out.page = page
  const perPage = Number(sp.get('per_page'))
  if (Number.isFinite(perPage) && perPage > 0) out.pageSize = perPage

  return out
}

/** Serialize InventoryFilters back into a URLSearchParams (stable key order). */
export function serializeInventoryFilters(f: InventoryFilters): URLSearchParams {
  const sp = new URLSearchParams()

  for (const key of Object.keys(ARRAY_PARAMS) as ArrayKey[]) {
    const vals = f[key] as string[] | undefined
    if (vals && vals.length > 0) sp.set(ARRAY_PARAMS[key], vals.join(','))
  }
  for (const key of Object.keys(BOOL_PARAMS) as BoolKey[]) {
    const v = f[key]
    if (v !== undefined) sp.set(BOOL_PARAMS[key], String(v))
  }
  for (const key of Object.keys(STRING_PARAMS) as StringKey[]) {
    const v = f[key]
    if (v) sp.set(STRING_PARAMS[key], v)
  }
  if (f.page && f.page > 1) sp.set('page', String(f.page))
  if (f.pageSize && f.pageSize !== DEFAULT_PAGE_SIZE) sp.set('per_page', String(f.pageSize))

  return sp
}

/** Same default as the other server-paginated lists (Findings). */
export const DEFAULT_PAGE_SIZE = 20

/** True when no filter (other than pagination/sort) is active. */
export function isInventoryFilterEmpty(f: InventoryFilters): boolean {
  const arraysEmpty = (Object.keys(ARRAY_PARAMS) as ArrayKey[]).every(
    (k) => !(f[k] as string[] | undefined)?.length
  )
  const boolsEmpty = (Object.keys(BOOL_PARAMS) as BoolKey[]).every((k) => f[k] === undefined)
  return arraysEmpty && boolsEmpty && !f.search && !f.lastSeenBefore && !f.lastSeenAfter
}

/** Count of active filter dimensions (for the "N filters" affordance). */
export function countActiveFilters(f: InventoryFilters): number {
  let n = 0
  for (const k of Object.keys(ARRAY_PARAMS) as ArrayKey[]) {
    n += (f[k] as string[] | undefined)?.length ?? 0
  }
  for (const k of Object.keys(BOOL_PARAMS) as BoolKey[]) {
    if (f[k] !== undefined) n += 1
  }
  if (f.search) n += 1
  if (f.lastSeenBefore || f.lastSeenAfter) n += 1
  return n
}

/**
 * Inventory table column id → API sort field (asset AllowedSortFields). A
 * column absent here is not sortable. The URL keeps the API form ("-risk_score"),
 * so links made before the columns were renamed still sort the same way.
 */
export const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  type: 'type',
  criticality: 'criticality',
  exposure: 'exposure',
  risk: 'risk_score',
  findings: 'finding_count',
  last_seen: 'last_seen',
}

/** URL sort ("-risk_score") → table sorting state. Unknown fields are ignored. */
export function sortToSorting(sort?: string): SortingState {
  if (!sort) return []
  const desc = sort.startsWith('-')
  const field = desc ? sort.slice(1) : sort
  const id = Object.keys(SORT_FIELDS).find((k) => SORT_FIELDS[k] === field)
  return id ? [{ id, desc }] : []
}

/** Table sorting state → URL sort, or undefined when unsorted / not sortable. */
export function sortingToSort(sorting: SortingState): string | undefined {
  const first = sorting[0]
  const field = first ? SORT_FIELDS[first.id] : undefined
  if (!first || !field) return undefined
  return first.desc ? `-${field}` : field
}

// Re-exported so consumers building typed multi-selects don't re-derive them.
export type { AssetType, Criticality, ExposureLevel, AssetScope }

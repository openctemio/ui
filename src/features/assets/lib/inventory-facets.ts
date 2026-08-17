/**
 * Facet + quick-preset definitions for the unified All-Assets inventory.
 *
 * Facets are grouped the way a CTEM analyst reasons about scope — Kind /
 * Business / Exposure / Lifecycle — rather than by data type. Each multi-select
 * facet is bound to an array filter key; each value's live count comes from the
 * /assets/stats aggregate response (see AssetStatsData). Boolean facets (owner
 * presence, internet reachability, control-plane) render as tri-state toggles.
 */

import type { AssetStatsData } from '../hooks/use-assets'
import type { InventoryFilters } from './inventory-url'
import { ASSET_TYPE_LABELS, ASSET_SCOPE_LABELS, EXPOSURE_LEVEL_LABELS } from '../types/asset.types'
import { CRITICALITY_LABELS } from '@/lib/criticality-colors'

/** Data classification levels (mirrors the api CHECK constraint on assets). */
export const DATA_CLASSIFICATION_LABELS: Record<string, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  restricted: 'Restricted',
  secret: 'Secret',
}

/** Deployment environments (mirrors the api CHECK constraint on assets). */
export const ENVIRONMENT_LABELS: Record<string, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
  testing: 'Testing',
  dr: 'Disaster Recovery',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
}

/**
 * How a facet sources the *set* of values it offers:
 *  - 'static': a fixed ordered list (enum-like) — always shown, count may be 0.
 *  - 'dynamic': keys discovered from the stats count map (type, provider, BU).
 */
export type FacetValueSource = 'static' | 'dynamic'

export interface MultiFacetDef {
  kind: 'multi'
  /** InventoryFilters key holding the selected values (an array field). */
  filterKey: Extract<
    keyof InventoryFilters,
    | 'types'
    | 'criticalities'
    | 'statuses'
    | 'scopes'
    | 'exposures'
    | 'dataClassifications'
    | 'environments'
    | 'providers'
    | 'businessUnitIds'
  >
  label: string
  source: FacetValueSource
  /** Static ordered value list (source==='static'). */
  values?: string[]
  /** Human label for a value; falls back to the raw value. */
  labelFor?: (value: string) => string
  /** Live per-value count map from stats. */
  counts: (stats: AssetStatsData) => Record<string, number>
  /** Show a search box within the facet (long lists: BU, provider, tags). */
  searchable?: boolean
}

export interface BoolFacetDef {
  kind: 'bool'
  filterKey: Extract<keyof InventoryFilters, 'hasOwner' | 'isControlPlane' | 'isInternetAccessible'>
  label: string
  /** Label + count for the true / false options. */
  trueLabel: string
  falseLabel: string
  counts: (stats: AssetStatsData) => Record<string, number> // keys "true"|"false"
}

export type FacetDef = MultiFacetDef | BoolFacetDef

export interface FacetGroup {
  id: string
  label: string
  facets: FacetDef[]
}

const identity = (v: string) => v

/**
 * Build the facet groups. `businessUnitLabels` maps a BU id -> name (fetched
 * separately) so the Business-unit facet shows names, not UUIDs.
 */
export function buildFacetGroups(businessUnitLabels: Record<string, string>): FacetGroup[] {
  return [
    {
      id: 'kind',
      label: 'Kind',
      facets: [
        {
          kind: 'multi',
          filterKey: 'types',
          label: 'Asset type',
          source: 'dynamic',
          labelFor: (v) => ASSET_TYPE_LABELS[v as keyof typeof ASSET_TYPE_LABELS] ?? v,
          counts: (s) => s.byType,
          searchable: true,
        },
        {
          kind: 'multi',
          filterKey: 'criticalities',
          label: 'Criticality',
          source: 'static',
          values: ['critical', 'high', 'medium', 'low'],
          labelFor: (v) => CRITICALITY_LABELS[v as keyof typeof CRITICALITY_LABELS] ?? v,
          counts: (s) => s.byCriticality,
        },
      ],
    },
    {
      id: 'business',
      label: 'Business',
      facets: [
        {
          kind: 'multi',
          filterKey: 'businessUnitIds',
          label: 'Business unit',
          source: 'dynamic',
          labelFor: (v) => businessUnitLabels[v] ?? v,
          counts: (s) => s.byBusinessUnit,
          searchable: true,
        },
        {
          kind: 'bool',
          filterKey: 'hasOwner',
          label: 'Ownership',
          trueLabel: 'Has owner',
          falseLabel: 'Unowned',
          counts: (s) => s.byHasOwner,
        },
        {
          kind: 'multi',
          filterKey: 'dataClassifications',
          label: 'Data classification',
          source: 'static',
          values: ['public', 'internal', 'confidential', 'restricted', 'secret'],
          labelFor: (v) => DATA_CLASSIFICATION_LABELS[v] ?? v,
          counts: (s) => s.byDataClassification,
        },
      ],
    },
    {
      id: 'exposure',
      label: 'Exposure',
      facets: [
        {
          kind: 'multi',
          filterKey: 'exposures',
          label: 'Exposure level',
          source: 'static',
          values: ['public', 'restricted', 'private', 'isolated', 'unknown'],
          labelFor: (v) => EXPOSURE_LEVEL_LABELS[v as keyof typeof EXPOSURE_LEVEL_LABELS] ?? v,
          counts: (s) => s.byExposure,
        },
        {
          kind: 'bool',
          filterKey: 'isInternetAccessible',
          label: 'Internet reachability',
          trueLabel: 'Internet-facing',
          falseLabel: 'Not reachable',
          counts: (s) => s.byInternetAccessible,
        },
        {
          kind: 'bool',
          filterKey: 'isControlPlane',
          label: 'Control plane',
          trueLabel: 'Control plane',
          falseLabel: 'Not a control plane',
          counts: (s) => s.byControlPlane,
        },
        {
          kind: 'multi',
          filterKey: 'scopes',
          label: 'Scope',
          source: 'static',
          values: ['internal', 'external', 'cloud', 'partner', 'vendor', 'shadow'],
          labelFor: (v) => ASSET_SCOPE_LABELS[v as keyof typeof ASSET_SCOPE_LABELS] ?? v,
          counts: (s) => s.byScope,
        },
      ],
    },
    {
      id: 'lifecycle',
      label: 'Lifecycle',
      facets: [
        {
          kind: 'multi',
          filterKey: 'statuses',
          label: 'Status',
          source: 'static',
          values: ['active', 'inactive', 'archived'],
          labelFor: (v) => STATUS_LABELS[v] ?? v,
          counts: (s) => s.byStatus,
        },
        {
          kind: 'multi',
          filterKey: 'environments',
          label: 'Environment',
          source: 'static',
          values: ['production', 'staging', 'development', 'testing', 'dr'],
          labelFor: (v) => ENVIRONMENT_LABELS[v] ?? v,
          counts: (s) => s.byEnvironment,
        },
        {
          kind: 'multi',
          filterKey: 'providers',
          label: 'Provider / source',
          source: 'dynamic',
          labelFor: identity,
          counts: (s) => s.byProvider,
          searchable: true,
        },
      ],
    },
  ]
}

/** A one-click preset: a partial filter patch + a predicate for "is it active". */
export interface QuickPreset {
  id: string
  label: string
  /** The filter values this preset sets when activated. */
  apply: Partial<InventoryFilters>
  /** Active when every key in `apply` matches the current filters. */
  isActive: (f: InventoryFilters) => boolean
}

/** now - 30 days as an ISO instant (recomputed per call so it stays fresh). */
export function staleBeforeISO(days = 30): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'crown-jewels',
    label: 'Crown jewels',
    apply: { isCrownJewel: true },
    isActive: (f) => f.isCrownJewel === true,
  },
  {
    id: 'internet-facing',
    label: 'Internet-facing',
    apply: { isInternetAccessible: true },
    isActive: (f) => f.isInternetAccessible === true,
  },
  {
    id: 'critical-with-findings',
    label: 'Critical + has findings',
    apply: { criticalities: ['critical'], hasFindings: true },
    isActive: (f) => f.criticalities?.includes('critical') === true && f.hasFindings === true,
  },
  {
    id: 'unowned',
    label: 'Unowned',
    apply: { hasOwner: false },
    isActive: (f) => f.hasOwner === false,
  },
  {
    id: 'control-planes',
    label: 'Control planes',
    apply: { isControlPlane: true },
    isActive: (f) => f.isControlPlane === true,
  },
  {
    id: 'stale',
    label: 'Stale >30d',
    apply: { lastSeenBefore: staleBeforeISO(30) },
    isActive: (f) => !!f.lastSeenBefore,
  },
]

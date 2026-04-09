import type { ColumnDef } from '@tanstack/react-table'
import type { Asset } from './asset.types'
import type { ExportFieldConfig } from '../hooks/use-asset-export'
import type { AssetStatsData } from '../hooks/use-assets'

/**
 * Configuration for a type-specific asset page.
 * Each standard asset page provides ONLY this config —
 * all shared behavior (CRUD, scope, permissions, table, dialogs) is derived from it.
 */
export interface AssetPageConfig {
  /** Asset type identifier (maps to API filter) */
  type: string

  /** Multiple asset types to fetch (overrides `type` for API filter) */
  types?: string[]

  /** Display name (singular) — e.g., "Service" */
  label: string

  /** Display name (plural) — e.g., "Services" */
  labelPlural: string

  /** Page description shown in header */
  description: string

  /** Icon component for the page header and table rows */
  icon: React.ComponentType<{ className?: string }>

  /** Icon color class — e.g., 'text-blue-500' */
  iconColor: string

  /** Gradient from class — e.g., 'from-blue-500/20' */
  gradientFrom: string

  /** Gradient via class — e.g., 'via-blue-500/10' */
  gradientVia: string

  /** Type-specific columns (common columns are auto-added by buildAssetColumns) */
  columns: ColumnDef<Asset>[]

  /** Form field configuration for create/edit dialogs */
  formFields: FormFieldConfig[]

  /** Stats card definitions (beyond the default "Total" card) */
  statsCards?: StatsCardConfig[]

  /** Detail sheet overview sections */
  detailSections?: DetailSectionConfig[]

  /** Detail sheet stats (3-column grid) */
  detailStats?: DetailStatConfig[]

  /** Export field configuration */
  exportFields: ExportFieldConfig<Asset>[]

  /** Optional: additional type-specific filter (single) */
  customFilter?: CustomFilterConfig

  /** Optional: multiple additional filters (overrides customFilter if set) */
  customFilters?: CustomFilterConfig[]

  /** Optional: copy action in row dropdown */
  copyAction?: {
    label: string
    getValue: (asset: Asset) => string
  }

  /** Optional: custom row actions in dropdown menu (before delete) */
  rowActions?: RowActionConfig[]

  /** Optional: custom bulk actions in selection dropdown (before delete) */
  bulkActions?: BulkActionConfig[]

  /** Optional: extra tabs in detail sheet (between Overview and Findings) */
  detailTabs?: DetailTabConfig[]

  /** Optional: custom status filter values (overrides default active/inactive/pending) */
  statusFilters?: { value: string; label: string }[]

  /** Default sort field and direction */
  defaultSort?: { field: string; direction: 'asc' | 'desc' }

  /** Whether to include AssetGroupSelect in forms */
  includeGroupSelect?: boolean

  /** Optional: transform fetched assets before rendering (e.g., tree flattening) */
  dataTransform?: (assets: Asset[]) => Asset[]

  /** Optional: pre-table content (e.g., banners, alerts) */
  headerContent?: React.ComponentType<{ assets: Asset[] }>
}

/** Form field configuration */
export interface FormFieldConfig {
  /** Field name */
  name: string

  /** Display label */
  label: string

  /** Field type determines the input component */
  type: 'text' | 'textarea' | 'select' | 'number' | 'tags' | 'boolean'

  /** Placeholder text */
  placeholder?: string

  /** Whether this field is required */
  required?: boolean

  /** Options for select fields */
  options?: { label: string; value: string }[]

  /** Whether this field maps to asset.metadata[name] vs top-level */
  isMetadata?: boolean

  /** Visual group label (for form layout) */
  group?: string

  /** Full width (span both columns) */
  fullWidth?: boolean

  /** Default value */
  defaultValue?: string | boolean | number
}

/** Stats card config for the page header */
export interface StatsCardConfig {
  title: string
  icon: React.ComponentType<{ className?: string }>
  /**
   * Compute the displayed value.
   * Receives:
   *   - `assets`: the current page's transformed assets (50 max)
   *   - `stats`: full type-scoped aggregated stats from `/assets/stats?types=…`
   *
   * Prefer `stats` for any global count (Active, With Findings, etc.) so the
   * card reflects the entire dataset, not just the current page.
   * Use `assets` only for stats that depend on per-row metadata not aggregated
   * by the backend (e.g. `metadata.isVirtual`).
   */
  compute: (assets: Asset[], stats: AssetStatsData) => number | string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

/** Detail sheet section (overview tab) */
export interface DetailSectionConfig {
  title: string
  fields: {
    label: string
    getValue: (asset: Asset) => React.ReactNode
    /** Full width in the 2-column grid */
    fullWidth?: boolean
  }[]
}

/** Detail sheet stat card */
export interface DetailStatConfig {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  getValue: (asset: Asset) => string | number
}

/** Custom filter config */
export interface CustomFilterConfig {
  label: string
  options: { label: string; value: string }[]
  filterFn: (asset: Asset, value: string) => boolean
}

/** Row action config (appears in row dropdown menu) */
export interface RowActionConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (asset: Asset) => void | Promise<void>
  /** Optional: permission required to see this action */
  permission?: string
}

/** Bulk action config (appears when rows are selected) */
export interface BulkActionConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (assets: Asset[]) => void | Promise<void>
  /** Optional: variant for styling */
  variant?: 'default' | 'destructive'
  /** Optional: permission required to see this action */
  permission?: string
}

/** Detail tab config (extra tabs in detail sheet) */
export interface DetailTabConfig {
  id: string
  label: string
  render: (asset: Asset) => React.ReactNode
}

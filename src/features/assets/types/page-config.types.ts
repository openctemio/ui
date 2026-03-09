import type { ColumnDef } from '@tanstack/react-table'
import type { Asset } from './asset.types'
import type { ExportFieldConfig } from '../hooks/use-asset-export'

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

  /** Optional: additional type-specific filter */
  customFilter?: CustomFilterConfig

  /** Optional: copy action in row dropdown */
  copyAction?: {
    label: string
    getValue: (asset: Asset) => string
  }

  /** Default sort field and direction */
  defaultSort?: { field: string; direction: 'asc' | 'desc' }

  /** Whether to include AssetGroupSelect in forms */
  includeGroupSelect?: boolean

  /** Optional: transform fetched assets before rendering (e.g., tree flattening) */
  dataTransform?: (assets: Asset[]) => Asset[]
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
  compute: (assets: Asset[]) => number | string
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

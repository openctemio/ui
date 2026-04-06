'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type {
  AssetPageConfig,
  FormFieldConfig,
  DetailSectionConfig,
  DetailStatConfig,
  StatsCardConfig,
} from '../types/page-config.types'
import type { Asset } from '../types'
import type { ExportFieldConfig } from '../hooks/use-asset-export'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Shield, Activity } from 'lucide-react'

// =============================================================================
// Common columns shared across ALL asset types
// =============================================================================

/** Metadata text column - shows a metadata field as plain text */
export function metadataTextColumn(
  key: string,
  header: string,
  opts?: { fallback?: string }
): ColumnDef<Asset> {
  return {
    id: key,
    header,
    cell: ({ row }) => (
      <span className="text-sm">
        {((row.original.metadata as Record<string, unknown>)[key] as string) ||
          opts?.fallback ||
          '-'}
      </span>
    ),
  }
}

/** Metadata badge column - shows a metadata field as a badge */
export function metadataBadgeColumn(
  key: string,
  header: string,
  opts?: { colorMap?: Record<string, string> }
): ColumnDef<Asset> {
  return {
    id: key,
    header,
    cell: ({ row }) => {
      const value = (row.original.metadata as Record<string, unknown>)[key] as string
      if (!value) return <span className="text-muted-foreground">-</span>
      const color = opts?.colorMap?.[value] || ''
      return (
        <Badge variant="outline" className={`text-xs ${color}`}>
          {value}
        </Badge>
      )
    },
  }
}

/** Boolean metadata column - shows check/cross icon */
export function metadataBoolColumn(key: string, header: string): ColumnDef<Asset> {
  return {
    id: key,
    header,
    cell: ({ row }) => {
      const value = (row.original.metadata as Record<string, unknown>)[key]
      return value ? (
        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
          Yes
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          No
        </Badge>
      )
    },
  }
}

// =============================================================================
// Common form fields shared across categories
// =============================================================================

export const commonFormFields = {
  name: (label = 'Name', placeholder = 'Enter name'): FormFieldConfig => ({
    name: 'name',
    label,
    type: 'text',
    placeholder,
    required: true,
  }),
  description: (placeholder = 'Optional description'): FormFieldConfig => ({
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder,
    fullWidth: true,
  }),
  provider: (options: { label: string; value: string }[]): FormFieldConfig => ({
    name: 'provider',
    label: 'Provider',
    type: 'select',
    options,
    isMetadata: true,
  }),
  region: (): FormFieldConfig => ({
    name: 'region',
    label: 'Region',
    type: 'text',
    placeholder: 'e.g., us-east-1',
    isMetadata: true,
  }),
  environment: (): FormFieldConfig => ({
    name: 'environment',
    label: 'Environment',
    type: 'select',
    options: [
      { label: 'Production', value: 'production' },
      { label: 'Staging', value: 'staging' },
      { label: 'Development', value: 'development' },
      { label: 'Testing', value: 'testing' },
    ],
    isMetadata: true,
  }),
  url: (label = 'URL', placeholder = 'https://...'): FormFieldConfig => ({
    name: 'url',
    label,
    type: 'text',
    placeholder,
    isMetadata: true,
  }),
  ipAddress: (): FormFieldConfig => ({
    name: 'ipAddress',
    label: 'IP Address',
    type: 'text',
    placeholder: '0.0.0.0',
    isMetadata: true,
  }),
  port: (): FormFieldConfig => ({
    name: 'port',
    label: 'Port',
    type: 'number',
    isMetadata: true,
  }),
  encrypted: (): FormFieldConfig => ({
    name: 'encrypted',
    label: 'Encrypted',
    type: 'boolean',
    isMetadata: true,
  }),
  publicAccess: (): FormFieldConfig => ({
    name: 'publicAccess',
    label: 'Public Access',
    type: 'boolean',
    isMetadata: true,
  }),
}

// =============================================================================
// Common stats cards
// =============================================================================

export const commonStatsCards = {
  highRisk: (): StatsCardConfig => ({
    title: 'High Risk',
    icon: AlertTriangle,
    compute: (assets) => assets.filter((a) => a.riskScore >= 70).length,
    variant: 'danger',
  }),
  withFindings: (): StatsCardConfig => ({
    title: 'With Findings',
    icon: Shield,
    compute: (assets) => assets.filter((a) => a.findingCount > 0).length,
    variant: 'warning',
  }),
  active: (): StatsCardConfig => ({
    title: 'Active',
    icon: Activity,
    compute: (assets) => assets.filter((a) => a.status === 'active').length,
    variant: 'success',
  }),
}

// =============================================================================
// Common export fields
// =============================================================================

export const commonExportFields: ExportFieldConfig<Asset>[] = [
  { header: 'Name', accessor: (a) => a.name },
  { header: 'Status', accessor: (a) => a.status },
  { header: 'Criticality', accessor: (a) => a.criticality },
  { header: 'Risk Score', accessor: (a) => String(a.riskScore) },
  { header: 'Findings', accessor: (a) => String(a.findingCount) },
  { header: 'Scope', accessor: (a) => a.scope },
  { header: 'Exposure', accessor: (a) => a.exposure },
  { header: 'Tags', accessor: (a) => (a.tags || []).join(', ') },
]

/** Add metadata export fields */
export function metadataExportFields(
  ...fields: { header: string; key: string }[]
): ExportFieldConfig<Asset>[] {
  return fields.map(({ header, key }) => ({
    header,
    accessor: (a: Asset) => String((a.metadata as Record<string, unknown>)[key] || ''),
  }))
}

// =============================================================================
// Common detail sections
// =============================================================================

export function metadataDetailSection(
  title: string,
  fields: { label: string; key: string; fullWidth?: boolean }[]
): DetailSectionConfig {
  return {
    title,
    fields: fields.map((f) => ({
      label: f.label,
      getValue: (asset: Asset) =>
        ((asset.metadata as Record<string, unknown>)[f.key] as string) || '-',
      fullWidth: f.fullWidth,
    })),
  }
}

// =============================================================================
// Config Builder
// =============================================================================

interface ConfigBuilderInput {
  type: string
  types?: string[]
  label: string
  labelPlural: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  gradientFrom: string
  gradientVia: string

  /** Type-specific columns (added after common name column) */
  columns?: ColumnDef<Asset>[]

  /** Type-specific form fields (name + description added automatically) */
  formFields?: FormFieldConfig[]

  /** Stats cards (highRisk + withFindings added automatically) */
  statsCards?: StatsCardConfig[]

  /** Detail sheet sections */
  detailSections?: DetailSectionConfig[]

  /** Detail sheet stat cards */
  detailStats?: DetailStatConfig[]

  /** Extra export fields (common fields included automatically) */
  exportFields?: ExportFieldConfig<Asset>[]

  /** Any other AssetPageConfig overrides */
  overrides?: Partial<AssetPageConfig>
}

/**
 * Build a complete AssetPageConfig from minimal input.
 * Automatically includes common stats, export fields, and form fields.
 */
export function buildAssetPageConfig(input: ConfigBuilderInput): AssetPageConfig {
  return {
    type: input.type,
    types: input.types,
    label: input.label,
    labelPlural: input.labelPlural,
    description: input.description,
    icon: input.icon,
    iconColor: input.iconColor,
    gradientFrom: input.gradientFrom,
    gradientVia: input.gradientVia,

    columns: input.columns || [],

    formFields: [
      commonFormFields.name(input.label + ' Name', `Enter ${input.label.toLowerCase()} name`),
      commonFormFields.description(),
      ...(input.formFields || []),
    ],

    statsCards: [
      commonStatsCards.highRisk(),
      commonStatsCards.withFindings(),
      ...(input.statsCards || []),
    ],

    detailSections: input.detailSections,
    detailStats: input.detailStats,

    exportFields: [...commonExportFields, ...(input.exportFields || [])],

    ...input.overrides,
  }
}

/**
 * Source Layout Registry
 *
 * Config-driven architecture that maps findingType/source to:
 * - Hero component (rendered between header and tabs)
 * - Tab order (first tab is default active)
 * - Hidden tabs (e.g., attack-path for non-SAST sources)
 */

import type { ComponentType } from 'react'
import type { FindingDetail, FindingType, FindingSource } from '../types'

export interface SourceLayoutConfig {
  /** Component rendered between header and tabs */
  heroComponent?: ComponentType<{ finding: FindingDetail }>
  /** Tab order — first tab is default active. Unlisted tabs use default order */
  tabOrder?: string[]
  /** Tabs to hide for this source */
  hiddenTabs?: string[]
}

// Lazy imports to avoid circular deps — components imported where used
// These will be set by the registration function
const TYPE_LAYOUTS: Partial<Record<FindingType, SourceLayoutConfig>> = {}
const SOURCE_LAYOUTS: Partial<Record<FindingSource, SourceLayoutConfig>> = {}

/**
 * Register a layout config for a finding type
 */
export function registerTypeLayout(type: FindingType, config: SourceLayoutConfig) {
  TYPE_LAYOUTS[type] = config
}

/**
 * Register a layout config for a finding source
 */
export function registerSourceLayout(source: FindingSource, config: SourceLayoutConfig) {
  SOURCE_LAYOUTS[source] = config
}

/**
 * Get layout config for a finding.
 * Priority: findingType (more specific) > source > default (empty)
 */
export function getSourceLayout(finding: FindingDetail): SourceLayoutConfig {
  // 1. Check findingType first (more specific)
  if (finding.findingType && TYPE_LAYOUTS[finding.findingType]) {
    return TYPE_LAYOUTS[finding.findingType]!
  }
  // 2. Fallback to source
  if (finding.source && SOURCE_LAYOUTS[finding.source]) {
    return SOURCE_LAYOUTS[finding.source]!
  }
  // 3. Default: no hero, standard tab order
  return {}
}

/** Default tab order when no layout config specifies one */
export const DEFAULT_TAB_ORDER = ['overview', 'evidence', 'remediation', 'attack-path', 'related']

/**
 * Get ordered and filtered tabs for a finding
 */
export function getOrderedTabs(layout: SourceLayoutConfig): string[] {
  const order = layout.tabOrder || DEFAULT_TAB_ORDER
  const hidden = new Set(layout.hiddenTabs || [])
  return order.filter((tab) => !hidden.has(tab))
}

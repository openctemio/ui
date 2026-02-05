/**
 * Capability API Types
 *
 * TypeScript types for Capability Management
 * Supports both platform (builtin) and tenant custom capabilities
 */

/**
 * Capability entity
 */
export interface Capability {
  id: string
  tenant_id?: string // null for platform capabilities, UUID for custom capabilities
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  category?: string // security, recon, analysis
  is_builtin: boolean
  sort_order: number
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Create capability request (for tenant custom capabilities)
 */
export interface CreateCapabilityRequest {
  name: string
  display_name: string
  description?: string
  icon?: string
  color?: string
  category?: string
}

/**
 * Update capability request
 */
export interface UpdateCapabilityRequest {
  display_name: string
  description?: string
  icon?: string
  color?: string
  category?: string
}

/**
 * Capability list response
 */
export interface CapabilityListResponse {
  items: Capability[]
  total: number
  page: number
  per_page: number
}

/**
 * Capability list filters
 */
export interface CapabilityListFilters {
  is_builtin?: boolean
  category?: string
  search?: string
  page?: number
  per_page?: number
}

/**
 * Capability all list response (for dropdowns, no pagination)
 */
export interface CapabilityAllResponse {
  items: Capability[]
}

/**
 * Capability categories response
 */
export interface CapabilityCategoriesResponse {
  items: string[]
}

/**
 * Capability usage statistics
 */
export interface CapabilityUsageStats {
  tool_count: number
  agent_count: number
  tool_names?: string[]
  agent_names?: string[]
}

/**
 * Batch usage stats request
 */
export interface CapabilityUsageStatsBatchRequest {
  ids: string[]
}

/**
 * Batch usage stats response - map of capability ID to stats
 */
export type CapabilityUsageStatsBatchResponse = Record<string, CapabilityUsageStats>

// =============================================================================
// Capability Lookup Helpers
// =============================================================================

/**
 * Get capability icon from registry data, with fallback to default
 * @param capabilities - List of capabilities from API
 * @param capabilityName - The capability name to look up
 * @returns The icon name (Lucide icon)
 */
export function getCapabilityIcon(
  capabilities: Capability[] | undefined,
  capabilityName: string
): string {
  const capability = capabilities?.find((c) => c.name === capabilityName)
  return capability?.icon || FALLBACK_CAPABILITY_ICONS[capabilityName] || 'zap'
}

/**
 * Get capability color from registry data, with fallback to default
 * @param capabilities - List of capabilities from API
 * @param capabilityName - The capability name to look up
 * @returns The color name
 */
export function getCapabilityColor(
  capabilities: Capability[] | undefined,
  capabilityName: string
): string {
  const capability = capabilities?.find((c) => c.name === capabilityName)
  return capability?.color || FALLBACK_CAPABILITY_COLORS[capabilityName] || 'gray'
}

/**
 * Get capability display name from registry data, with fallback
 * @param capabilities - List of capabilities from API
 * @param capabilityName - The capability name to look up
 * @returns The display name
 */
export function getCapabilityDisplayName(
  capabilities: Capability[] | undefined,
  capabilityName: string
): string {
  const capability = capabilities?.find((c) => c.name === capabilityName)
  return capability?.display_name || capabilityName.toUpperCase()
}

/**
 * Get capability description from registry data
 * @param capabilities - List of capabilities from API
 * @param capabilityName - The capability name to look up
 * @returns The description or undefined
 */
export function getCapabilityDescription(
  capabilities: Capability[] | undefined,
  capabilityName: string
): string | undefined {
  const capability = capabilities?.find((c) => c.name === capabilityName)
  return capability?.description
}

// =============================================================================
// Fallback Constants (used when API data not available)
// =============================================================================

/**
 * @deprecated Use getCapabilityIcon() with API data instead.
 * These are fallback values for when API data is not available.
 */
export const FALLBACK_CAPABILITY_ICONS: Record<string, string> = {
  // Security Analysis
  sast: 'code',
  sca: 'package',
  dast: 'globe',
  secrets: 'key',
  iac: 'server',
  container: 'box',
  api: 'plug',
  cloud: 'cloud',
  mobile: 'smartphone',
  // Specialized Security
  web: 'globe-2',
  xss: 'alert-triangle',
  terraform: 'file-code',
  docker: 'container',
  compliance: 'shield-check',
  // Reconnaissance
  recon: 'search',
  subdomain: 'layers',
  http: 'wifi',
  portscan: 'radio',
  crawler: 'spider',
  // Analysis
  sbom: 'file-text',
  reporting: 'file-chart-line',
  'ai-triage': 'brain',
}

/**
 * @deprecated Use getCapabilityColor() with API data instead.
 * These are fallback values for when API data is not available.
 */
export const FALLBACK_CAPABILITY_COLORS: Record<string, string> = {
  // Security Analysis
  sast: 'blue',
  sca: 'purple',
  dast: 'green',
  secrets: 'red',
  iac: 'orange',
  container: 'cyan',
  api: 'blue',
  cloud: 'sky',
  mobile: 'purple',
  // Specialized Security
  web: 'green',
  xss: 'amber',
  terraform: 'violet',
  docker: 'sky',
  compliance: 'emerald',
  // Reconnaissance
  recon: 'yellow',
  subdomain: 'lime',
  http: 'teal',
  portscan: 'indigo',
  crawler: 'fuchsia',
  // Analysis
  sbom: 'slate',
  reporting: 'slate',
  'ai-triage': 'violet',
}

/**
 * @deprecated Use getCapabilityIcon() instead
 */
export const CAPABILITY_ICONS = FALLBACK_CAPABILITY_ICONS

/**
 * @deprecated Use getCapabilityColor() instead
 */
export const CAPABILITY_COLORS = FALLBACK_CAPABILITY_COLORS

// =============================================================================
// Capability Validation Helpers
// =============================================================================

/**
 * Validates that all capability names exist in the registry.
 * Use this for form submission validation.
 *
 * @param capabilities - List of capabilities from API
 * @param capabilityNames - Array of capability names to validate
 * @returns Object with validation result and invalid names
 *
 * @example
 * ```tsx
 * const { data } = useAllCapabilities();
 * const result = validateCapabilityNames(data?.items, ['sast', 'invalid-cap']);
 * if (!result.valid) {
 *   console.error('Invalid capabilities:', result.invalidNames);
 * }
 * ```
 */
export function validateCapabilityNames(
  capabilities: Capability[] | undefined,
  capabilityNames: string[]
): { valid: boolean; invalidNames: string[] } {
  if (!capabilities || capabilities.length === 0) {
    // If no capabilities loaded, assume all are valid (will be validated by backend)
    return { valid: true, invalidNames: [] }
  }

  const validNames = new Set(capabilities.map((c) => c.name))
  const invalidNames = capabilityNames.filter((name) => !validNames.has(name))

  return {
    valid: invalidNames.length === 0,
    invalidNames,
  }
}

/**
 * Get a list of valid capability names from a list of potentially invalid names.
 * Filters out names that don't exist in the registry.
 *
 * @param capabilities - List of capabilities from API
 * @param capabilityNames - Array of capability names to filter
 * @returns Array of valid capability names only
 */
export function filterValidCapabilityNames(
  capabilities: Capability[] | undefined,
  capabilityNames: string[]
): string[] {
  if (!capabilities || capabilities.length === 0) {
    return capabilityNames // Return as-is if no registry data
  }

  const validNames = new Set(capabilities.map((c) => c.name))
  return capabilityNames.filter((name) => validNames.has(name))
}

/**
 * Check if a single capability name is valid.
 *
 * @param capabilities - List of capabilities from API
 * @param name - Capability name to check
 * @returns true if capability exists in registry
 */
export function isValidCapabilityName(
  capabilities: Capability[] | undefined,
  name: string
): boolean {
  if (!capabilities || capabilities.length === 0) {
    return true // Assume valid if no registry data
  }
  return capabilities.some((c) => c.name === name)
}

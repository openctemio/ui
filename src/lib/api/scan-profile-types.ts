/**
 * Scan Profile API Types
 *
 * TypeScript types for Scan Profile Management
 */

// Intensity levels
export type Intensity = 'low' | 'medium' | 'high'

// Severity levels for tool findings
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

// Template modes for scanner templates
export type TemplateMode = 'default' | 'custom' | 'both'

/**
 * Tool configuration within a scan profile
 */
export interface ToolConfig {
  enabled: boolean
  severity?: Severity
  timeout?: number
  options?: Record<string, unknown>
  template_mode?: TemplateMode // "default", "custom", "both"
  custom_template_ids?: string[] // IDs of custom templates to use
}

/**
 * Quality Gate configuration for CI/CD pass/fail decisions
 */
export interface QualityGate {
  enabled: boolean
  fail_on_critical: boolean
  fail_on_high: boolean
  max_critical: number // -1 = unlimited
  max_high: number
  max_medium: number
  max_total: number
  new_findings_only?: boolean
  baseline_branch?: string
}

/**
 * Quality Gate breach when threshold is exceeded
 */
export interface QualityGateBreach {
  metric: 'critical' | 'high' | 'medium' | 'total'
  limit: number
  actual: number
}

/**
 * Finding counts by severity
 */
export interface FindingCounts {
  critical: number
  high: number
  medium: number
  low: number
  info: number
  total: number
}

/**
 * Quality Gate evaluation result
 */
export interface QualityGateResult {
  passed: boolean
  reason?: string
  breaches?: QualityGateBreach[]
  counts: FindingCounts
}

/**
 * Scan Profile entity
 */
export interface ScanProfile {
  id: string
  tenant_id: string
  name: string
  description?: string
  is_default: boolean
  is_system: boolean
  tools_config: Record<string, ToolConfig>
  intensity: Intensity
  max_concurrent_scans: number
  timeout_seconds: number
  tags: string[]
  metadata: Record<string, unknown>
  quality_gate: QualityGate
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Create scan profile request
 */
export interface CreateScanProfileRequest {
  name: string
  description?: string
  tools_config?: Record<string, ToolConfig>
  intensity?: Intensity
  max_concurrent_scans?: number
  timeout_seconds?: number
  tags?: string[]
  is_default?: boolean
  quality_gate?: QualityGate
}

/**
 * Update scan profile request
 */
export interface UpdateScanProfileRequest {
  name?: string
  description?: string
  tools_config?: Record<string, ToolConfig>
  intensity?: Intensity
  max_concurrent_scans?: number
  timeout_seconds?: number
  tags?: string[]
  quality_gate?: QualityGate
}

/**
 * Update quality gate request
 */
export interface UpdateQualityGateRequest {
  enabled: boolean
  fail_on_critical: boolean
  fail_on_high: boolean
  max_critical: number
  max_high: number
  max_medium: number
  max_total: number
  new_findings_only?: boolean
  baseline_branch?: string
}

/**
 * Clone scan profile request
 */
export interface CloneScanProfileRequest {
  new_name: string
}

/**
 * Scan profile list response
 */
export interface ScanProfileListResponse {
  items: ScanProfile[]
  total: number
  page: number
  per_page: number
}

/**
 * Scan profile list filters
 */
export interface ScanProfileListFilters {
  is_default?: boolean
  is_system?: boolean
  tags?: string[]
  search?: string
  page?: number
  per_page?: number
}

// Available tools for scan profiles
export const SCAN_PROFILE_TOOLS = [
  'semgrep',
  'trivy',
  'nuclei',
  'gitleaks',
  'checkov',
  'tfsec',
  'grype',
  'syft',
] as const

export type ScanProfileTool = (typeof SCAN_PROFILE_TOOLS)[number]

// Tool display names
export const TOOL_DISPLAY_NAMES: Record<ScanProfileTool, string> = {
  semgrep: 'Semgrep',
  trivy: 'Trivy',
  nuclei: 'Nuclei',
  gitleaks: 'Gitleaks',
  checkov: 'Checkov',
  tfsec: 'Tfsec',
  grype: 'Grype',
  syft: 'Syft',
}

// Tool descriptions
export const TOOL_DESCRIPTIONS: Record<ScanProfileTool, string> = {
  semgrep: 'Static application security testing (SAST)',
  trivy: 'Container and dependency vulnerability scanning',
  nuclei: 'Web vulnerability scanner',
  gitleaks: 'Secret detection in git repositories',
  checkov: 'Infrastructure as code security scanner',
  tfsec: 'Terraform security scanner',
  grype: 'Software composition analysis (SCA)',
  syft: 'SBOM generation and analysis',
}

// Intensity display names
export const INTENSITY_DISPLAY_NAMES: Record<Intensity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// Intensity descriptions
export const INTENSITY_DESCRIPTIONS: Record<Intensity, string> = {
  low: 'Fast scans with basic checks',
  medium: 'Balanced scans with standard checks',
  high: 'Comprehensive scans with all checks',
}

// Severity display names
export const SEVERITY_DISPLAY_NAMES: Record<Severity, string> = {
  info: 'Info',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

// Default Quality Gate configuration
export const DEFAULT_QUALITY_GATE: QualityGate = {
  enabled: false,
  fail_on_critical: false,
  fail_on_high: false,
  max_critical: -1,
  max_high: -1,
  max_medium: -1,
  max_total: -1,
  new_findings_only: false,
  baseline_branch: '',
}

/**
 * Create a new Quality Gate with defaults
 */
export function createDefaultQualityGate(overrides?: Partial<QualityGate>): QualityGate {
  return {
    ...DEFAULT_QUALITY_GATE,
    ...overrides,
  }
}

/**
 * Check if a quality gate threshold is unlimited
 */
export function isUnlimited(value: number): boolean {
  return value < 0
}

// Template mode display names
export const TEMPLATE_MODE_DISPLAY_NAMES: Record<TemplateMode, string> = {
  default: 'Default',
  custom: 'Custom Only',
  both: 'Both',
}

// Template mode descriptions
export const TEMPLATE_MODE_DESCRIPTIONS: Record<TemplateMode, string> = {
  default: 'Use only official/built-in templates',
  custom: 'Use only tenant-uploaded custom templates',
  both: 'Run both default and custom templates',
}

// ============================================
// PRESET SCAN PROFILES
// ============================================

export type PresetProfileType = 'discovery' | 'quick' | 'full' | 'compliance'

export interface PresetProfile {
  type: PresetProfileType
  name: string
  description: string
  icon: string
  intensity: Intensity
  tools_config: Record<string, ToolConfig>
  timeout_seconds: number
  quality_gate: QualityGate
  tags: string[]
}

/**
 * Preset scan profile configurations
 * These can be used to quickly create common scan profiles
 */
export const PRESET_PROFILES: Record<PresetProfileType, Omit<PresetProfile, 'type'>> = {
  discovery: {
    name: 'Discovery Scan',
    description: 'Fast discovery-focused scan for asset enumeration and basic reconnaissance',
    icon: 'radar',
    intensity: 'low',
    tools_config: {
      nuclei: { enabled: true, severity: 'info', timeout: 300 },
      syft: { enabled: true, timeout: 180 },
    },
    timeout_seconds: 1800, // 30 min
    quality_gate: { ...DEFAULT_QUALITY_GATE, enabled: false },
    tags: ['discovery', 'recon', 'fast'],
  },
  quick: {
    name: 'Quick Security Check',
    description: 'Fast security assessment for critical vulnerabilities only',
    icon: 'zap',
    intensity: 'low',
    tools_config: {
      semgrep: { enabled: true, severity: 'high', timeout: 300 },
      trivy: { enabled: true, severity: 'high', timeout: 300 },
      gitleaks: { enabled: true, timeout: 180 },
      nuclei: { enabled: true, severity: 'critical', timeout: 300 },
    },
    timeout_seconds: 1800, // 30 min
    quality_gate: {
      ...DEFAULT_QUALITY_GATE,
      enabled: true,
      fail_on_critical: true,
      max_critical: 0,
    },
    tags: ['quick', 'critical', 'ci-cd'],
  },
  full: {
    name: 'Full Security Scan',
    description: 'Comprehensive security assessment with all available scanners',
    icon: 'shield-check',
    intensity: 'high',
    tools_config: {
      semgrep: { enabled: true, severity: 'low', timeout: 600 },
      trivy: { enabled: true, severity: 'low', timeout: 600 },
      nuclei: { enabled: true, severity: 'low', timeout: 900 },
      gitleaks: { enabled: true, timeout: 300 },
      checkov: { enabled: true, timeout: 600 },
      tfsec: { enabled: true, timeout: 300 },
      grype: { enabled: true, severity: 'low', timeout: 600 },
      syft: { enabled: true, timeout: 300 },
    },
    timeout_seconds: 7200, // 2 hours
    quality_gate: {
      ...DEFAULT_QUALITY_GATE,
      enabled: true,
      fail_on_critical: true,
      fail_on_high: true,
      max_critical: 0,
      max_high: 5,
    },
    tags: ['full', 'comprehensive', 'thorough'],
  },
  compliance: {
    name: 'Compliance Audit',
    description: 'Security checks focused on compliance requirements (PCI DSS, SOC2, ISO 27001)',
    icon: 'clipboard-check',
    intensity: 'medium',
    tools_config: {
      semgrep: { enabled: true, severity: 'medium', timeout: 600 },
      trivy: { enabled: true, severity: 'medium', timeout: 600 },
      checkov: { enabled: true, timeout: 600 },
      tfsec: { enabled: true, timeout: 300 },
      gitleaks: { enabled: true, timeout: 300 },
    },
    timeout_seconds: 3600, // 1 hour
    quality_gate: {
      ...DEFAULT_QUALITY_GATE,
      enabled: true,
      fail_on_critical: true,
      fail_on_high: true,
      max_critical: 0,
      max_high: 0,
      max_medium: 10,
    },
    tags: ['compliance', 'audit', 'pci-dss', 'soc2'],
  },
}

export const PRESET_PROFILE_TYPES: PresetProfileType[] = [
  'discovery',
  'quick',
  'full',
  'compliance',
]

/**
 * Get a preset profile configuration ready for API submission
 */
export function getPresetProfileRequest(type: PresetProfileType): CreateScanProfileRequest {
  const preset = PRESET_PROFILES[type]
  return {
    name: preset.name,
    description: preset.description,
    tools_config: preset.tools_config,
    intensity: preset.intensity,
    timeout_seconds: preset.timeout_seconds,
    quality_gate: preset.quality_gate,
    tags: preset.tags,
    is_default: false,
  }
}

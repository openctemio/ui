/**
 * Scanner Template API Types
 *
 * TypeScript types for Custom Scanner Template Management
 * Supports Nuclei (YAML), Semgrep (YAML), and Gitleaks (TOML) templates
 */

// Template types supported by the platform
export const TEMPLATE_TYPES = ['nuclei', 'semgrep', 'gitleaks'] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

// Template statuses
export const TEMPLATE_STATUSES = [
  'active',
  'pending_review',
  'deprecated',
  'revoked',
] as const;

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

// Sync sources for templates
export const SYNC_SOURCES = ['manual', 'git', 's3', 'http'] as const;

export type SyncSource = (typeof SYNC_SOURCES)[number];

/**
 * Validation error from template validation
 */
export interface TemplateValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors?: TemplateValidationError[];
  rule_count: number;
  metadata?: Record<string, unknown>;
}

/**
 * Scanner Template entity
 */
export interface ScannerTemplate {
  id: string;
  tenant_id: string;
  source_id?: string;          // Reference to template source (null = manual upload)
  name: string;
  template_type: TemplateType;
  version: string;

  // Content storage
  content?: string;            // Base64 encoded content (for small templates)
  content_url?: string;        // S3 URL for large templates
  content_hash: string;        // SHA256 hash of content
  signature_hash: string;      // HMAC-SHA256 for verification

  // Metadata
  rule_count: number;
  description?: string;
  tags: string[];
  metadata?: Record<string, unknown>;

  // Status
  status: TemplateStatus;
  validation_error?: string;

  // Source tracking (for synced templates)
  sync_source?: SyncSource;    // How template was added (manual, git, s3, http)
  source_path?: string;        // Path within source (e.g., templates/sqli.yaml)
  source_commit?: string;      // Git commit hash

  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Helper to check if template is manually uploaded (stored in database)
 */
export function isManuallyUploadedTemplate(template: ScannerTemplate): boolean {
  return !template.source_id && (!template.sync_source || template.sync_source === 'manual');
}

/**
 * Create scanner template request
 */
export interface CreateScannerTemplateRequest {
  name: string;
  template_type: TemplateType;
  description?: string;
  content: string;             // Base64 encoded content
  tags?: string[];
}

/**
 * Update scanner template request
 */
export interface UpdateScannerTemplateRequest {
  name?: string;
  description?: string;
  content?: string;            // Base64 encoded content
  tags?: string[];
}

/**
 * Validate template request
 */
export interface ValidateScannerTemplateRequest {
  template_type: TemplateType;
  content: string;             // Base64 encoded content
}

/**
 * Scanner template list response
 */
export interface ScannerTemplateListResponse {
  items: ScannerTemplate[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Scanner template list filters
 */
export interface ScannerTemplateListFilters {
  template_type?: TemplateType;
  status?: TemplateStatus;
  tags?: string[];
  search?: string;
  page?: number;
  per_page?: number;
}

// Template type display names
export const TEMPLATE_TYPE_DISPLAY_NAMES: Record<TemplateType, string> = {
  nuclei: 'Nuclei',
  semgrep: 'Semgrep',
  gitleaks: 'Gitleaks',
};

// Template type descriptions
export const TEMPLATE_TYPE_DESCRIPTIONS: Record<TemplateType, string> = {
  nuclei: 'Web vulnerability scanning templates (YAML)',
  semgrep: 'Static analysis security rules (YAML)',
  gitleaks: 'Secret detection patterns (TOML)',
};

// Template type file extensions
export const TEMPLATE_TYPE_EXTENSIONS: Record<TemplateType, string> = {
  nuclei: '.yaml',
  semgrep: '.yaml',
  gitleaks: '.toml',
};

// Template type content types
export const TEMPLATE_TYPE_CONTENT_TYPES: Record<TemplateType, string> = {
  nuclei: 'application/x-yaml',
  semgrep: 'application/x-yaml',
  gitleaks: 'application/toml',
};

// Template type max sizes (in bytes)
export const TEMPLATE_TYPE_MAX_SIZES: Record<TemplateType, number> = {
  nuclei: 1024 * 1024,         // 1MB
  semgrep: 512 * 1024,         // 512KB
  gitleaks: 256 * 1024,        // 256KB
};

// Template type max rules
export const TEMPLATE_TYPE_MAX_RULES: Record<TemplateType, number> = {
  nuclei: 100,
  semgrep: 500,
  gitleaks: 1000,
};

// Template status display names
export const TEMPLATE_STATUS_DISPLAY_NAMES: Record<TemplateStatus, string> = {
  active: 'Active',
  pending_review: 'Pending Review',
  deprecated: 'Deprecated',
  revoked: 'Revoked',
};

// Template status colors for UI
export const TEMPLATE_STATUS_COLORS: Record<TemplateStatus, string> = {
  active: 'green',
  pending_review: 'yellow',
  deprecated: 'gray',
  revoked: 'red',
};

// Sync source display names
export const SYNC_SOURCE_DISPLAY_NAMES: Record<SyncSource, string> = {
  manual: 'Manual Upload',
  git: 'Git Repository',
  s3: 'S3/MinIO',
  http: 'HTTP URL',
};

/**
 * Template usage data for a tenant
 */
export interface TemplateUsage {
  total_templates: number;
  nuclei_templates: number;
  semgrep_templates: number;
  gitleaks_templates: number;
  total_storage_bytes: number;
}

/**
 * Template quota limits for a tenant
 */
export interface TemplateQuota {
  max_templates: number;
  max_templates_nuclei: number;
  max_templates_semgrep: number;
  max_templates_gitleaks: number;
  max_total_storage_bytes: number;
}

/**
 * Combined usage and quota response
 */
export interface TemplateUsageResponse {
  usage: TemplateUsage;
  quota: TemplateQuota;
}

/**
 * Helper to calculate usage percentage
 */
export function getUsagePercentage(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

/**
 * Helper to format storage size
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Helper to format template size
 */
export function formatTemplateSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Helper to check if template is editable
 */
export function isTemplateEditable(template: ScannerTemplate): boolean {
  return template.status === 'active' || template.status === 'pending_review';
}

/**
 * Helper to check if template is usable in scans
 */
export function isTemplateUsable(template: ScannerTemplate): boolean {
  return template.status === 'active';
}

/**
 * Helper to encode content to base64
 */
export function encodeTemplateContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

/**
 * Helper to decode base64 content
 */
export function decodeTemplateContent(base64: string): string {
  return decodeURIComponent(escape(atob(base64)));
}

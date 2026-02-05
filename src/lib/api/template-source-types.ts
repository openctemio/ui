/**
 * Template Source API Types
 *
 * TypeScript types for managing template sources (Git repos, S3 buckets, HTTP URLs)
 * Template sources are external locations where scanner templates are stored
 */

import type { TemplateType } from './scanner-template-types';

// Source types for templates
export const SOURCE_TYPES = ['git', 's3', 'http'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

// Sync statuses
export const SYNC_STATUSES = [
  'pending',
  'syncing',
  'success',
  'failed',
  'disabled',
] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

/**
 * Git source configuration
 */
export interface GitSourceConfig {
  url: string; // https://github.com/org/repo
  branch: string; // main, develop
  path: string; // templates/nuclei/
  auth_type: 'none' | 'ssh' | 'token' | 'oauth';
}

/**
 * S3 source configuration
 */
export interface S3SourceConfig {
  bucket: string;
  region: string;
  prefix: string; // scanner-templates/nuclei/
  auth_type: 'keys' | 'sts_role';
  role_arn?: string; // For cross-account access
  external_id?: string;
}

/**
 * HTTP source configuration
 */
export interface HTTPSourceConfig {
  url: string;
  auth_type: 'none' | 'bearer' | 'basic' | 'api_key';
  headers?: Record<string, string>;
  timeout?: number; // Seconds
}

/**
 * Template Source entity
 */
export interface TemplateSource {
  id: string;
  tenant_id: string;
  name: string;
  source_type: SourceType;
  template_type: TemplateType;
  description?: string;

  // Source-specific config (polymorphic)
  git_config?: GitSourceConfig;
  s3_config?: S3SourceConfig;
  http_config?: HTTPSourceConfig;

  // Sync settings
  auto_sync_on_scan: boolean;
  cache_ttl_minutes: number;
  is_enabled: boolean;

  // Sync status
  last_sync_at?: string;
  last_sync_hash?: string;
  last_sync_status?: SyncStatus;
  last_sync_error?: string;
  templates_synced?: number;

  // Credentials
  credential_id?: string;
  credential_name?: string; // Populated by API join

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Create template source request
 */
export interface CreateTemplateSourceRequest {
  name: string;
  source_type: SourceType;
  template_type: TemplateType;
  description?: string;

  // Source-specific config
  git_config?: GitSourceConfig;
  s3_config?: S3SourceConfig;
  http_config?: HTTPSourceConfig;

  // Sync settings
  auto_sync_on_scan?: boolean;
  cache_ttl_minutes?: number;

  // Credentials
  credential_id?: string;
}

/**
 * Update template source request
 */
export interface UpdateTemplateSourceRequest {
  name?: string;
  description?: string;

  // Source-specific config
  git_config?: GitSourceConfig;
  s3_config?: S3SourceConfig;
  http_config?: HTTPSourceConfig;

  // Sync settings
  auto_sync_on_scan?: boolean;
  cache_ttl_minutes?: number;

  // Credentials
  credential_id?: string;
}

/**
 * Sync result response
 */
export interface TemplateSyncResult {
  source_id: string;
  status: SyncStatus;
  templates_found: number;
  templates_added: number;
  templates_updated: number;
  templates_removed: number;
  error?: string;
  duration_ms: number;
  synced_at: string;
}

/**
 * Template source list response
 */
export interface TemplateSourceListResponse {
  items: TemplateSource[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Template source list filters
 */
export interface TemplateSourceListFilters {
  source_type?: SourceType;
  template_type?: TemplateType;
  is_enabled?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

// Source type display names
export const SOURCE_TYPE_DISPLAY_NAMES: Record<SourceType, string> = {
  git: 'Git Repository',
  s3: 'S3/MinIO Bucket',
  http: 'HTTP URL',
};

// Source type descriptions
export const SOURCE_TYPE_DESCRIPTIONS: Record<SourceType, string> = {
  git: 'Clone templates from a Git repository (GitHub, GitLab, Bitbucket)',
  s3: 'Download templates from an S3-compatible bucket (AWS S3, MinIO)',
  http: 'Fetch templates from an HTTP/HTTPS URL',
};

// Source type icons (Lucide icon names)
export const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  git: 'GitBranch',
  s3: 'Database',
  http: 'Globe',
};

// Sync status display names
export const SYNC_STATUS_DISPLAY_NAMES: Record<SyncStatus, string> = {
  pending: 'Pending',
  syncing: 'Syncing',
  success: 'Success',
  failed: 'Failed',
  disabled: 'Disabled',
};

// Sync status colors for UI
export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  pending: 'gray',
  syncing: 'blue',
  success: 'green',
  failed: 'red',
  disabled: 'gray',
};

/**
 * Helper to check if source needs sync
 */
export function sourceNeedsSync(source: TemplateSource): boolean {
  if (!source.is_enabled || !source.auto_sync_on_scan) {
    return false;
  }
  if (!source.last_sync_at) {
    return true;
  }
  const lastSync = new Date(source.last_sync_at);
  const cacheExpiry = new Date(lastSync.getTime() + source.cache_ttl_minutes * 60000);
  return new Date() > cacheExpiry;
}

/**
 * Helper to format sync time
 */
export function formatSyncTime(lastSyncAt?: string): string {
  if (!lastSyncAt) {
    return 'Never synced';
  }
  const date = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Helper to get source URL for display
 */
export function getSourceDisplayUrl(source: TemplateSource): string {
  switch (source.source_type) {
    case 'git':
      return source.git_config?.url || 'Unknown';
    case 's3':
      return source.s3_config
        ? `s3://${source.s3_config.bucket}/${source.s3_config.prefix}`
        : 'Unknown';
    case 'http':
      return source.http_config?.url || 'Unknown';
    default:
      return 'Unknown';
  }
}

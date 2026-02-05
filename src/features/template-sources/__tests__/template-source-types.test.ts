/**
 * Template Source Types Tests
 *
 * Tests for template source type utilities and helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SOURCE_TYPES,
  SYNC_STATUSES,
  SOURCE_TYPE_DISPLAY_NAMES,
  SOURCE_TYPE_DESCRIPTIONS,
  SYNC_STATUS_DISPLAY_NAMES,
  SYNC_STATUS_COLORS,
  sourceNeedsSync,
  formatSyncTime,
  getSourceDisplayUrl,
} from '@/lib/api/template-source-types';
import type { TemplateSource } from '@/lib/api/template-source-types';

// ============================================
// CONSTANTS
// ============================================

describe('SOURCE_TYPES', () => {
  it('should have all expected source types', () => {
    expect(SOURCE_TYPES).toContain('git');
    expect(SOURCE_TYPES).toContain('s3');
    expect(SOURCE_TYPES).toContain('http');
    expect(SOURCE_TYPES).toHaveLength(3);
  });
});

describe('SYNC_STATUSES', () => {
  it('should have all expected sync statuses', () => {
    expect(SYNC_STATUSES).toContain('pending');
    expect(SYNC_STATUSES).toContain('syncing');
    expect(SYNC_STATUSES).toContain('success');
    expect(SYNC_STATUSES).toContain('failed');
    expect(SYNC_STATUSES).toContain('disabled');
    expect(SYNC_STATUSES).toHaveLength(5);
  });
});

describe('SOURCE_TYPE_DISPLAY_NAMES', () => {
  it('should have display names for all types', () => {
    SOURCE_TYPES.forEach((type) => {
      expect(SOURCE_TYPE_DISPLAY_NAMES[type]).toBeDefined();
      expect(typeof SOURCE_TYPE_DISPLAY_NAMES[type]).toBe('string');
    });
  });

  it('should have correct display names', () => {
    expect(SOURCE_TYPE_DISPLAY_NAMES.git).toBe('Git Repository');
    expect(SOURCE_TYPE_DISPLAY_NAMES.s3).toBe('S3/MinIO Bucket');
    expect(SOURCE_TYPE_DISPLAY_NAMES.http).toBe('HTTP URL');
  });
});

describe('SOURCE_TYPE_DESCRIPTIONS', () => {
  it('should have descriptions for all types', () => {
    SOURCE_TYPES.forEach((type) => {
      expect(SOURCE_TYPE_DESCRIPTIONS[type]).toBeDefined();
      expect(typeof SOURCE_TYPE_DESCRIPTIONS[type]).toBe('string');
    });
  });
});

describe('SYNC_STATUS_DISPLAY_NAMES', () => {
  it('should have display names for all statuses', () => {
    SYNC_STATUSES.forEach((status) => {
      expect(SYNC_STATUS_DISPLAY_NAMES[status]).toBeDefined();
      expect(typeof SYNC_STATUS_DISPLAY_NAMES[status]).toBe('string');
    });
  });
});

describe('SYNC_STATUS_COLORS', () => {
  it('should have colors for all statuses', () => {
    SYNC_STATUSES.forEach((status) => {
      expect(SYNC_STATUS_COLORS[status]).toBeDefined();
      expect(typeof SYNC_STATUS_COLORS[status]).toBe('string');
    });
  });

  it('should have correct colors', () => {
    expect(SYNC_STATUS_COLORS.pending).toBe('gray');
    expect(SYNC_STATUS_COLORS.syncing).toBe('blue');
    expect(SYNC_STATUS_COLORS.success).toBe('green');
    expect(SYNC_STATUS_COLORS.failed).toBe('red');
    expect(SYNC_STATUS_COLORS.disabled).toBe('gray');
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

describe('sourceNeedsSync', () => {
  const createSource = (
    overrides: Partial<TemplateSource> = {}
  ): TemplateSource => ({
    id: 'source-123',
    tenant_id: 'tenant-123',
    name: 'test-source',
    source_type: 'git',
    template_type: 'nuclei',
    auto_sync_on_scan: true,
    cache_ttl_minutes: 60,
    is_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false if source is disabled', () => {
    const source = createSource({ is_enabled: false });
    expect(sourceNeedsSync(source)).toBe(false);
  });

  it('should return false if auto_sync_on_scan is false', () => {
    const source = createSource({ auto_sync_on_scan: false });
    expect(sourceNeedsSync(source)).toBe(false);
  });

  it('should return true if never synced', () => {
    const source = createSource({ last_sync_at: undefined });
    expect(sourceNeedsSync(source)).toBe(true);
  });

  it('should return true if cache has expired', () => {
    // Set current time
    vi.setSystemTime(new Date('2024-01-01T02:00:00Z'));

    const source = createSource({
      last_sync_at: '2024-01-01T00:30:00Z', // 90 minutes ago
      cache_ttl_minutes: 60, // 60 minute cache
    });

    expect(sourceNeedsSync(source)).toBe(true);
  });

  it('should return false if cache is still valid', () => {
    // Set current time
    vi.setSystemTime(new Date('2024-01-01T00:30:00Z'));

    const source = createSource({
      last_sync_at: '2024-01-01T00:00:00Z', // 30 minutes ago
      cache_ttl_minutes: 60, // 60 minute cache
    });

    expect(sourceNeedsSync(source)).toBe(false);
  });
});

describe('formatSyncTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Never synced" if no time provided', () => {
    expect(formatSyncTime(undefined)).toBe('Never synced');
  });

  it('should return "Just now" if less than 1 minute ago', () => {
    expect(formatSyncTime('2024-01-01T11:59:30Z')).toBe('Just now');
  });

  it('should return minutes for times less than 1 hour ago', () => {
    expect(formatSyncTime('2024-01-01T11:30:00Z')).toBe('30m ago');
    expect(formatSyncTime('2024-01-01T11:55:00Z')).toBe('5m ago');
  });

  it('should return hours for times less than 24 hours ago', () => {
    expect(formatSyncTime('2024-01-01T10:00:00Z')).toBe('2h ago');
    expect(formatSyncTime('2024-01-01T00:00:00Z')).toBe('12h ago');
  });

  it('should return formatted date for times more than 24 hours ago', () => {
    const result = formatSyncTime('2023-12-30T12:00:00Z');
    // This will vary by locale, just check it's not the other formats
    expect(result).not.toContain('m ago');
    expect(result).not.toContain('h ago');
    expect(result).not.toBe('Just now');
    expect(result).not.toBe('Never synced');
  });
});

describe('getSourceDisplayUrl', () => {
  const createSource = (
    overrides: Partial<TemplateSource> = {}
  ): TemplateSource => ({
    id: 'source-123',
    tenant_id: 'tenant-123',
    name: 'test-source',
    source_type: 'git',
    template_type: 'nuclei',
    auto_sync_on_scan: true,
    cache_ttl_minutes: 60,
    is_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  it('should return git URL for git sources', () => {
    const source = createSource({
      source_type: 'git',
      git_config: {
        url: 'https://github.com/org/repo',
        branch: 'main',
        path: 'templates/',
        auth_type: 'none',
      },
    });
    expect(getSourceDisplayUrl(source)).toBe('https://github.com/org/repo');
  });

  it('should return s3 URL for s3 sources', () => {
    const source = createSource({
      source_type: 's3',
      s3_config: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        prefix: 'templates/nuclei/',
        auth_type: 'keys',
      },
    });
    expect(getSourceDisplayUrl(source)).toBe('s3://my-bucket/templates/nuclei/');
  });

  it('should return http URL for http sources', () => {
    const source = createSource({
      source_type: 'http',
      http_config: {
        url: 'https://templates.example.com/nuclei',
        auth_type: 'none',
      },
    });
    expect(getSourceDisplayUrl(source)).toBe('https://templates.example.com/nuclei');
  });

  it('should return "Unknown" for git source without config', () => {
    const source = createSource({
      source_type: 'git',
      git_config: undefined,
    });
    expect(getSourceDisplayUrl(source)).toBe('Unknown');
  });

  it('should return "Unknown" for s3 source without config', () => {
    const source = createSource({
      source_type: 's3',
      s3_config: undefined,
    });
    expect(getSourceDisplayUrl(source)).toBe('Unknown');
  });

  it('should return "Unknown" for http source without config', () => {
    const source = createSource({
      source_type: 'http',
      http_config: undefined,
    });
    expect(getSourceDisplayUrl(source)).toBe('Unknown');
  });
});

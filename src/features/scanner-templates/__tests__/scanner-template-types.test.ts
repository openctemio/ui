/**
 * Scanner Template Types Tests
 *
 * Tests for scanner template type utilities and helpers
 */

import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_TYPES,
  TEMPLATE_STATUSES,
  TEMPLATE_TYPE_DISPLAY_NAMES,
  TEMPLATE_STATUS_DISPLAY_NAMES,
  TEMPLATE_TYPE_EXTENSIONS,
  TEMPLATE_TYPE_MAX_SIZES,
  TEMPLATE_TYPE_MAX_RULES,
  formatTemplateSize,
  isTemplateEditable,
  isTemplateUsable,
  encodeTemplateContent,
  decodeTemplateContent,
} from '@/lib/api/scanner-template-types';
import type { ScannerTemplate } from '@/lib/api/scanner-template-types';

// ============================================
// CONSTANTS
// ============================================

describe('TEMPLATE_TYPES', () => {
  it('should have all expected template types', () => {
    expect(TEMPLATE_TYPES).toContain('nuclei');
    expect(TEMPLATE_TYPES).toContain('semgrep');
    expect(TEMPLATE_TYPES).toContain('gitleaks');
    expect(TEMPLATE_TYPES).toHaveLength(3);
  });
});

describe('TEMPLATE_STATUSES', () => {
  it('should have all expected statuses', () => {
    expect(TEMPLATE_STATUSES).toContain('active');
    expect(TEMPLATE_STATUSES).toContain('pending_review');
    expect(TEMPLATE_STATUSES).toContain('deprecated');
    expect(TEMPLATE_STATUSES).toContain('revoked');
    expect(TEMPLATE_STATUSES).toHaveLength(4);
  });
});

describe('TEMPLATE_TYPE_DISPLAY_NAMES', () => {
  it('should have display names for all types', () => {
    TEMPLATE_TYPES.forEach((type) => {
      expect(TEMPLATE_TYPE_DISPLAY_NAMES[type]).toBeDefined();
      expect(typeof TEMPLATE_TYPE_DISPLAY_NAMES[type]).toBe('string');
    });
  });

  it('should have correct display names', () => {
    expect(TEMPLATE_TYPE_DISPLAY_NAMES.nuclei).toBe('Nuclei');
    expect(TEMPLATE_TYPE_DISPLAY_NAMES.semgrep).toBe('Semgrep');
    expect(TEMPLATE_TYPE_DISPLAY_NAMES.gitleaks).toBe('Gitleaks');
  });
});

describe('TEMPLATE_STATUS_DISPLAY_NAMES', () => {
  it('should have display names for all statuses', () => {
    TEMPLATE_STATUSES.forEach((status) => {
      expect(TEMPLATE_STATUS_DISPLAY_NAMES[status]).toBeDefined();
      expect(typeof TEMPLATE_STATUS_DISPLAY_NAMES[status]).toBe('string');
    });
  });
});

describe('TEMPLATE_TYPE_EXTENSIONS', () => {
  it('should have correct file extensions', () => {
    expect(TEMPLATE_TYPE_EXTENSIONS.nuclei).toBe('.yaml');
    expect(TEMPLATE_TYPE_EXTENSIONS.semgrep).toBe('.yaml');
    expect(TEMPLATE_TYPE_EXTENSIONS.gitleaks).toBe('.toml');
  });
});

describe('TEMPLATE_TYPE_MAX_SIZES', () => {
  it('should have correct max sizes', () => {
    expect(TEMPLATE_TYPE_MAX_SIZES.nuclei).toBe(1024 * 1024); // 1MB
    expect(TEMPLATE_TYPE_MAX_SIZES.semgrep).toBe(512 * 1024); // 512KB
    expect(TEMPLATE_TYPE_MAX_SIZES.gitleaks).toBe(256 * 1024); // 256KB
  });
});

describe('TEMPLATE_TYPE_MAX_RULES', () => {
  it('should have correct max rule counts', () => {
    expect(TEMPLATE_TYPE_MAX_RULES.nuclei).toBe(100);
    expect(TEMPLATE_TYPE_MAX_RULES.semgrep).toBe(500);
    expect(TEMPLATE_TYPE_MAX_RULES.gitleaks).toBe(1000);
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

describe('formatTemplateSize', () => {
  it('should format bytes correctly', () => {
    expect(formatTemplateSize(500)).toBe('500 B');
    expect(formatTemplateSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes correctly', () => {
    expect(formatTemplateSize(1024)).toBe('1.0 KB');
    expect(formatTemplateSize(1536)).toBe('1.5 KB');
    expect(formatTemplateSize(10240)).toBe('10.0 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatTemplateSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatTemplateSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });
});

describe('isTemplateEditable', () => {
  const createTemplate = (status: string): ScannerTemplate => ({
    id: 'tpl-123',
    tenant_id: 'tenant-123',
    name: 'test-template',
    template_type: 'nuclei',
    version: '1.0.0',
    content_hash: 'abc123',
    signature_hash: 'def456',
    rule_count: 5,
    tags: [],
    status: status as any,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  it('should return true for active templates', () => {
    expect(isTemplateEditable(createTemplate('active'))).toBe(true);
  });

  it('should return true for pending_review templates', () => {
    expect(isTemplateEditable(createTemplate('pending_review'))).toBe(true);
  });

  it('should return false for deprecated templates', () => {
    expect(isTemplateEditable(createTemplate('deprecated'))).toBe(false);
  });

  it('should return false for revoked templates', () => {
    expect(isTemplateEditable(createTemplate('revoked'))).toBe(false);
  });
});

describe('isTemplateUsable', () => {
  const createTemplate = (status: string): ScannerTemplate => ({
    id: 'tpl-123',
    tenant_id: 'tenant-123',
    name: 'test-template',
    template_type: 'nuclei',
    version: '1.0.0',
    content_hash: 'abc123',
    signature_hash: 'def456',
    rule_count: 5,
    tags: [],
    status: status as any,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  it('should return true only for active templates', () => {
    expect(isTemplateUsable(createTemplate('active'))).toBe(true);
    expect(isTemplateUsable(createTemplate('pending_review'))).toBe(false);
    expect(isTemplateUsable(createTemplate('deprecated'))).toBe(false);
    expect(isTemplateUsable(createTemplate('revoked'))).toBe(false);
  });
});

describe('encodeTemplateContent and decodeTemplateContent', () => {
  it('should encode and decode simple ASCII content', () => {
    const original = 'Hello, World!';
    const encoded = encodeTemplateContent(original);
    const decoded = decodeTemplateContent(encoded);
    expect(decoded).toBe(original);
  });

  it('should encode and decode YAML content', () => {
    const original = `id: test-template
info:
  name: Test Template
  severity: high
requests:
  - method: GET
    path: /test`;
    const encoded = encodeTemplateContent(original);
    const decoded = decodeTemplateContent(encoded);
    expect(decoded).toBe(original);
  });

  it('should encode and decode content with special characters', () => {
    const original = 'Special chars: @#$%^&*()_+-=[]{}|;\':",./<>?';
    const encoded = encodeTemplateContent(original);
    const decoded = decodeTemplateContent(encoded);
    expect(decoded).toBe(original);
  });

  it('should encode and decode Unicode content', () => {
    const original = 'Unicode: 日本語 한국어 中文 émoji 🚀';
    const encoded = encodeTemplateContent(original);
    const decoded = decodeTemplateContent(encoded);
    expect(decoded).toBe(original);
  });

  it('should return base64 encoded string', () => {
    const original = 'test content';
    const encoded = encodeTemplateContent(original);
    // Check it's valid base64 by decoding with atob
    expect(() => atob(encoded)).not.toThrow();
  });
});

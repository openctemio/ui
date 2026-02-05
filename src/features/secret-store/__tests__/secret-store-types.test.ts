/**
 * Secret Store Types Tests
 *
 * Tests for secret store type utilities and helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_DISPLAY_NAMES,
  CREDENTIAL_TYPE_DESCRIPTIONS,
  CREDENTIAL_TYPE_ICONS,
  isCredentialExpired,
  isCredentialExpiringSoon,
  formatLastUsed,
} from '@/lib/api/secret-store-types';
import type { SecretStoreCredential } from '@/lib/api/secret-store-types';

// ============================================
// CONSTANTS
// ============================================

describe('CREDENTIAL_TYPES', () => {
  it('should have all expected credential types', () => {
    expect(CREDENTIAL_TYPES).toContain('api_key');
    expect(CREDENTIAL_TYPES).toContain('basic_auth');
    expect(CREDENTIAL_TYPES).toContain('bearer_token');
    expect(CREDENTIAL_TYPES).toContain('ssh_key');
    expect(CREDENTIAL_TYPES).toContain('aws_role');
    expect(CREDENTIAL_TYPES).toContain('gcp_service_account');
    expect(CREDENTIAL_TYPES).toContain('azure_service_principal');
    expect(CREDENTIAL_TYPES).toContain('github_app');
    expect(CREDENTIAL_TYPES).toContain('gitlab_token');
    expect(CREDENTIAL_TYPES).toHaveLength(9);
  });
});

describe('CREDENTIAL_TYPE_DISPLAY_NAMES', () => {
  it('should have display names for all types', () => {
    CREDENTIAL_TYPES.forEach((type) => {
      expect(CREDENTIAL_TYPE_DISPLAY_NAMES[type]).toBeDefined();
      expect(typeof CREDENTIAL_TYPE_DISPLAY_NAMES[type]).toBe('string');
    });
  });

  it('should have correct display names', () => {
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.api_key).toBe('API Key');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.basic_auth).toBe('Basic Auth');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.bearer_token).toBe('Bearer Token');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.ssh_key).toBe('SSH Key');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.aws_role).toBe('AWS Role');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.gcp_service_account).toBe('GCP Service Account');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.azure_service_principal).toBe('Azure Service Principal');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.github_app).toBe('GitHub App');
    expect(CREDENTIAL_TYPE_DISPLAY_NAMES.gitlab_token).toBe('GitLab Token');
  });
});

describe('CREDENTIAL_TYPE_DESCRIPTIONS', () => {
  it('should have descriptions for all types', () => {
    CREDENTIAL_TYPES.forEach((type) => {
      expect(CREDENTIAL_TYPE_DESCRIPTIONS[type]).toBeDefined();
      expect(typeof CREDENTIAL_TYPE_DESCRIPTIONS[type]).toBe('string');
    });
  });
});

describe('CREDENTIAL_TYPE_ICONS', () => {
  it('should have icons for all types', () => {
    CREDENTIAL_TYPES.forEach((type) => {
      expect(CREDENTIAL_TYPE_ICONS[type]).toBeDefined();
      expect(typeof CREDENTIAL_TYPE_ICONS[type]).toBe('string');
    });
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

describe('isCredentialExpired', () => {
  const createCredential = (
    overrides: Partial<SecretStoreCredential> = {}
  ): SecretStoreCredential => ({
    id: 'cred-123',
    tenant_id: 'tenant-123',
    name: 'test-credential',
    credential_type: 'bearer_token',
    key_version: 1,
    encryption_algorithm: 'AES-256-GCM',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false if no expires_at', () => {
    const credential = createCredential({ expires_at: undefined });
    expect(isCredentialExpired(credential)).toBe(false);
  });

  it('should return true if expires_at is in the past', () => {
    const credential = createCredential({ expires_at: '2024-06-01T00:00:00Z' });
    expect(isCredentialExpired(credential)).toBe(true);
  });

  it('should return false if expires_at is in the future', () => {
    const credential = createCredential({ expires_at: '2024-12-31T00:00:00Z' });
    expect(isCredentialExpired(credential)).toBe(false);
  });
});

describe('isCredentialExpiringSoon', () => {
  const createCredential = (
    overrides: Partial<SecretStoreCredential> = {}
  ): SecretStoreCredential => ({
    id: 'cred-123',
    tenant_id: 'tenant-123',
    name: 'test-credential',
    credential_type: 'bearer_token',
    key_version: 1,
    encryption_algorithm: 'AES-256-GCM',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false if no expires_at', () => {
    const credential = createCredential({ expires_at: undefined });
    expect(isCredentialExpiringSoon(credential)).toBe(false);
  });

  it('should return false if already expired', () => {
    const credential = createCredential({ expires_at: '2024-06-01T00:00:00Z' });
    expect(isCredentialExpiringSoon(credential)).toBe(false);
  });

  it('should return true if expiring within 7 days', () => {
    const credential = createCredential({ expires_at: '2024-06-20T00:00:00Z' }); // 5 days away
    expect(isCredentialExpiringSoon(credential)).toBe(true);
  });

  it('should return false if expiring more than 7 days away', () => {
    const credential = createCredential({ expires_at: '2024-06-30T00:00:00Z' }); // 15 days away
    expect(isCredentialExpiringSoon(credential)).toBe(false);
  });
});

describe('formatLastUsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Never used" if no time provided', () => {
    expect(formatLastUsed(undefined)).toBe('Never used');
  });

  it('should return "Just now" if less than 1 minute ago', () => {
    expect(formatLastUsed('2024-06-15T11:59:30Z')).toBe('Just now');
  });

  it('should return singular minute format', () => {
    expect(formatLastUsed('2024-06-15T11:59:00Z')).toBe('1 minute ago');
  });

  it('should return plural minutes format', () => {
    expect(formatLastUsed('2024-06-15T11:30:00Z')).toBe('30 minutes ago');
  });

  it('should return singular hour format', () => {
    expect(formatLastUsed('2024-06-15T11:00:00Z')).toBe('1 hour ago');
  });

  it('should return plural hours format', () => {
    expect(formatLastUsed('2024-06-15T07:00:00Z')).toBe('5 hours ago');
  });

  it('should return singular day format', () => {
    expect(formatLastUsed('2024-06-14T12:00:00Z')).toBe('1 day ago');
  });

  it('should return plural days format', () => {
    expect(formatLastUsed('2024-06-10T12:00:00Z')).toBe('5 days ago');
  });

  it('should return formatted date for times more than 30 days ago', () => {
    const result = formatLastUsed('2024-04-15T12:00:00Z'); // 61 days ago
    // This will vary by locale, just check it's not the other formats
    expect(result).not.toContain('minute');
    expect(result).not.toContain('hour');
    expect(result).not.toContain('day');
    expect(result).not.toBe('Just now');
    expect(result).not.toBe('Never used');
  });
});

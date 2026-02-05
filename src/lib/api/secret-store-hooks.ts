/**
 * Secret Store API Hooks
 *
 * SWR hooks for managing authentication credentials (Git tokens, AWS keys, etc.)
 * Used by template sources for accessing external repositories
 */

'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { get, post, put, del } from './client';
import { handleApiError } from './error-handler';
import { useTenant } from '@/context/tenant-provider';
import { buildQueryString } from './client';
import type {
  CreateSecretStoreCredentialRequest,
  SecretStoreCredential,
  SecretStoreCredentialListFilters,
  SecretStoreCredentialListResponse,
  UpdateSecretStoreCredentialRequest,
} from './secret-store-types';

// ============================================
// API BASE PATH
// ============================================

const SECRET_STORE_BASE = '/api/v1/secret-store';

// ============================================
// ENDPOINTS
// ============================================

export const secretStoreEndpoints = {
  /**
   * List credentials with optional filters
   */
  list: (filters?: SecretStoreCredentialListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    return `${SECRET_STORE_BASE}${queryString}`;
  },

  /**
   * Get credential by ID
   */
  get: (credentialId: string) => `${SECRET_STORE_BASE}/${credentialId}`,

  /**
   * Create a new credential
   */
  create: () => SECRET_STORE_BASE,

  /**
   * Update credential
   */
  update: (credentialId: string) => `${SECRET_STORE_BASE}/${credentialId}`,

  /**
   * Delete credential
   */
  delete: (credentialId: string) => `${SECRET_STORE_BASE}/${credentialId}`,
} as const;

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false;
    }
    return true;
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: true,
      logError: true,
    });
  },
};

// ============================================
// CACHE KEYS
// ============================================

export const secretStoreKeys = {
  all: ['secret-store'] as const,
  lists: () => [...secretStoreKeys.all, 'list'] as const,
  list: (filters?: SecretStoreCredentialListFilters) =>
    [...secretStoreKeys.lists(), filters] as const,
  details: () => [...secretStoreKeys.all, 'detail'] as const,
  detail: (id: string) => [...secretStoreKeys.details(), id] as const,
};

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchCredentials(url: string): Promise<SecretStoreCredentialListResponse> {
  return get<SecretStoreCredentialListResponse>(url);
}

async function fetchCredential(url: string): Promise<SecretStoreCredential> {
  return get<SecretStoreCredential>(url);
}

// ============================================
// SECRET STORE HOOKS
// ============================================

/**
 * Fetch secret store credentials list with optional filters
 */
export function useSecretStoreCredentials(
  filters?: SecretStoreCredentialListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant();

  const key = currentTenant ? secretStoreEndpoints.list(filters) : null;

  return useSWR<SecretStoreCredentialListResponse>(key, fetchCredentials, {
    ...defaultConfig,
    ...config,
  });
}

/**
 * Fetch a single secret store credential by ID
 */
export function useSecretStoreCredential(
  credentialId: string | null,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant();

  const key =
    currentTenant && credentialId ? secretStoreEndpoints.get(credentialId) : null;

  return useSWR<SecretStoreCredential>(key, fetchCredential, {
    ...defaultConfig,
    ...config,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new secret store credential
 */
export function useCreateSecretStoreCredential() {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant ? secretStoreEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateSecretStoreCredentialRequest }) => {
      return post<SecretStoreCredential>(url, arg);
    }
  );
}

/**
 * Update a secret store credential
 */
export function useUpdateSecretStoreCredential(credentialId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && credentialId
      ? secretStoreEndpoints.update(credentialId)
      : null,
    async (url: string, { arg }: { arg: UpdateSecretStoreCredentialRequest }) => {
      return put<SecretStoreCredential>(url, arg);
    }
  );
}

/**
 * Delete a secret store credential
 */
export function useDeleteSecretStoreCredential(credentialId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && credentialId
      ? secretStoreEndpoints.delete(credentialId)
      : null,
    async (url: string) => {
      return del<void>(url);
    }
  );
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate secret store credentials cache
 */
export async function invalidateSecretStoreCache() {
  const { mutate } = await import('swr');
  await mutate(
    (key) =>
      typeof key === 'string' && key.includes('/api/v1/secret-store'),
    undefined,
    { revalidate: true }
  );
}

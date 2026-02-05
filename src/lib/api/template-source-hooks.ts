/**
 * Template Source API Hooks
 *
 * SWR hooks for managing template sources (Git repos, S3 buckets, HTTP URLs)
 */

'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { get, post, put, del } from './client';
import { handleApiError } from './error-handler';
import { useTenant } from '@/context/tenant-provider';
import { buildQueryString } from './client';
import type {
  CreateTemplateSourceRequest,
  TemplateSource,
  TemplateSourceListFilters,
  TemplateSourceListResponse,
  TemplateSyncResult,
  UpdateTemplateSourceRequest,
} from './template-source-types';

// ============================================
// API BASE PATH
// ============================================

const TEMPLATE_SOURCE_BASE = '/api/v1/template-sources';

// ============================================
// ENDPOINTS
// ============================================

export const templateSourceEndpoints = {
  /**
   * List template sources with optional filters
   */
  list: (filters?: TemplateSourceListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    return `${TEMPLATE_SOURCE_BASE}${queryString}`;
  },

  /**
   * Get template source by ID
   */
  get: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}`,

  /**
   * Create a new template source
   */
  create: () => TEMPLATE_SOURCE_BASE,

  /**
   * Update template source
   */
  update: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}`,

  /**
   * Delete template source
   */
  delete: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}`,

  /**
   * Enable template source
   */
  enable: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}/enable`,

  /**
   * Disable template source
   */
  disable: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}/disable`,

  /**
   * Force sync template source
   */
  sync: (sourceId: string) => `${TEMPLATE_SOURCE_BASE}/${sourceId}/sync`,
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

export const templateSourceKeys = {
  all: ['template-sources'] as const,
  lists: () => [...templateSourceKeys.all, 'list'] as const,
  list: (filters?: TemplateSourceListFilters) =>
    [...templateSourceKeys.lists(), filters] as const,
  details: () => [...templateSourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateSourceKeys.details(), id] as const,
};

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchTemplateSources(url: string): Promise<TemplateSourceListResponse> {
  return get<TemplateSourceListResponse>(url);
}

async function fetchTemplateSource(url: string): Promise<TemplateSource> {
  return get<TemplateSource>(url);
}

// ============================================
// TEMPLATE SOURCE HOOKS
// ============================================

/**
 * Fetch template sources list with optional filters
 */
export function useTemplateSources(
  filters?: TemplateSourceListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant();

  const key = currentTenant ? templateSourceEndpoints.list(filters) : null;

  return useSWR<TemplateSourceListResponse>(key, fetchTemplateSources, {
    ...defaultConfig,
    ...config,
  });
}

/**
 * Fetch a single template source by ID
 */
export function useTemplateSource(
  sourceId: string | null,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant();

  const key =
    currentTenant && sourceId ? templateSourceEndpoints.get(sourceId) : null;

  return useSWR<TemplateSource>(key, fetchTemplateSource, {
    ...defaultConfig,
    ...config,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new template source
 */
export function useCreateTemplateSource() {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant ? templateSourceEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateTemplateSourceRequest }) => {
      return post<TemplateSource>(url, arg);
    }
  );
}

/**
 * Update a template source
 */
export function useUpdateTemplateSource(sourceId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && sourceId
      ? templateSourceEndpoints.update(sourceId)
      : null,
    async (url: string, { arg }: { arg: UpdateTemplateSourceRequest }) => {
      return put<TemplateSource>(url, arg);
    }
  );
}

/**
 * Delete a template source
 */
export function useDeleteTemplateSource(sourceId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && sourceId
      ? templateSourceEndpoints.delete(sourceId)
      : null,
    async (url: string) => {
      return del<void>(url);
    }
  );
}

/**
 * Enable a template source
 */
export function useEnableTemplateSource(sourceId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && sourceId
      ? templateSourceEndpoints.enable(sourceId)
      : null,
    async (url: string) => {
      return post<TemplateSource>(url, {});
    }
  );
}

/**
 * Disable a template source
 */
export function useDisableTemplateSource(sourceId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && sourceId
      ? templateSourceEndpoints.disable(sourceId)
      : null,
    async (url: string) => {
      return post<TemplateSource>(url, {});
    }
  );
}

/**
 * Force sync a template source
 */
export function useSyncTemplateSource(sourceId: string) {
  const { currentTenant } = useTenant();

  return useSWRMutation(
    currentTenant && sourceId
      ? templateSourceEndpoints.sync(sourceId)
      : null,
    async (url: string) => {
      return post<TemplateSyncResult>(url, {});
    }
  );
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate template sources cache
 */
export async function invalidateTemplateSourcesCache() {
  const { mutate } = await import('swr');
  await mutate(
    (key) =>
      typeof key === 'string' && key.includes('/api/v1/template-sources'),
    undefined,
    { revalidate: true }
  );
}

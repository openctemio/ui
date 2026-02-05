/**
 * API Client
 *
 * HTTP client for making authenticated requests to backend API
 * Automatically injects auth headers and handles errors
 */

import { useAuthStore } from '@/stores/auth-store'
import type { ApiError, ApiRequestOptions, ApiResponse } from './types'
import { ApiClientError } from './error-handler'
import { dispatchPermissionStaleEvent } from '@/context/permission-provider'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Check if code is running on server or client
 */
function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * Get API base URL
 *
 * - Client-side: Empty string (requests go to /api/v1/* which is proxied by Next.js)
 * - Server-side: Direct to backend URL
 */
export function getApiBaseUrl(): string {
  // On client-side, use empty base URL
  // Requests to /api/v1/* are handled by Next.js API route which proxies to backend
  if (!isServer()) {
    return ''
  }

  // On server-side, use direct backend URL
  const baseUrl = process.env.BACKEND_API_URL

  if (!baseUrl) {
    // Return default in development, throw in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BACKEND_API_URL is not defined. Please set it in environment variables.')
    }
    return 'http://localhost:8080'
  }

  return baseUrl
}

/**
 * Default request timeout (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Token refresh mutex to prevent race conditions
 * When multiple requests fail with 401 simultaneously, only one should refresh
 */
let refreshPromise: Promise<boolean> | null = null

/**
 * Redirect lock to prevent multiple redirects to login
 * Once we decide to redirect, block all further auth attempts
 */
let isRedirectingToLogin = false

/**
 * Try to refresh the access token
 * Uses a mutex to prevent multiple concurrent refresh attempts
 * Returns true if refresh succeeded, false otherwise
 */
async function tryRefreshToken(): Promise<boolean> {
  // Only attempt refresh in browser
  if (typeof window === 'undefined') {
    return false
  }

  // If already redirecting to login, don't attempt refresh
  if (isRedirectingToLogin) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Client] Already redirecting to login, skipping refresh')
    }
    return false
  }

  // If already refreshing, wait for the existing refresh to complete
  if (refreshPromise) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Client] Token refresh already in progress, waiting...')
    }
    return refreshPromise
  }

  // Create a new refresh promise
  refreshPromise = (async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Client] Starting token refresh...')
      }
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success && data.data?.access_token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[API Client] Token refresh successful')
        }
        useAuthStore.getState().updateToken(data.data.access_token)
        return true
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn('[API Client] Token refresh failed:', data.error?.message || 'Unknown error')
      }
      return false
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Client] Token refresh error:', error)
      }
      return false
    } finally {
      // Clear the refresh promise after a short delay
      // This prevents immediate re-refresh if the refresh just failed
      setTimeout(() => {
        refreshPromise = null
      }, 1000)
    }
  })()

  return refreshPromise
}

/**
 * Redirect to login page and lock to prevent multiple redirects
 */
function redirectToLoginOnce(): void {
  if (isRedirectingToLogin) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Client] Already redirecting to login, skipping')
    }
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  // Don't redirect if already on login page
  if (window.location.pathname.startsWith('/login')) {
    return
  }

  isRedirectingToLogin = true
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Client] Auth failed permanently, redirecting to login')
  }

  // Clear auth state
  useAuthStore.getState().clearAuth()

  // Use hard redirect to ensure clean state
  window.location.href = '/login'
}

// ============================================
// CORE API CLIENT
// ============================================

/**
 * Main API client function
 *
 * Makes HTTP requests to backend API with automatic:
 * - Auth header injection (Bearer token)
 * - Error handling
 * - Timeout management
 * - JSON serialization/deserialization
 *
 * @example
 * ```typescript
 * // GET request
 * const users = await apiClient<User[]>('/api/users')
 *
 * // POST request
 * const newUser = await apiClient<User>('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' })
 * })
 * ```
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    skipAuth = false,
    baseUrl = getApiBaseUrl(),
    timeout = DEFAULT_TIMEOUT,
    retry: _retry, // Reserved for future retry implementation
    _skipRefreshRetry = false,
    ...fetchOptions
  } = options

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`

  // Build headers
  const headers = new Headers(fetchOptions.headers)

  // Add Content-Type if not present and body exists
  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add Authorization header with access token from auth store
  // Only for server-side direct calls - client-side uses proxy which handles auth via cookies
  if (!skipAuth && isServer()) {
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }
  // For client-side requests via proxy, don't add Authorization header
  // The proxy reads the httpOnly cookie and adds the header

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Make request
    // Include credentials to send cookies (important for proxy auth)
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      credentials: 'include',
    })

    clearTimeout(timeoutId)

    // Check for stale permission header (before handling response status)
    const permissionStale = response.headers.get('x-permission-stale')
    if (permissionStale === 'true') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Client] Permission stale header detected, triggering refresh')
      }
      dispatchPermissionStaleEvent()
    }

    // Handle non-ok responses
    if (!response.ok) {
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !_skipRefreshRetry && !skipAuth) {
        // If already redirecting, don't attempt anything
        if (isRedirectingToLogin) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[API Client] Already redirecting, skipping 401 handling')
          }
          const error = await parseErrorResponse(response)
          throw new ApiClientError(error.message, error.code, error.statusCode, error.details)
        }

        const refreshed = await tryRefreshToken()
        if (refreshed) {
          // Retry the original request with new token
          return apiClient<T>(endpoint, { ...options, _skipRefreshRetry: true })
        }

        // Refresh failed - redirect to login (this sets the lock and clears auth)
        redirectToLoginOnce()
      }

      // Handle 403 Forbidden - user doesn't have permission
      // Note: We DON'T trigger permission refresh on 403 because:
      // 1. 403 means "authenticated but not authorized" - user identity is valid
      // 2. If user legitimately doesn't have permission, refreshing won't help
      // 3. Auto-refreshing on 403 causes infinite loops when user lacks permission
      // 4. Backend will send X-Permission-Stale header if permissions actually changed
      // Just log and let the component handle the error
      if (response.status === 403) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[API Client] 403 Forbidden - user lacks permission for:', endpoint)
        }
        // Don't trigger permission refresh - let RouteGuard handle access denied
      }

      const error = await parseErrorResponse(response)
      throw new ApiClientError(error.message, error.code, error.statusCode, error.details)
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type')
    const responseText = await response.text()

    // Log response for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[API Client] Response:',
        response.status,
        'Content-Type:',
        contentType,
        'Body length:',
        responseText.length
      )
    }

    // Handle empty response body
    if (!responseText || responseText.trim() === '') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API Client] Empty response body from:', endpoint)
      }
      return undefined as T
    }

    // Parse JSON response
    let data: unknown
    try {
      data = JSON.parse(responseText)
    } catch (_parseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Client] Failed to parse JSON:', responseText.substring(0, 200))
      }
      throw new ApiClientError(
        'Invalid JSON response from server',
        'PARSE_ERROR',
        response.status,
        { responseText: responseText.substring(0, 500) }
      )
    }

    // If response is wrapped in ApiResponse, unwrap it
    if (isApiResponse(data)) {
      if (!data.success) {
        throw new ApiClientError(
          data.error?.message || 'API request failed',
          data.error?.code || 'UNKNOWN_ERROR',
          response.status,
          data.error?.details
        )
      }
      return data.data as T
    }

    return data as T
  } catch (error) {
    clearTimeout(timeoutId)

    // Log the actual error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Client] Caught error:', error)
    }

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Request timeout', 'TIMEOUT', 408, { timeout, url })
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiClientError('Network error - please check your connection', 'NETWORK_ERROR', 0, {
        originalError: error.message,
      })
    }

    // Re-throw ApiClientError
    if (error instanceof ApiClientError) {
      throw error
    }

    // Handle unknown errors - preserve original error message if available
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    throw new ApiClientError(errorMessage, 'UNKNOWN_ERROR', 500, { originalError: error })
  }
}

/**
 * Parse error response from backend
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type')

  // Try to parse JSON error response
  if (contentType?.includes('application/json')) {
    try {
      const data = await response.json()

      // Backend returned ApiResponse format with nested error object
      if (data.error && typeof data.error === 'object') {
        return {
          code: data.error.code || 'UNKNOWN_ERROR',
          message: data.error.message || response.statusText,
          details: data.error.details,
          statusCode: response.status,
        }
      }

      // Backend returned apierror format: { error: "CODE", code: "CODE", message: "..." }
      if (data.message) {
        return {
          code: data.code || data.error || 'UNKNOWN_ERROR',
          message: data.message,
          details: data.details,
          statusCode: response.status,
        }
      }

      // Unknown JSON format
      return {
        code: 'UNKNOWN_ERROR',
        message: response.statusText || 'Unknown error',
        details: data,
        statusCode: response.status,
      }
    } catch {
      // JSON parsing failed
    }
  }

  // Fallback to status text
  return {
    code: `HTTP_${response.status}`,
    message: response.statusText || 'HTTP error',
    statusCode: response.status,
  }
}

/**
 * Check if response is ApiResponse format
 */
function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as ApiResponse).success === 'boolean'
  )
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * GET request
 */
export async function get<T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'GET',
  })
}

/**
 * POST request
 */
export async function post<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request
 */
export async function put<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH request
 */
export async function patch<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request
 * Supports optional body for DELETE requests that require a request body
 */
export async function del<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  })
}

// ============================================
// FILE UPLOAD
// ============================================

/**
 * Upload file to backend
 *
 * @example
 * ```typescript
 * const file = document.getElementById('file').files[0]
 * const response = await uploadFile('/api/files', file, {
 *   onProgress: (progress) => console.log(`${progress.percentage}%`)
 * })
 * ```
 */
export async function uploadFile<T = unknown>(
  endpoint: string,
  file: File,
  options?: ApiRequestOptions & {
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  }
): Promise<T> {
  const { onProgress, ...requestOptions } = options || {}
  // Note: requestOptions reserved for future XHR config options
  void requestOptions

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    // Get auth token
    const accessToken = useAuthStore.getState().accessToken
    const baseUrl = getApiBaseUrl()
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`

    // Setup request
    xhr.open('POST', url)

    // Add auth header
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    }

    // Progress handler
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          })
        }
      })
    }

    // Success handler
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data as T)
        } catch {
          resolve(xhr.responseText as T)
        }
      } else {
        reject(
          new ApiClientError('File upload failed', 'UPLOAD_FAILED', xhr.status, {
            statusText: xhr.statusText,
          })
        )
      }
    })

    // Error handler
    xhr.addEventListener('error', () => {
      reject(new ApiClientError('Network error during upload', 'NETWORK_ERROR', 0))
    })

    // Send request
    xhr.send(formData)
  })
}

// ============================================
// UTILITIES
// ============================================

/**
 * Build query string from object
 *
 * @example
 * ```typescript
 * buildQueryString({ page: 1, search: 'test' })
 * // Returns: "?page=1&search=test"
 * ```
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Check if user is authenticated (has access token)
 */
export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().accessToken
}

// ============================================
// SWR FETCHERS
// ============================================

/**
 * SWR-compatible fetcher function
 * Automatically handles auth and error responses
 *
 * @example
 * ```typescript
 * const { data } = useSWR('/api/users', fetcher)
 * ```
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  return apiClient<T>(url, { method: 'GET' })
}

/**
 * SWR-compatible fetcher with custom options
 * Use for requests that need custom headers or method
 *
 * @example
 * ```typescript
 * const { data } = useSWR('/api/users', (url) =>
 *   fetcherWithOptions(url, { headers: { 'X-Custom': 'value' } })
 * )
 * ```
 */
export async function fetcherWithOptions<T = unknown>(
  url: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(url, options)
}

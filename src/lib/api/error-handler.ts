/**
 * API Error Handler
 *
 * Centralized error handling for API requests
 */

import { toast } from 'sonner'
import type { ApiError } from './types'

// ============================================
// ERROR CLASSES
// ============================================

/**
 * Custom API Client Error
 */
export class ApiClientError extends Error {
  code: string
  statusCode: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError)
    }
  }

  /**
   * Convert to ApiError format
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }

  /**
   * Check if error is specific type
   */
  is(code: string): boolean {
    return this.code === code
  }

  /**
   * Check if error is authentication error
   */
  isAuthError(): boolean {
    return (
      this.statusCode === 401 ||
      this.code === 'UNAUTHORIZED' ||
      this.code === 'TOKEN_EXPIRED' ||
      this.code === 'INVALID_TOKEN'
    )
  }

  /**
   * Check if error is validation error
   */
  isValidationError(): boolean {
    return this.statusCode === 422 || this.code === 'VALIDATION_ERROR'
  }

  /**
   * Check if error is not found
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404 || this.code === 'NOT_FOUND'
  }

  /**
   * Check if error is server error
   */
  isServerError(): boolean {
    return this.statusCode >= 500
  }

  /**
   * Check if error is client error
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500
  }
}

// ============================================
// ERROR HANDLER
// ============================================

/**
 * Handle API errors with user-friendly messages
 *
 * @param error - Error from API call
 * @param options - Handler options
 * @returns Processed error
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient('/api/users')
 * } catch (error) {
 *   handleApiError(error, {
 *     showToast: true,
 *     logError: true
 *   })
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  options: {
    /**
     * Show toast notification
     */
    showToast?: boolean

    /**
     * Log error to console
     */
    logError?: boolean

    /**
     * Custom error messages by error code
     */
    customMessages?: Record<string, string>

    /**
     * Callback on error
     */
    onError?: (error: ApiClientError) => void

    /**
     * Fallback message if no specific message found
     */
    fallbackMessage?: string
  } = {}
): ApiClientError {
  const {
    showToast = true,
    logError = true,
    customMessages = {},
    onError,
    fallbackMessage = 'An unexpected error occurred',
  } = options

  // Convert to ApiClientError if needed
  const apiError = error instanceof ApiClientError
    ? error
    : new ApiClientError(
        error instanceof Error ? error.message : fallbackMessage,
        'UNKNOWN_ERROR'
      )

  // Get user-friendly message
  const message = getUserFriendlyMessage(apiError, customMessages, fallbackMessage)

  // Log error if enabled
  if (logError) {
    console.error('[API Error]', {
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      details: apiError.details,
      stack: apiError.stack,
    })
  }

  // Show toast if enabled
  if (showToast) {
    // Different toast types based on error
    if (apiError.isAuthError()) {
      toast.error('Authentication Error', {
        description: message,
      })
    } else if (apiError.isValidationError()) {
      toast.error('Validation Error', {
        description: message,
      })
    } else if (apiError.isNotFoundError()) {
      toast.error('Not Found', {
        description: message,
      })
    } else if (apiError.isServerError()) {
      toast.error('Server Error', {
        description: message,
      })
    } else {
      toast.error('Error', {
        description: message,
      })
    }
  }

  // Call custom error handler
  if (onError) {
    onError(apiError)
  }

  return apiError
}

// ============================================
// USER-FRIENDLY MESSAGES
// ============================================

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(
  error: ApiClientError,
  customMessages: Record<string, string>,
  fallback: string
): string {
  // Check custom messages first
  if (customMessages[error.code]) {
    return customMessages[error.code]
  }

  // Built-in messages by error code
  const builtInMessages: Record<string, string> = {
    // Auth errors
    UNAUTHORIZED: 'You need to log in to access this resource',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again',
    INVALID_TOKEN: 'Invalid authentication token',
    FORBIDDEN: 'You do not have permission to access this resource',

    // Validation errors
    VALIDATION_ERROR: 'Please check your input and try again',
    INVALID_INPUT: 'The provided data is invalid',
    REQUIRED_FIELD: 'Please fill in all required fields',

    // Not found
    NOT_FOUND: 'The requested resource was not found',
    USER_NOT_FOUND: 'User not found',
    POST_NOT_FOUND: 'Post not found',

    // Server errors
    INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again later',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later',
    TIMEOUT: 'Request timed out. Please try again',

    // Network errors
    NETWORK_ERROR: 'Network error. Please check your internet connection',
    CONNECTION_REFUSED: 'Could not connect to server',

    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',

    // Generic
    UNKNOWN_ERROR: 'An unexpected error occurred',
  }

  if (builtInMessages[error.code]) {
    return builtInMessages[error.code]
  }

  // Check by status code
  const statusMessages: Record<number, string> = {
    400: 'Bad request. Please check your input',
    401: 'Please log in to continue',
    403: 'You do not have permission to perform this action',
    404: 'Resource not found',
    408: 'Request timeout. Please try again',
    409: 'Conflict. The resource already exists',
    422: 'Validation error. Please check your input',
    429: 'Too many requests. Please slow down',
    500: 'Internal server error. Please try again later',
    502: 'Bad gateway. Please try again later',
    503: 'Service unavailable. Please try again later',
    504: 'Gateway timeout. Please try again later',
  }

  if (statusMessages[error.statusCode]) {
    return statusMessages[error.statusCode]
  }

  // Use error message if it's user-friendly (not a stack trace)
  if (error.message && !error.message.includes('Error:') && error.message.length < 100) {
    return error.message
  }

  // Fallback
  return fallback
}

// ============================================
// RETRY UTILITIES
// ============================================

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ApiClientError): boolean {
  // Network errors are retryable
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true
  }

  // Server errors (5xx) are retryable
  if (error.statusCode >= 500) {
    return true
  }

  // Rate limit errors might be retryable after delay
  if (error.statusCode === 429) {
    return true
  }

  return false
}

/**
 * Get retry delay for error (in milliseconds)
 */
export function getRetryDelay(error: ApiClientError, attempt: number): number {
  // Rate limit - use longer delay
  if (error.statusCode === 429) {
    return 5000 * attempt // 5s, 10s, 15s, etc.
  }

  // Network/timeout - exponential backoff
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return Math.min(1000 * Math.pow(2, attempt), 10000) // Max 10s
  }

  // Server errors - linear backoff
  if (error.statusCode >= 500) {
    return 2000 * attempt // 2s, 4s, 6s, etc.
  }

  return 1000 // Default 1s
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => apiClient('/api/users'),
 *   { maxRetries: 3 }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    onRetry?: (error: ApiClientError, attempt: number) => void
  } = {}
): Promise<T> {
  const { maxRetries = 3, onRetry } = options

  let lastError: ApiClientError | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const apiError = error instanceof ApiClientError
        ? error
        : new ApiClientError('Unknown error')

      lastError = apiError

      // Don't retry if not retryable or max retries reached
      if (!isRetryableError(apiError) || attempt === maxRetries) {
        throw apiError
      }

      // Call retry callback
      if (onRetry) {
        onRetry(apiError, attempt + 1)
      }

      // Wait before retrying
      const delay = getRetryDelay(apiError, attempt + 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Extract validation errors from API error
 */
export function extractValidationErrors(
  error: ApiClientError
): Record<string, string> | null {
  if (!error.isValidationError() || !error.details) {
    return null
  }

  // Check if details has errors array (common format)
  if (Array.isArray(error.details.errors)) {
    const errors: Record<string, string> = {}
    error.details.errors.forEach((err: { field: string; message: string }) => {
      if (err.field && err.message) {
        errors[err.field] = err.message
      }
    })
    return errors
  }

  // Check if details is already a field-message map
  if (typeof error.details === 'object') {
    return error.details as Record<string, string>
  }

  return null
}

// ============================================
// ERROR MESSAGE EXTRACTION
// ============================================

/**
 * Extract user-friendly error message from any error type
 *
 * Use this in catch blocks to get a displayable error message
 *
 * @param error - Error from API call or any other source
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await updatePipeline(data)
 *   toast.success('Pipeline updated')
 * } catch (error) {
 *   toast.error(getErrorMessage(error, 'Failed to update pipeline'))
 * }
 * ```
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  // Handle ApiClientError
  if (error instanceof ApiClientError) {
    // If message is technical/long, try to get a friendlier version
    if (error.message && error.message.length < 200 && !error.message.includes('Error:')) {
      return error.message
    }

    // Check for validation errors in details
    if (error.details && typeof error.details === 'object') {
      // Handle { errors: [{ field, message }] } format
      if (Array.isArray((error.details as Record<string, unknown>).errors)) {
        const errors = (error.details as { errors: { field: string; message: string }[] }).errors
        if (errors.length > 0) {
          return errors.map(e => e.message).join('. ')
        }
      }

      // Handle { message: string } format in details
      if ((error.details as Record<string, unknown>).message) {
        return (error.details as { message: string }).message
      }
    }

    return error.message || fallback
  }

  // Handle standard Error
  if (error instanceof Error) {
    return error.message || fallback
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Handle object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === 'string') {
      return msg
    }
  }

  return fallback
}

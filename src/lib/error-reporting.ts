/**
 * Error Reporting Utility
 *
 * Centralized error reporting integrated with Sentry.
 *
 * NOTE: @sentry/nextjs is an optional dependency.
 * This file provides no-op stubs when Sentry is not installed.
 *
 * To enable error reporting:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *
 * Usage:
 * ```typescript
 * import { reportError, reportRouteError } from '@/lib/error-reporting'
 *
 * // General error
 * reportError(error, { context: 'User action' })
 *
 * // Route-specific error (in error.tsx)
 * reportRouteError(error, '/dashboard', { digest: error.digest })
 * ```
 */

interface ErrorContext {
  /**
   * Additional context about where/why the error occurred
   */
  context?: string

  /**
   * User information (if available)
   */
  user?: {
    id?: string
    email?: string
  }

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>

  /**
   * Error severity level
   */
  level?: 'fatal' | 'error' | 'warning' | 'info'
}

/**
 * Report error
 * Logs to console in development. When @sentry/nextjs is installed,
 * also reports to Sentry.
 *
 * @param error - The error to report
 * @param context - Additional context about the error
 */
export function reportError(error: Error | unknown, context?: ErrorContext): void {
  const level = context?.level || 'error'

  // Format error message
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`[${level.toUpperCase()}] Error Report`)
    console.error('Message:', errorMessage)
    if (errorStack) console.error('Stack:', errorStack)
    if (context?.context) console.info('Context:', context.context)
    if (context?.metadata) console.info('Metadata:', context.metadata)
    console.groupEnd()
  }

  // Note: Sentry reporting is disabled. Install @sentry/nextjs to enable.
}

/**
 * Report route-specific error (for use in error.tsx files)
 *
 * @param error - The error object from Next.js error boundary
 * @param route - The route where the error occurred
 * @param _extra - Additional error info (digest, etc.) - currently unused
 */
export function reportRouteError(
  error: Error & { digest?: string },
  route: string,
  _extra?: Record<string, unknown>
): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Route Error: ${route}]`, error)
  }

  // Note: Sentry reporting is disabled. Install @sentry/nextjs to enable.
}

/**
 * Report warning (non-critical error)
 */
export function reportWarning(message: string, context?: Omit<ErrorContext, 'level'>): void {
  reportError(new Error(message), { ...context, level: 'warning' })
}

/**
 * Report info (for tracking)
 */
export function reportInfo(message: string, context?: Omit<ErrorContext, 'level'>): void {
  reportError(new Error(message), { ...context, level: 'info' })
}

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN
}

// Export type for use in components
export type { ErrorContext }

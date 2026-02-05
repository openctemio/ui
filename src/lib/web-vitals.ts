/**
 * Web Vitals Reporting
 *
 * Reports Core Web Vitals metrics for performance monitoring.
 *
 * NOTE: web-vitals and @sentry/nextjs are optional dependencies.
 * This file provides no-op stubs when these packages are not installed.
 *
 * To enable Web Vitals reporting:
 * 1. Install: npm install web-vitals @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *
 * Metrics tracked when enabled:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - INP (Interaction to Next Paint) - Responsiveness
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Perceived load speed
 * - TTFB (Time to First Byte) - Server response time
 *
 * @see https://web.dev/vitals/
 */

/**
 * Report a Web Vital metric
 * No-op when dependencies are not installed
 */
export function reportWebVital(): void {
  // No-op stub - install web-vitals and @sentry/nextjs to enable
}

/**
 * Initialize Web Vitals reporting
 * No-op when dependencies are not installed
 */
export async function initWebVitals(): Promise<void> {
  // No-op stub - install web-vitals and @sentry/nextjs to enable
  if (process.env.NODE_ENV === 'development') {
    console.info('[Web Vitals] Disabled - install web-vitals and @sentry/nextjs to enable')
  }
}

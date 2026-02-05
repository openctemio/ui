/**
 * Sentry Edge Runtime Configuration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge API routes).
 * Errors that occur in middleware or edge functions will be caught here.
 *
 * NOTE: @sentry/nextjs is an optional dependency.
 * This file is a no-op stub when Sentry is not installed.
 *
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

// This is a stub file - actual Sentry initialization happens in instrumentation.ts
// when @sentry/nextjs is installed and NEXT_PUBLIC_SENTRY_DSN is configured.

export {}

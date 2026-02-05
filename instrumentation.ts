/**
 * Next.js Instrumentation
 *
 * This file runs when the Next.js server starts.
 * Used for initializing monitoring, logging, and other instrumentation.
 *
 * To enable Sentry monitoring:
 * 1. Install @sentry/nextjs: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in your .env.local file
 * 3. Uncomment the Sentry initialization code below
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

export async function register() {
  // Instrumentation placeholder
  // Add monitoring, logging, or other initialization here

  // To enable Sentry, install @sentry/nextjs and uncomment below:
  /*
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')

    if (process.env.NEXT_RUNTIME === 'nodejs') {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      })
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      })
    }
  }
  */
}

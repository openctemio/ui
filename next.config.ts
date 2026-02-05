import type { NextConfig } from 'next'
import { validateEnv } from './src/lib/env'

// Optional bundle analyzer - only used when ANALYZE=true
let withBundleAnalyzer = (config: NextConfig) => config
if (process.env.ANALYZE === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bundleAnalyzer = require('@next/bundle-analyzer')
    withBundleAnalyzer = bundleAnalyzer({ enabled: true })
  } catch {
    console.warn(
      'Bundle analyzer not available - install @next/bundle-analyzer to use ANALYZE=true'
    )
  }
}

// Validate environment variables at build time
// This will throw an error if required vars are missing or invalid
if (process.env.NODE_ENV !== 'test') {
  validateEnv()
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Note: reactCompiler requires babel-plugin-react-compiler package
  // Disabled until package is added to dependencies

  /**
   * Output Configuration for Docker
   *
   * 'standalone' mode creates a minimal production build with only required dependencies
   * This significantly reduces Docker image size
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/output
   */
  output: 'standalone',

  /**
   * Security Headers
   *
   * Implements security best practices to protect against common vulnerabilities
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/headers
   */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Control which features and APIs can be used
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy - Prevents XSS attacks
          // Note: This is a strict policy. Adjust based on your needs.
          // API calls go through /api/proxy (same-origin) so connect-src 'self' is sufficient
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind + Google Fonts
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts stylesheets
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com", // Google Fonts files
              "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.exploop.io wss://*.exploop.io http://exploopio.local:* ws://exploopio.local:* http://*.exploop.local ws://*.exploop.local", // API + WebSocket calls
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Allow cross-origin requests in development (all origins)
  allowedDevOrigins: ['*'],
}

export default withBundleAnalyzer(nextConfig)

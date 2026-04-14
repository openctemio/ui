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
              (() => {
                if (process.env.NODE_ENV === 'development') {
                  return "connect-src 'self' http: ws: wss:" // Dev: allow all for HMR
                }
                // Prod: derive allowed origins from existing config
                const origins: string[] = ["'self'"]
                const appUrl = process.env.NEXT_PUBLIC_APP_URL
                const backendUrl = process.env.BACKEND_API_URL
                const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL
                if (appUrl) {
                  try {
                    const u = new URL(appUrl)
                    origins.push(`https://${u.hostname}`)
                    origins.push(`wss://${u.hostname}`)
                    // Also allow API port if different (e.g., :8080)
                    if (backendUrl) {
                      const b = new URL(backendUrl)
                      if (b.port && b.port !== '443') {
                        origins.push(`https://${u.hostname}:${b.port}`)
                        origins.push(`wss://${u.hostname}:${b.port}`)
                      }
                    }
                  } catch {
                    /* ignore invalid URL */
                  }
                }
                // Fallback if no config
                if (origins.length === 1)
                  origins.push('https://*.openctem.io', 'wss://*.openctem.io')
                return `connect-src ${origins.join(' ')}`
              })(),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Allowed dev origins for HMR/dev assets. Next.js 16 blocks cross-origin dev
  // requests by default (including HMR WebSockets from LAN IPs), so each developer
  // can add their IPs via NEXT_ALLOWED_DEV_ORIGINS=ip1,ip2 in .env.local.
  // Wildcards are not supported — you must enumerate IPs/hostnames.
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default withBundleAnalyzer(nextConfig)

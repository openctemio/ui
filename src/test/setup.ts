/**
 * Vitest Setup File
 *
 * Global test setup and configuration
 * Runs before all test files
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// ============================================
// CLEANUP
// ============================================

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// ============================================
// GLOBAL MOCKS
// ============================================

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}))

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}))

// ============================================
// ENVIRONMENT SETUP
// ============================================

// Set environment variables for tests
// Note: NODE_ENV is automatically set to 'test' by Vitest
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
}

// ============================================
// CONSOLE CONFIGURATION
// ============================================

// Suppress console output in tests (optional)
// Uncomment to reduce noise in test output
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// }

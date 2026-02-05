/**
 * Test Utilities
 *
 * Common utilities and helpers for testing
 */

import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'

// ============================================
// TYPES
// ============================================

interface AllTheProvidersProps {
  children: ReactNode
}

// ============================================
// TEST PROVIDERS
// ============================================

/**
 * Wrapper component with all necessary providers
 * Add your app providers here (Theme, Auth, etc.)
 */
function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <>
      {/* Add your providers here */}
      {/* Example: <ThemeProvider>, <AuthProvider>, etc. */}
      {children}
    </>
  )
}

// ============================================
// CUSTOM RENDER
// ============================================

/**
 * Custom render function with providers
 *
 * @example
 * renderWithProviders(<MyComponent />)
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// ============================================
// MOCK DATA HELPERS
// ============================================

/**
 * Generate mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    emailVerified: true,
    ...overrides,
  }
}

/**
 * Generate mock auth tokens
 */
export function createMockTokens(overrides = {}) {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    idToken: 'mock-id-token',
    expiresIn: 3600,
    ...overrides,
  }
}

// ============================================
// ASYNC HELPERS
// ============================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// RE-EXPORTS
// ============================================

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

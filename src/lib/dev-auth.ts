/**
 * Development Authentication Helpers
 *
 * Provides mock authentication for development/testing purposes.
 * This should NEVER be used in production.
 */

import type { AuthUser } from '@/stores/auth-store'

// Mock user data for development (admin role with full permissions)
export const DEV_USER: AuthUser & {
  username?: string
  emailVerified?: boolean
  realmRoles?: string[]
  clientRoles?: Record<string, string[]>
  permissions?: string[]
  tenantRole?: string
} = {
  id: 'dev-001',
  email: 'admin@openctem.io',
  name: 'Dev Admin',
  username: 'admin',
  emailVerified: true,
  roles: ['admin', 'security_analyst'],
  realmRoles: ['admin'],
  clientRoles: { ui: ['admin', 'security_analyst'] },
  permissions: [
    // Core
    'dashboard:read',
    'audit:read',
    // Assets
    'assets:read',
    'assets:write',
    'assets:delete',
    'assets:groups:read',
    'assets:groups:write',
    'assets:groups:delete',
    'assets:repositories:read',
    'assets:repositories:write',
    'assets:components:read',
    'assets:components:write',
    'assets:branches:read',
    'assets:branches:write',
    // Findings
    'findings:read',
    'findings:write',
    'findings:delete',
    'findings:vulnerabilities:read',
    'findings:credentials:read',
    'findings:credentials:write',
    'findings:remediation:read',
    'findings:remediation:write',
    'findings:workflows:read',
    'findings:workflows:write',
    // Scans
    'scans:read',
    'scans:write',
    'scans:delete',
    'scans:profiles:read',
    'scans:profiles:write',
    'scans:sources:read',
    'scans:sources:write',
    'scans:tools:read',
    'scans:tenant_tools:read',
    'scans:tenant_tools:write',
    // Agents
    'agents:read',
    'agents:write',
    'agents:commands:read',
    'agents:commands:write',
    // Team
    'team:read',
    'team:update',
    'team:members:read',
    'team:members:invite',
    'team:members:write',
    'team:groups:read',
    'team:groups:write',
    'team:groups:members',
    'team:roles:read',
    'team:roles:write',
    'team:roles:assign',
    'team:permission_sets:read',
    'team:permission_sets:write',
    'team:assignment_rules:read',
    'team:assignment_rules:write',
    // Integrations
    'integrations:read',
    'integrations:manage',
    'integrations:scm:read',
    'integrations:scm:write',
    'integrations:notifications:read',
    'integrations:notifications:write',
    'integrations:webhooks:read',
    'integrations:webhooks:write',
    'integrations:api_keys:read',
    'integrations:api_keys:write',
    'integrations:pipelines:read',
    'integrations:pipelines:write',
    // Settings
    'settings:billing:read',
    'settings:sla:read',
    'settings:sla:write',
    // Attack Surface
    'attack_surface:scope:read',
    'attack_surface:scope:write',
    // Validation
    'validation:read',
    'validation:write',
    // Reports
    'reports:read',
    'reports:write',
  ],
  tenantId: 'dev-tenant-001',
  tenantRole: 'admin',
}

// Mock credentials
export const DEV_CREDENTIALS = {
  email: 'admin@openctem.io',
  password: 'admin123',
}

/**
 * Generate a mock JWT token for development
 * This is NOT a real JWT - it's just for bypassing auth in dev mode
 */
export function generateDevToken(): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 86400 // 24 hours from now

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      // Standard JWT claims
      sub: DEV_USER.id,
      iat: now,
      exp: exp,
      iss: 'dev-issuer',
      aud: 'ui',

      // User claims
      email: DEV_USER.email,
      email_verified: DEV_USER.emailVerified,
      name: DEV_USER.name,
      preferred_username: DEV_USER.username,

      // Roles
      realm_access: { roles: DEV_USER.realmRoles },
      resource_access: {
        ui: { roles: DEV_USER.roles },
      },

      // Permissions and tenant context
      permissions: DEV_USER.permissions,
      tenant: DEV_USER.tenantId,
      role: DEV_USER.tenantRole,
    })
  )
  const signature = btoa('dev-signature')

  return `${header}.${payload}.${signature}`
}

/**
 * Validate dev credentials
 */
export function validateDevCredentials(email: string, password: string): boolean {
  return email === DEV_CREDENTIALS.email && password === DEV_CREDENTIALS.password
}

/**
 * Check if dev auth is enabled
 */
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Dev auth cookie name
 */
export const DEV_AUTH_COOKIE = 'dev_auth_token'

/**
 * Set dev auth cookie (for middleware/proxy to recognize)
 */
export function setDevAuthCookie(): void {
  if (typeof document !== 'undefined') {
    const token = generateDevToken()
    // Set cookie that expires in 24 hours
    const expires = new Date(Date.now() + 86400 * 1000).toUTCString()
    document.cookie = `${DEV_AUTH_COOKIE}=${token}; path=/; expires=${expires}; SameSite=Lax`
  }
}

/**
 * Clear dev auth cookie
 */
export function clearDevAuthCookie(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${DEV_AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  }
}

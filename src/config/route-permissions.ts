/**
 * Route Permission Mapping
 *
 * Maps routes to their required permissions and modules.
 * Used by RouteGuard to check if user can access a route.
 *
 * Access Control Layers (checked in order):
 * 1. Module (Licensing) - Does tenant's plan include this module?
 * 2. Permission (RBAC) - Does user have the required permission?
 *
 * Pattern matching:
 * - Exact match: '/settings/audit' matches only that path
 * - Wildcard: '/assets/*' matches '/assets/domains', '/assets/cloud', etc.
 * - Double wildcard: '/settings/**' matches all nested paths
 *
 * Priority:
 * - More specific patterns match first (longer paths)
 * - Exact matches take precedence over wildcards
 */

import { Permission } from '@/lib/permissions'

export interface RoutePermissionConfig {
  /** Required permission to access this route (RBAC layer) */
  permission: string
  /** Required module from tenant's plan (Licensing layer) */
  module?: string
  /** Optional: Redirect to this path if permission denied (default: show access denied) */
  redirectTo?: string
  /** Optional: Custom message to show when access denied */
  message?: string
}

/**
 * Module IDs (matches backend licensing module IDs)
 *
 * NOTE: Only include modules that are actually in the licensing system.
 * Core features like "team", "billing" are NOT licensed modules - they're
 * always available and only controlled by RBAC permissions.
 */
export const Module = {
  Dashboard: 'dashboard',
  Assets: 'assets',
  Findings: 'findings',
  Scans: 'scans',
  Reports: 'reports',
  Audit: 'audit',
  Components: 'components',
  Pentest: 'pentest',
  Credentials: 'credentials',
  Remediation: 'remediation',
  ThreatIntel: 'threat_intel',
  Integrations: 'integrations',
} as const

/**
 * Route to permission mapping
 *
 * Key: Route pattern (supports * and ** wildcards)
 * Value: Permission and module configuration
 */
export const routePermissions: Record<string, RoutePermissionConfig> = {
  // ========================================
  // Dashboard
  // Dashboard is a core feature - no module check required
  // Only RBAC permission check is needed
  // ========================================
  '/': {
    permission: Permission.DashboardRead,
    // NOTE: Removed module requirement - Dashboard is always available
    // Module check was causing "Feature Not Available" for users with
    // dashboard:read permission but tenant without dashboard module in plan
  },

  // ========================================
  // Scoping Phase (Module: assets)
  // ========================================
  '/attack-surface': {
    permission: Permission.AssetsRead,
    module: Module.Assets,
  },
  '/asset-groups': {
    permission: Permission.AssetGroupsRead,
    module: Module.Assets,
  },
  '/scope-config': {
    permission: Permission.ScopeRead,
    module: Module.Assets,
  },

  // ========================================
  // Discovery Phase - Assets (Module: assets)
  // ========================================
  '/assets/**': {
    permission: Permission.AssetsRead,
    module: Module.Assets,
  },

  // ========================================
  // Discovery Phase - Scans (Module: scans)
  // ========================================
  '/scans': {
    permission: Permission.ScansRead,
    module: Module.Scans,
  },
  '/scans/**': {
    permission: Permission.ScansRead,
    module: Module.Scans,
  },

  // ========================================
  // Discovery Phase - Exposures (Module: findings)
  // ========================================
  '/exposures': {
    permission: Permission.FindingsRead,
    module: Module.Findings,
  },
  '/exposures/**': {
    permission: Permission.FindingsRead,
    module: Module.Findings,
  },

  // ========================================
  // Discovery Phase - Credentials (Module: credentials)
  // ========================================
  '/credentials': {
    permission: Permission.CredentialsRead,
    module: Module.Credentials,
  },
  '/credentials/**': {
    permission: Permission.CredentialsRead,
    module: Module.Credentials,
  },

  // ========================================
  // Discovery Phase - Components (Module: components)
  // ========================================
  '/components': {
    permission: Permission.ComponentsRead,
    module: Module.Components,
  },
  '/components/**': {
    permission: Permission.ComponentsRead,
    module: Module.Components,
  },

  // ========================================
  // Prioritization Phase (Module: threat_intel)
  // Backend uses VulnerabilitiesRead for threat intel routes
  // ========================================
  '/threat-intel': {
    permission: Permission.VulnerabilitiesRead,
    module: Module.ThreatIntel,
  },
  '/threat-intel/**': {
    permission: Permission.VulnerabilitiesRead,
    module: Module.ThreatIntel,
  },
  '/risk-analysis': {
    permission: Permission.VulnerabilitiesRead,
    module: Module.ThreatIntel,
  },
  '/business-impact': {
    permission: Permission.VulnerabilitiesRead,
    module: Module.ThreatIntel,
  },

  // ========================================
  // Validation Phase (Module: pentest)
  // ========================================
  '/pentest/**': {
    permission: Permission.PentestRead,
    module: Module.Pentest,
  },
  '/attack-simulation': {
    permission: Permission.PentestRead,
    module: Module.Pentest,
  },
  '/control-testing': {
    permission: Permission.PentestRead,
    module: Module.Pentest,
  },

  // ========================================
  // Mobilization Phase (Module: remediation)
  // ========================================
  '/remediation': {
    permission: Permission.RemediationRead,
    module: Module.Remediation,
  },
  '/remediation/**': {
    permission: Permission.RemediationRead,
    module: Module.Remediation,
  },
  '/workflows': {
    permission: Permission.WorkflowsRead,
    module: Module.Remediation,
  },
  '/workflows/**': {
    permission: Permission.WorkflowsRead,
    module: Module.Remediation,
  },

  // ========================================
  // Insights - Findings (Module: findings)
  // ========================================
  '/findings': {
    permission: Permission.FindingsRead,
    module: Module.Findings,
  },
  '/findings/**': {
    permission: Permission.FindingsRead,
    module: Module.Findings,
  },

  // ========================================
  // Insights - Reports (Module: reports)
  // ========================================
  '/reports': {
    permission: Permission.ReportsRead,
    module: Module.Reports,
  },
  '/reports/**': {
    permission: Permission.ReportsRead,
    module: Module.Reports,
  },

  // ========================================
  // Settings - Agents (Module: scans)
  // Backend uses AgentsRead for agent management routes
  // ========================================
  '/agents': {
    permission: Permission.AgentsRead,
    module: Module.Scans,
  },
  '/agents/**': {
    permission: Permission.AgentsRead,
    module: Module.Scans,
  },
  '/scan-profiles': {
    permission: Permission.ScanProfilesRead,
    module: Module.Scans,
  },
  '/scan-profiles/**': {
    permission: Permission.ScanProfilesRead,
    module: Module.Scans,
  },
  '/tools': {
    permission: Permission.ToolsRead,
    module: Module.Scans,
  },
  '/tools/**': {
    permission: Permission.ToolsRead,
    module: Module.Scans,
  },
  '/capabilities': {
    permission: Permission.ToolsRead,
    module: Module.Scans,
  },
  '/capabilities/**': {
    permission: Permission.ToolsRead,
    module: Module.Scans,
  },

  // ========================================
  // Settings - Organization (Core feature, no module required)
  // Team management is always available, controlled by RBAC only
  // ========================================
  '/settings/tenant': {
    permission: Permission.TeamUpdate,
    message: 'You need admin privileges to access tenant settings.',
  },
  '/settings/users': {
    permission: Permission.MembersRead,
  },
  '/settings/users/**': {
    permission: Permission.MembersRead,
  },
  '/settings/roles': {
    permission: Permission.RolesRead,
  },
  '/settings/roles/**': {
    permission: Permission.RolesRead,
  },
  '/settings/access-control/**': {
    permission: Permission.GroupsRead,
  },

  // ========================================
  // Settings - Audit Log (Admin/Owner only, no module required)
  // Audit is a core feature, controlled by RBAC only
  // ========================================
  '/settings/audit': {
    permission: Permission.AuditRead,
    message: 'Audit logs require admin or owner privileges.',
  },
  '/settings/audit/**': {
    permission: Permission.AuditRead,
    message: 'Audit logs require admin or owner privileges.',
  },

  // ========================================
  // Settings - Billing (Admin/Owner only, no module required)
  // Billing is a core feature, controlled by RBAC only
  // ========================================
  '/settings/billing': {
    permission: Permission.BillingRead,
    message: 'Billing information requires admin or owner privileges.',
  },
  '/settings/billing/**': {
    permission: Permission.BillingRead,
    message: 'Billing information requires admin or owner privileges.',
  },

  // ========================================
  // Settings - Integrations (Module: integrations)
  // ========================================
  '/settings/integrations': {
    permission: Permission.IntegrationsRead,
    module: Module.Integrations,
  },
  '/settings/integrations/**': {
    permission: Permission.IntegrationsRead,
    module: Module.Integrations,
  },
}

/**
 * Match a pathname against route permission patterns
 *
 * @param pathname - The current pathname (e.g., '/settings/audit')
 * @returns The matching route config or undefined if no match
 */
export function matchRoutePermission(pathname: string): RoutePermissionConfig | undefined {
  // Normalize pathname (remove trailing slash)
  const normalizedPath =
    pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname

  // First, try exact match
  if (routePermissions[normalizedPath]) {
    return routePermissions[normalizedPath]
  }

  // Then, try pattern matching (sorted by specificity - longer patterns first)
  const patterns = Object.keys(routePermissions)
    .filter((p) => p.includes('*'))
    .sort((a, b) => b.length - a.length)

  for (const pattern of patterns) {
    if (matchPattern(pattern, normalizedPath)) {
      return routePermissions[pattern]
    }
  }

  return undefined
}

/**
 * Match a pathname against a pattern with wildcards
 *
 * Supports:
 * - '*' matches a single path segment
 * - '**' matches any number of segments
 *
 * @param pattern - Route pattern (e.g., '/assets/*', '/settings/**')
 * @param pathname - Actual pathname to match
 */
function matchPattern(pattern: string, pathname: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    // Escape special regex characters except * and /
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Replace ** with a marker
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    // Replace * with single segment match
    .replace(/\*/g, '[^/]+')
    // Replace marker with multi-segment match
    .replace(/__DOUBLE_STAR__/g, '.*')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(pathname)
}

/**
 * Get all routes that require a specific permission
 * Useful for debugging and documentation
 */
export function getRoutesForPermission(permission: string): string[] {
  return Object.entries(routePermissions)
    .filter(([, config]) => config.permission === permission)
    .map(([route]) => route)
}

/**
 * Check if a route requires any permission
 * Returns false for public dashboard routes
 */
export function isProtectedRoute(pathname: string): boolean {
  return matchRoutePermission(pathname) !== undefined
}

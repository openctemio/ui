'use client';

/**
 * Tenant Permission Modules Hook
 *
 * Returns permission modules filtered by tenant's enabled modules.
 * This ensures that roles UI only shows permissions for features
 * the tenant has access to based on their subscription plan.
 *
 * For example, a Free plan tenant won't see Findings, Scans, Reports
 * permissions since they don't have access to those modules.
 */

import { useMemo } from 'react';
import { usePermissionModules } from './use-roles';
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules';
// Note: PermissionModule is re-exported from usePermissionModules, no need to import here

/**
 * Mapping of permission module IDs to licensing module IDs
 *
 * Supports both legacy and new standardized permission formats:
 * - Legacy: module:action (e.g., 'findings:read')
 * - New: module:subfeature:action (e.g., 'integrations:scm:read')
 *
 * Aligned with CTEM framework stages:
 * - Scoping: attack_surface
 * - Discovery: scans, findings, assets
 * - Prioritization: risk, threat_intel
 * - Validation: validation
 * - Mobilization: campaigns, integrations
 */
const PERMISSION_TO_LICENSE_MODULE: Record<string, string> = {
  // ===========================================
  // CORE MODULES (available in all plans)
  // ===========================================
  dashboard: 'dashboard',
  assets: 'assets',
  team: 'team',
  settings: 'settings',

  // ===========================================
  // CTEM STAGE 1: SCOPING
  // ===========================================
  attack_surface: 'attack_surface',
  subdomains: 'attack_surface',
  ip_ranges: 'attack_surface',
  technologies: 'attack_surface',
  scope: 'attack_surface', // Legacy alias

  // ===========================================
  // CTEM STAGE 2: DISCOVERY
  // ===========================================
  // Findings (includes exposures, vulnerabilities)
  findings: 'findings',
  exposures: 'findings', // Alias
  vulnerabilities: 'findings',
  credentials: 'findings',
  evidence: 'findings',

  // Scanning
  scans: 'scans',
  scan_profiles: 'scans',
  sources: 'scans',
  tools: 'scans',
  tenant_tools: 'scans',

  // Agents
  agents: 'agents',
  commands: 'agents',

  // ===========================================
  // CTEM STAGE 3: PRIORITIZATION
  // ===========================================
  risk: 'risk',
  risk_config: 'risk',
  attack_paths: 'risk',
  business_context: 'risk',
  risk_overrides: 'risk',

  threat_intel: 'threat_intel',
  threat_feeds: 'threat_intel',
  iocs: 'threat_intel',
  threat_actors: 'threat_intel',

  // ===========================================
  // CTEM STAGE 4: VALIDATION
  // ===========================================
  validation: 'validation',
  exploit_validation: 'validation',
  control_testing: 'validation',
  purple_team: 'validation',
  pentest: 'validation', // Legacy alias

  // ===========================================
  // CTEM STAGE 5: MOBILIZATION
  // ===========================================
  campaigns: 'campaigns',
  remediation_campaigns: 'campaigns',
  initiatives: 'campaigns',
  sla: 'campaigns',
  remediation: 'campaigns', // Legacy alias

  // Integrations (includes all sub-features)
  integrations: 'integrations',
  notifications: 'integrations',
  webhooks: 'integrations',
  api_keys: 'integrations',
  scm_connections: 'integrations',
  scm: 'integrations', // New standardized
  pipelines: 'integrations',

  // ===========================================
  // SUPPORTING MODULES
  // ===========================================
  // Metrics & Reporting
  metrics: 'metrics',
  dashboards: 'metrics',
  trends: 'metrics',
  executive_reports: 'metrics',
  reports: 'reports',

  // Compliance
  policies: 'findings',
  audit: 'audit',

  // Admin - Legacy naming (hyphenated)
  'asset-groups': 'assets',
  'scan-profiles': 'scans',
  'scm-connections': 'integrations',
  'permission-sets': 'team',
  'assignment-rules': 'team',
  'tenant-tools': 'scans',

  // Admin - New naming (hierarchical)
  branches: 'assets',
  components: 'assets',
  repositories: 'assets',
  asset_groups: 'assets',
  groups: 'team',
  roles: 'team',
  members: 'team',
  permission_sets: 'team',
  assignment_rules: 'team',
  workflows: 'findings',
  billing: 'settings',
};

/**
 * Check if a permission module is available based on tenant's enabled modules
 * Handles both legacy (module:action) and new (module:subfeature:action) formats
 */
function isModuleAvailable(permissionModuleId: string, enabledModuleIds: string[]): boolean {
  // Direct lookup first
  let licenseModuleId = PERMISSION_TO_LICENSE_MODULE[permissionModuleId];

  // If not found, try looking up just the first part (for hierarchical permissions)
  // e.g., "integrations:scm:read" -> try "integrations"
  if (!licenseModuleId && permissionModuleId.includes(':')) {
    const basePart = permissionModuleId.split(':')[0];
    licenseModuleId = PERMISSION_TO_LICENSE_MODULE[basePart];
  }

  // If no mapping exists, assume it's available (fail open for unknown modules)
  if (!licenseModuleId) {
    return true;
  }

  return enabledModuleIds.includes(licenseModuleId);
}

/**
 * Hook to get permission modules filtered by tenant's subscription
 *
 * @param filterByPlan - If true, filters modules by tenant's plan. Default: true
 * @returns Filtered permission modules and loading states
 *
 * @example
 * ```tsx
 * function PermissionPicker() {
 *   const { modules, isLoading } = useTenantPermissionModules();
 *   // modules only includes permissions for tenant's enabled features
 * }
 * ```
 */
export function useTenantPermissionModules(filterByPlan: boolean = true) {
  const { modules: allModules, isLoading: modulesLoading, error: modulesError } = usePermissionModules();
  const { moduleIds: enabledModuleIds, isLoading: tenantModulesLoading } = useTenantModules();

  const filteredModules = useMemo(() => {
    // If not filtering or tenant modules not loaded yet, return all (but still filter empty modules)
    if (!filterByPlan || tenantModulesLoading || enabledModuleIds.length === 0) {
      // Still filter out modules with no permissions
      return allModules.filter((module) => module.permissions.length > 0);
    }

    // Filter modules based on tenant's enabled modules AND has permissions
    return allModules.filter(
      (module) => module.permissions.length > 0 && isModuleAvailable(module.id, enabledModuleIds)
    );
  }, [allModules, enabledModuleIds, filterByPlan, tenantModulesLoading]);

  // Calculate stats
  const totalPermissions = useMemo(() => {
    return filteredModules.reduce((sum, m) => sum + m.permissions.length, 0);
  }, [filteredModules]);

  const hiddenModulesCount = allModules.length - filteredModules.length;

  return {
    /** Filtered permission modules based on tenant's plan */
    modules: filteredModules,
    /** Total number of available permissions */
    totalPermissions,
    /** Number of modules hidden due to plan restrictions */
    hiddenModulesCount,
    /** All modules (unfiltered) */
    allModules,
    /** Tenant's enabled module IDs */
    enabledModuleIds,
    /** Loading state */
    isLoading: modulesLoading || tenantModulesLoading,
    /** Error if any */
    error: modulesError,
  };
}

/**
 * Filter a list of permission IDs to only include those available to the tenant
 *
 * Handles multiple permission formats:
 * - Legacy: 'findings:read' -> module = 'findings'
 * - New hierarchical: 'integrations:scm:read' -> module = 'integrations', subfeature = 'scm'
 * - Hyphenated legacy: 'asset-groups:read' -> module = 'asset-groups'
 *
 * @param permissionIds - List of permission IDs
 * @param enabledModuleIds - Tenant's enabled module IDs
 * @returns Filtered permission IDs
 */
export function filterPermissionsByTenantModules(
  permissionIds: string[],
  enabledModuleIds: string[]
): string[] {
  return permissionIds.filter((permId) => {
    // Extract module ID from permission
    const parts = permId.split(':');
    const moduleId = parts[0];

    // For 3-part permissions (module:subfeature:action), also check subfeature
    // e.g., 'integrations:scm:read' -> check both 'integrations' and 'scm'
    if (parts.length === 3) {
      const subfeature = parts[1];
      // Check if either the module or subfeature is available
      return isModuleAvailable(moduleId, enabledModuleIds) ||
             isModuleAvailable(subfeature, enabledModuleIds);
    }

    return isModuleAvailable(moduleId, enabledModuleIds);
  });
}

/**
 * Hook to get filtered permission count for a role
 *
 * @param permissions - Role's permission IDs
 * @returns Available and total permission counts
 */
export function useFilteredPermissionCount(permissions: string[]) {
  const { moduleIds: enabledModuleIds, isLoading } = useTenantModules();

  const counts = useMemo(() => {
    if (isLoading || enabledModuleIds.length === 0) {
      return {
        available: permissions.length,
        total: permissions.length,
        hidden: 0,
      };
    }

    const available = filterPermissionsByTenantModules(permissions, enabledModuleIds);
    return {
      available: available.length,
      total: permissions.length,
      hidden: permissions.length - available.length,
    };
  }, [permissions, enabledModuleIds, isLoading]);

  return {
    ...counts,
    isLoading,
  };
}

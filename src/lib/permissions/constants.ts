/**
 * Permission & Role Constants
 *
 * These constants mirror the backend definitions.
 * Use these for type-safe permission and role checking.
 *
 * Permission naming convention follows hierarchical pattern:
 *   {module}:{subfeature}:{action}
 *
 * Examples:
 *   - integrations:scm:read (read SCM connections)
 *   - assets:groups:write (manage asset groups)
 *   - team:roles:assign (assign roles to users)
 *
 * For simpler permissions without subfeatures:
 *   {module}:{action}
 *
 * Examples:
 *   - dashboard:read
 *   - assets:read
 *
 * Roles: owner, admin, member, viewer
 * - Use roles for high-level access checks (e.g., "is owner")
 * - Use permissions for granular feature access (e.g., "can write assets")
 */

/**
 * Role Constants
 * Match backend tenant.Role values
 */
export const Role = {
  Owner: 'owner',
  Admin: 'admin',
  Member: 'member',
  Viewer: 'viewer',
} as const

export type RoleString = (typeof Role)[keyof typeof Role]

/**
 * All roles for validation
 */
export const AllRoles = Object.values(Role)

/**
 * Check if a string is a valid role
 */
export function isValidRole(value: string): value is RoleString {
  return AllRoles.includes(value as RoleString)
}

/**
 * Role hierarchy for comparison
 * Higher index = more privileges
 */
export const RoleHierarchy: Record<RoleString, number> = {
  [Role.Viewer]: 0,
  [Role.Member]: 1,
  [Role.Admin]: 2,
  [Role.Owner]: 3,
}

/**
 * Check if a role has at least the same privileges as another
 * e.g., isRoleAtLeast('admin', 'member') => true
 */
export function isRoleAtLeast(userRole: string, requiredRole: RoleString): boolean {
  const userLevel = RoleHierarchy[userRole as RoleString] ?? -1
  const requiredLevel = RoleHierarchy[requiredRole] ?? -1
  return userLevel >= requiredLevel
}

export const Permission = {
  // ===========================================
  // CORE MODULES
  // ===========================================
  DashboardRead: 'dashboard:read',
  AuditRead: 'audit:read',

  // ===========================================
  // ASSETS MODULE
  // ===========================================
  AssetsRead: 'assets:read',
  AssetsWrite: 'assets:write',
  AssetsDelete: 'assets:delete',

  // Asset Groups (assets:groups:*)
  AssetGroupsRead: 'assets:groups:read',
  AssetGroupsWrite: 'assets:groups:write',
  AssetGroupsDelete: 'assets:groups:delete',

  // Components (assets:components:*)
  // Note: Components (SBOM) is a separate module with its own permissions
  ComponentsRead: 'assets:components:read',
  ComponentsWrite: 'assets:components:write',
  ComponentsDelete: 'assets:components:delete',

  // Note: Repositories and Branches use general assets:* permissions
  // as they are just asset types, not separate security boundaries

  // ===========================================
  // FINDINGS MODULE
  // ===========================================
  FindingsRead: 'findings:read',
  FindingsWrite: 'findings:write',
  FindingsDelete: 'findings:delete',

  // Vulnerabilities (findings:vulnerabilities:*)
  VulnerabilitiesRead: 'findings:vulnerabilities:read',
  VulnerabilitiesWrite: 'findings:vulnerabilities:write',
  VulnerabilitiesDelete: 'findings:vulnerabilities:delete',

  // Credentials (findings:credentials:*)
  CredentialsRead: 'findings:credentials:read',
  CredentialsWrite: 'findings:credentials:write',

  // Remediation (findings:remediation:*)
  RemediationRead: 'findings:remediation:read',
  RemediationWrite: 'findings:remediation:write',

  // Workflows (findings:workflows:*)
  WorkflowsRead: 'findings:workflows:read',
  WorkflowsWrite: 'findings:workflows:write',

  // Policies (findings:policies:*)
  PoliciesRead: 'findings:policies:read',
  PoliciesWrite: 'findings:policies:write',
  PoliciesDelete: 'findings:policies:delete',

  // ===========================================
  // SCANS MODULE
  // ===========================================
  ScansRead: 'scans:read',
  ScansWrite: 'scans:write',
  ScansDelete: 'scans:delete',
  ScansExecute: 'scans:execute',

  // Scan Profiles (scans:profiles:*)
  ScanProfilesRead: 'scans:profiles:read',
  ScanProfilesWrite: 'scans:profiles:write',
  ScanProfilesDelete: 'scans:profiles:delete',

  // Sources (scans:sources:*)
  SourcesRead: 'scans:sources:read',
  SourcesWrite: 'scans:sources:write',
  SourcesDelete: 'scans:sources:delete',

  // Tools (scans:tools:*)
  ToolsRead: 'scans:tools:read',
  ToolsWrite: 'scans:tools:write',
  ToolsDelete: 'scans:tools:delete',

  // Tenant Tools (scans:tenant_tools:*)
  TenantToolsRead: 'scans:tenant_tools:read',
  TenantToolsWrite: 'scans:tenant_tools:write',
  TenantToolsDelete: 'scans:tenant_tools:delete',

  // Scanner Templates (scans:templates:*)
  ScannerTemplatesRead: 'scans:templates:read',
  ScannerTemplatesWrite: 'scans:templates:write',
  ScannerTemplatesDelete: 'scans:templates:delete',

  // Template Sources (scans:sources:* - shared with Sources)
  TemplateSourcesRead: 'scans:sources:read',
  TemplateSourcesWrite: 'scans:sources:write',
  TemplateSourcesDelete: 'scans:sources:delete',

  // Secret Store (scans:secret_store:*)
  SecretStoreRead: 'scans:secret_store:read',
  SecretStoreWrite: 'scans:secret_store:write',
  SecretStoreDelete: 'scans:secret_store:delete',

  // ===========================================
  // AGENTS MODULE
  // ===========================================
  AgentsRead: 'agents:read',
  AgentsWrite: 'agents:write',
  AgentsDelete: 'agents:delete',

  // Commands (agents:commands:*)
  CommandsRead: 'agents:commands:read',
  CommandsWrite: 'agents:commands:write',
  CommandsDelete: 'agents:commands:delete',

  // ===========================================
  // TEAM MODULE (Access Control)
  // ===========================================
  TeamRead: 'team:read',
  TeamUpdate: 'team:update',
  TeamDelete: 'team:delete',

  // Members (team:members:*)
  MembersRead: 'team:members:read',
  MembersInvite: 'team:members:invite',
  MembersWrite: 'team:members:write',

  // Groups (team:groups:*)
  GroupsRead: 'team:groups:read',
  GroupsWrite: 'team:groups:write',
  GroupsDelete: 'team:groups:delete',
  GroupsMembers: 'team:groups:members',
  GroupsAssets: 'team:groups:assets',

  // Roles (team:roles:*)
  RolesRead: 'team:roles:read',
  RolesWrite: 'team:roles:write',
  RolesDelete: 'team:roles:delete',
  RolesAssign: 'team:roles:assign',

  // Permission Sets (team:permission_sets:*)
  PermissionSetsRead: 'team:permission_sets:read',
  PermissionSetsWrite: 'team:permission_sets:write',
  PermissionSetsDelete: 'team:permission_sets:delete',

  // Assignment Rules (team:assignment_rules:*)
  AssignmentRulesRead: 'team:assignment_rules:read',
  AssignmentRulesWrite: 'team:assignment_rules:write',
  AssignmentRulesDelete: 'team:assignment_rules:delete',

  // ===========================================
  // INTEGRATIONS MODULE
  // ===========================================
  IntegrationsRead: 'integrations:read',
  IntegrationsManage: 'integrations:manage',

  // SCM Connections (integrations:scm:*)
  ScmConnectionsRead: 'integrations:scm:read',
  ScmConnectionsWrite: 'integrations:scm:write',
  ScmConnectionsDelete: 'integrations:scm:delete',

  // Notifications (integrations:notifications:*)
  NotificationsRead: 'integrations:notifications:read',
  NotificationsWrite: 'integrations:notifications:write',
  NotificationsDelete: 'integrations:notifications:delete',

  // Webhooks (integrations:webhooks:*)
  WebhooksRead: 'integrations:webhooks:read',
  WebhooksWrite: 'integrations:webhooks:write',
  WebhooksDelete: 'integrations:webhooks:delete',

  // API Keys (integrations:api_keys:*)
  ApiKeysRead: 'integrations:api_keys:read',
  ApiKeysWrite: 'integrations:api_keys:write',
  ApiKeysDelete: 'integrations:api_keys:delete',

  // Pipelines (integrations:pipelines:*)
  PipelinesRead: 'integrations:pipelines:read',
  PipelinesWrite: 'integrations:pipelines:write',
  PipelinesDelete: 'integrations:pipelines:delete',
  PipelinesExecute: 'integrations:pipelines:execute',

  // ===========================================
  // SETTINGS MODULE
  // ===========================================
  BillingRead: 'settings:billing:read',
  BillingWrite: 'settings:billing:write',

  // SLA (settings:sla:*)
  SLARead: 'settings:sla:read',
  SLAWrite: 'settings:sla:write',
  SLADelete: 'settings:sla:delete',

  // ===========================================
  // ATTACK SURFACE MODULE (CTEM Scoping)
  // ===========================================
  ScopeRead: 'attack_surface:scope:read',
  ScopeWrite: 'attack_surface:scope:write',
  ScopeDelete: 'attack_surface:scope:delete',

  // ===========================================
  // VALIDATION MODULE (CTEM)
  // ===========================================
  ValidationRead: 'validation:read',
  ValidationWrite: 'validation:write',

  // ===========================================
  // REPORTS MODULE
  // ===========================================
  ReportsRead: 'reports:read',
  ReportsWrite: 'reports:write',

  // ===========================================
  // LEGACY ALIASES (for backward compatibility)
  // ===========================================
  MembersManage: 'team:members:write', // Alias for MembersWrite
  BillingManage: 'settings:billing:write', // Alias for BillingWrite
  PentestRead: 'validation:read', // Alias for ValidationRead
  PentestWrite: 'validation:write', // Alias for ValidationWrite
  GroupsPermissions: 'team:groups:write', // Alias for GroupsWrite

  // Legacy project permissions (mapped to assets)
  ProjectsRead: 'assets:read',
  ProjectsWrite: 'assets:write',
  ProjectsDelete: 'assets:delete',
} as const

/**
 * Permission string type
 */
export type PermissionString = (typeof Permission)[keyof typeof Permission]

/**
 * All permission values as an array
 */
export const AllPermissions = Object.values(Permission)

/**
 * Check if a string is a valid permission
 */
export function isValidPermission(value: string): value is PermissionString {
  return AllPermissions.includes(value as PermissionString)
}

/**
 * Permission groups for common use cases
 */
export const PermissionGroups = {
  // All read permissions
  AllRead: [
    Permission.DashboardRead,
    Permission.AssetsRead,
    Permission.AssetGroupsRead,
    Permission.ComponentsRead,
    Permission.FindingsRead,
    Permission.VulnerabilitiesRead,
    Permission.CredentialsRead,
    Permission.RemediationRead,
    Permission.WorkflowsRead,
    Permission.ScansRead,
    Permission.ScanProfilesRead,
    Permission.SourcesRead,
    Permission.ToolsRead,
    Permission.TenantToolsRead,
    Permission.ScannerTemplatesRead,
    Permission.TemplateSourcesRead,
    Permission.SecretStoreRead,
    Permission.AgentsRead,
    Permission.CommandsRead,
    Permission.TeamRead,
    Permission.MembersRead,
    Permission.GroupsRead,
    Permission.RolesRead,
    Permission.PermissionSetsRead,
    Permission.AssignmentRulesRead,
    Permission.IntegrationsRead,
    Permission.ScmConnectionsRead,
    Permission.NotificationsRead,
    Permission.WebhooksRead,
    Permission.ApiKeysRead,
    Permission.PipelinesRead,
    Permission.BillingRead,
    Permission.SLARead,
    Permission.ScopeRead,
    Permission.ValidationRead,
    Permission.ReportsRead,
    Permission.AuditRead,
  ],

  // All write permissions
  AllWrite: [
    Permission.AssetsWrite,
    Permission.AssetGroupsWrite,
    Permission.ComponentsWrite,
    Permission.FindingsWrite,
    Permission.VulnerabilitiesWrite,
    Permission.CredentialsWrite,
    Permission.RemediationWrite,
    Permission.WorkflowsWrite,
    Permission.PoliciesWrite,
    Permission.ScansWrite,
    Permission.ScanProfilesWrite,
    Permission.SourcesWrite,
    Permission.ToolsWrite,
    Permission.TenantToolsWrite,
    Permission.ScannerTemplatesWrite,
    Permission.TemplateSourcesWrite,
    Permission.SecretStoreWrite,
    Permission.AgentsWrite,
    Permission.CommandsWrite,
    Permission.TeamUpdate,
    Permission.MembersWrite,
    Permission.GroupsWrite,
    Permission.RolesWrite,
    Permission.PermissionSetsWrite,
    Permission.AssignmentRulesWrite,
    Permission.ScmConnectionsWrite,
    Permission.NotificationsWrite,
    Permission.WebhooksWrite,
    Permission.ApiKeysWrite,
    Permission.PipelinesWrite,
    Permission.BillingWrite,
    Permission.SLAWrite,
    Permission.ScopeWrite,
    Permission.ValidationWrite,
    Permission.ReportsWrite,
  ],

  // All delete permissions
  AllDelete: [
    Permission.AssetsDelete,
    Permission.AssetGroupsDelete,
    Permission.ComponentsDelete,
    Permission.FindingsDelete,
    Permission.VulnerabilitiesDelete,
    Permission.PoliciesDelete,
    Permission.ScansDelete,
    Permission.ScanProfilesDelete,
    Permission.SourcesDelete,
    Permission.ToolsDelete,
    Permission.TenantToolsDelete,
    Permission.ScannerTemplatesDelete,
    Permission.TemplateSourcesDelete,
    Permission.SecretStoreDelete,
    Permission.AgentsDelete,
    Permission.CommandsDelete,
    Permission.TeamDelete,
    Permission.GroupsDelete,
    Permission.RolesDelete,
    Permission.PermissionSetsDelete,
    Permission.AssignmentRulesDelete,
    Permission.ScmConnectionsDelete,
    Permission.NotificationsDelete,
    Permission.WebhooksDelete,
    Permission.ApiKeysDelete,
    Permission.PipelinesDelete,
    Permission.SLADelete,
    Permission.ScopeDelete,
  ],

  // Team management permissions
  TeamManagement: [
    Permission.TeamRead,
    Permission.TeamUpdate,
    Permission.MembersRead,
    Permission.MembersInvite,
    Permission.MembersWrite,
    Permission.GroupsRead,
    Permission.GroupsWrite,
    Permission.GroupsMembers,
    Permission.GroupsAssets,
    Permission.RolesRead,
    Permission.RolesWrite,
    Permission.RolesAssign,
    Permission.PermissionSetsRead,
    Permission.PermissionSetsWrite,
  ],

  // Security/vulnerability permissions
  Security: [
    Permission.FindingsRead,
    Permission.FindingsWrite,
    Permission.FindingsDelete,
    Permission.VulnerabilitiesRead,
    Permission.VulnerabilitiesWrite,
    Permission.CredentialsRead,
    Permission.CredentialsWrite,
    Permission.ValidationRead,
    Permission.ValidationWrite,
    Permission.ScopeRead,
    Permission.ScopeWrite,
  ],
} as const

/**
 * Human-readable permission labels for UI display
 * Used in tooltips when user lacks permission
 */
export const PermissionLabels: Partial<Record<PermissionString, string>> = {
  // Core
  [Permission.DashboardRead]: 'View Dashboard',
  [Permission.AuditRead]: 'View Audit Logs',

  // Assets
  [Permission.AssetsRead]: 'View Assets',
  [Permission.AssetsWrite]: 'Edit Assets',
  [Permission.AssetsDelete]: 'Delete Assets',
  [Permission.AssetGroupsRead]: 'View Asset Groups',
  [Permission.AssetGroupsWrite]: 'Manage Asset Groups',
  [Permission.AssetGroupsDelete]: 'Delete Asset Groups',
  [Permission.ComponentsRead]: 'View Components',
  [Permission.ComponentsWrite]: 'Edit Components',
  [Permission.ComponentsDelete]: 'Delete Components',

  // Findings
  [Permission.FindingsRead]: 'View Findings',
  [Permission.FindingsWrite]: 'Edit Findings',
  [Permission.FindingsDelete]: 'Delete Findings',
  [Permission.VulnerabilitiesRead]: 'View Vulnerabilities',
  [Permission.VulnerabilitiesWrite]: 'Edit Vulnerabilities',
  [Permission.VulnerabilitiesDelete]: 'Delete Vulnerabilities',
  [Permission.CredentialsRead]: 'View Credentials',
  [Permission.CredentialsWrite]: 'Manage Credentials',
  [Permission.RemediationRead]: 'View Remediation',
  [Permission.RemediationWrite]: 'Manage Remediation',
  [Permission.WorkflowsRead]: 'View Workflows',
  [Permission.WorkflowsWrite]: 'Manage Workflows',
  [Permission.PoliciesRead]: 'View Policies',
  [Permission.PoliciesWrite]: 'Manage Policies',
  [Permission.PoliciesDelete]: 'Delete Policies',

  // Scans
  [Permission.ScansRead]: 'View Scans',
  [Permission.ScansWrite]: 'Manage Scans',
  [Permission.ScansDelete]: 'Delete Scans',
  [Permission.ScansExecute]: 'Execute Scans',
  [Permission.ScanProfilesRead]: 'View Scan Profiles',
  [Permission.ScanProfilesWrite]: 'Manage Scan Profiles',
  [Permission.ScanProfilesDelete]: 'Delete Scan Profiles',
  [Permission.SourcesRead]: 'View Sources',
  [Permission.SourcesWrite]: 'Manage Sources',
  [Permission.SourcesDelete]: 'Delete Sources',
  [Permission.ToolsRead]: 'View Tools',
  [Permission.ToolsWrite]: 'Manage Tools',
  [Permission.ToolsDelete]: 'Delete Tools',
  [Permission.TenantToolsRead]: 'View Tool Configs',
  [Permission.TenantToolsWrite]: 'Manage Tool Configs',
  [Permission.TenantToolsDelete]: 'Delete Tool Configs',
  [Permission.ScannerTemplatesRead]: 'View Scanner Templates',
  [Permission.ScannerTemplatesWrite]: 'Manage Scanner Templates',
  [Permission.ScannerTemplatesDelete]: 'Delete Scanner Templates',
  // Note: TemplateSourcesRead/Write/Delete use the same permission strings as SourcesRead/Write/Delete
  // so they share the same labels
  [Permission.SecretStoreRead]: 'View Secret Store',
  [Permission.SecretStoreWrite]: 'Manage Secret Store',
  [Permission.SecretStoreDelete]: 'Delete Secrets',

  // Agents
  [Permission.AgentsRead]: 'View Agents',
  [Permission.AgentsWrite]: 'Manage Agents',
  [Permission.AgentsDelete]: 'Delete Agents',
  [Permission.CommandsRead]: 'View Commands',
  [Permission.CommandsWrite]: 'Send Commands',
  [Permission.CommandsDelete]: 'Delete Commands',

  // Team
  [Permission.TeamRead]: 'View Team Settings',
  [Permission.TeamUpdate]: 'Update Team Settings',
  [Permission.TeamDelete]: 'Delete Team',
  [Permission.MembersRead]: 'View Members',
  [Permission.MembersInvite]: 'Invite Members',
  [Permission.MembersWrite]: 'Manage Members',
  [Permission.GroupsRead]: 'View Groups',
  [Permission.GroupsWrite]: 'Manage Groups',
  [Permission.GroupsDelete]: 'Delete Groups',
  [Permission.GroupsMembers]: 'Manage Group Members',
  [Permission.GroupsAssets]: 'Manage Group Assets',
  [Permission.RolesRead]: 'View Roles',
  [Permission.RolesWrite]: 'Manage Roles',
  [Permission.RolesDelete]: 'Delete Roles',
  [Permission.RolesAssign]: 'Assign Roles',
  [Permission.PermissionSetsRead]: 'View Permission Sets',
  [Permission.PermissionSetsWrite]: 'Manage Permission Sets',
  [Permission.PermissionSetsDelete]: 'Delete Permission Sets',
  [Permission.AssignmentRulesRead]: 'View Assignment Rules',
  [Permission.AssignmentRulesWrite]: 'Manage Assignment Rules',
  [Permission.AssignmentRulesDelete]: 'Delete Assignment Rules',

  // Integrations
  [Permission.IntegrationsRead]: 'View Integrations',
  [Permission.IntegrationsManage]: 'Manage Integrations',
  [Permission.ScmConnectionsRead]: 'View SCM Connections',
  [Permission.ScmConnectionsWrite]: 'Manage SCM Connections',
  [Permission.ScmConnectionsDelete]: 'Delete SCM Connections',
  [Permission.NotificationsRead]: 'View Notifications',
  [Permission.NotificationsWrite]: 'Manage Notifications',
  [Permission.NotificationsDelete]: 'Delete Notifications',
  [Permission.WebhooksRead]: 'View Webhooks',
  [Permission.WebhooksWrite]: 'Manage Webhooks',
  [Permission.WebhooksDelete]: 'Delete Webhooks',
  [Permission.ApiKeysRead]: 'View API Keys',
  [Permission.ApiKeysWrite]: 'Manage API Keys',
  [Permission.ApiKeysDelete]: 'Delete API Keys',
  [Permission.PipelinesRead]: 'View Pipelines',
  [Permission.PipelinesWrite]: 'Manage Pipelines',
  [Permission.PipelinesDelete]: 'Delete Pipelines',
  [Permission.PipelinesExecute]: 'Execute Pipelines',

  // Settings
  [Permission.BillingRead]: 'View Billing',
  [Permission.BillingWrite]: 'Manage Billing',
  [Permission.SLARead]: 'View SLA',
  [Permission.SLAWrite]: 'Manage SLA',
  [Permission.SLADelete]: 'Delete SLA',

  // Attack Surface
  [Permission.ScopeRead]: 'View Scope',
  [Permission.ScopeWrite]: 'Manage Scope',
  [Permission.ScopeDelete]: 'Delete Scope',

  // Validation
  [Permission.ValidationRead]: 'View Validation',
  [Permission.ValidationWrite]: 'Manage Validation',

  // Reports
  [Permission.ReportsRead]: 'View Reports',
  [Permission.ReportsWrite]: 'Create Reports',

  // Note: Legacy aliases (MembersManage, BillingManage, etc.) map to
  // the same permission IDs as their canonical counterparts, so their
  // labels are inherited automatically.
}

/**
 * Get human-readable label for a permission
 * Falls back to formatted permission string if no label defined
 */
export function getPermissionLabel(permission: string): string {
  const label = PermissionLabels[permission as PermissionString]
  if (label) return label

  // Fallback: format permission string (e.g., "assets:write" -> "Assets Write")
  return permission
    .split(':')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Role to Permissions mapping
 * Maps each role to its default permissions.
 * This mirrors the backend role_mapping.go to enable client-side permission derivation.
 */
export const RolePermissions: Record<RoleString, PermissionString[]> = {
  [Role.Owner]: [
    // Full resource access
    Permission.AssetsRead,
    Permission.AssetsWrite,
    Permission.AssetsDelete,
    Permission.ProjectsRead,
    Permission.ProjectsWrite,
    Permission.ProjectsDelete,
    Permission.ComponentsRead,
    Permission.ComponentsWrite,
    Permission.ComponentsDelete,
    Permission.FindingsRead,
    Permission.FindingsWrite,
    Permission.FindingsDelete,
    Permission.VulnerabilitiesRead,
    Permission.DashboardRead,
    // Asset Groups
    Permission.AssetGroupsRead,
    Permission.AssetGroupsWrite,
    Permission.AssetGroupsDelete,
    // Audit logs
    Permission.AuditRead,
    // Scans
    Permission.ScansRead,
    Permission.ScansWrite,
    Permission.ScansDelete,
    // Scan Profiles
    Permission.ScanProfilesRead,
    Permission.ScanProfilesWrite,
    Permission.ScanProfilesDelete,
    // Tool Registry
    Permission.ToolsRead,
    Permission.ToolsWrite,
    Permission.ToolsDelete,
    Permission.TenantToolsRead,
    Permission.TenantToolsWrite,
    Permission.TenantToolsDelete,
    // Scanner Templates
    Permission.ScannerTemplatesRead,
    Permission.ScannerTemplatesWrite,
    Permission.ScannerTemplatesDelete,
    // Template Sources
    Permission.TemplateSourcesRead,
    Permission.TemplateSourcesWrite,
    Permission.TemplateSourcesDelete,
    // Secret Store
    Permission.SecretStoreRead,
    Permission.SecretStoreWrite,
    Permission.SecretStoreDelete,
    // Credentials
    Permission.CredentialsRead,
    Permission.CredentialsWrite,
    // Reports
    Permission.ReportsRead,
    Permission.ReportsWrite,
    // Pentest
    Permission.PentestRead,
    Permission.PentestWrite,
    // Remediation
    Permission.RemediationRead,
    Permission.RemediationWrite,
    // Workflows
    Permission.WorkflowsRead,
    Permission.WorkflowsWrite,
    // Full team management
    Permission.MembersRead,
    Permission.MembersInvite,
    Permission.MembersManage,
    Permission.TeamRead,
    Permission.TeamUpdate,
    Permission.TeamDelete,
    // Billing
    Permission.BillingRead,
    Permission.BillingManage,
    // Integrations
    Permission.IntegrationsRead,
    Permission.IntegrationsManage,
    // Access Control - Groups
    Permission.GroupsRead,
    Permission.GroupsWrite,
    Permission.GroupsDelete,
    Permission.GroupsMembers,
    Permission.GroupsPermissions,
    // Access Control - Permission Sets
    Permission.PermissionSetsRead,
    Permission.PermissionSetsWrite,
    Permission.PermissionSetsDelete,
    // Access Control - Roles
    Permission.RolesRead,
    Permission.RolesWrite,
    Permission.RolesDelete,
    Permission.RolesAssign,
    // Access Control - Assignment Rules
    Permission.AssignmentRulesRead,
    Permission.AssignmentRulesWrite,
    Permission.AssignmentRulesDelete,
    // Agents
    Permission.AgentsRead,
    Permission.AgentsWrite,
    Permission.AgentsDelete,
    // SCM Connections
    Permission.ScmConnectionsRead,
    Permission.ScmConnectionsWrite,
    Permission.ScmConnectionsDelete,
    // Sources
    Permission.SourcesRead,
    Permission.SourcesWrite,
    Permission.SourcesDelete,
    // Commands
    Permission.CommandsRead,
    Permission.CommandsWrite,
    Permission.CommandsDelete,
    // Pipelines
    Permission.PipelinesRead,
    Permission.PipelinesWrite,
    Permission.PipelinesDelete,
  ],

  [Role.Admin]: [
    // Full resource access
    Permission.AssetsRead,
    Permission.AssetsWrite,
    Permission.AssetsDelete,
    Permission.ProjectsRead,
    Permission.ProjectsWrite,
    Permission.ProjectsDelete,
    Permission.ComponentsRead,
    Permission.ComponentsWrite,
    Permission.ComponentsDelete,
    Permission.FindingsRead,
    Permission.FindingsWrite,
    Permission.FindingsDelete,
    Permission.VulnerabilitiesRead,
    Permission.DashboardRead,
    // Asset Groups
    Permission.AssetGroupsRead,
    Permission.AssetGroupsWrite,
    Permission.AssetGroupsDelete,
    // Audit logs
    Permission.AuditRead,
    // Scans
    Permission.ScansRead,
    Permission.ScansWrite,
    Permission.ScansDelete,
    // Scan Profiles
    Permission.ScanProfilesRead,
    Permission.ScanProfilesWrite,
    Permission.ScanProfilesDelete,
    // Tool Registry (admin can manage tenant tools)
    Permission.ToolsRead,
    Permission.ToolsWrite,
    Permission.ToolsDelete,
    Permission.TenantToolsRead,
    Permission.TenantToolsWrite,
    Permission.TenantToolsDelete,
    // Scanner Templates
    Permission.ScannerTemplatesRead,
    Permission.ScannerTemplatesWrite,
    Permission.ScannerTemplatesDelete,
    // Template Sources
    Permission.TemplateSourcesRead,
    Permission.TemplateSourcesWrite,
    Permission.TemplateSourcesDelete,
    // Secret Store
    Permission.SecretStoreRead,
    Permission.SecretStoreWrite,
    Permission.SecretStoreDelete,
    // Credentials
    Permission.CredentialsRead,
    Permission.CredentialsWrite,
    // Reports
    Permission.ReportsRead,
    Permission.ReportsWrite,
    // Pentest
    Permission.PentestRead,
    Permission.PentestWrite,
    // Remediation
    Permission.RemediationRead,
    Permission.RemediationWrite,
    // Workflows
    Permission.WorkflowsRead,
    Permission.WorkflowsWrite,
    // Member management (can invite and manage, but not delete team)
    Permission.MembersRead,
    Permission.MembersInvite,
    Permission.MembersManage,
    Permission.TeamRead,
    Permission.TeamUpdate,
    // Billing read only
    Permission.BillingRead,
    // Integrations
    Permission.IntegrationsRead,
    Permission.IntegrationsManage,
    // Access Control - Groups (admin can manage)
    Permission.GroupsRead,
    Permission.GroupsWrite,
    Permission.GroupsDelete,
    Permission.GroupsMembers,
    Permission.GroupsPermissions,
    // Access Control - Permission Sets (admin can manage)
    Permission.PermissionSetsRead,
    Permission.PermissionSetsWrite,
    Permission.PermissionSetsDelete,
    // Access Control - Roles (admin can manage)
    Permission.RolesRead,
    Permission.RolesWrite,
    Permission.RolesDelete,
    Permission.RolesAssign,
    // Access Control - Assignment Rules (admin can manage)
    Permission.AssignmentRulesRead,
    Permission.AssignmentRulesWrite,
    Permission.AssignmentRulesDelete,
    // Agents
    Permission.AgentsRead,
    Permission.AgentsWrite,
    Permission.AgentsDelete,
    // SCM Connections
    Permission.ScmConnectionsRead,
    Permission.ScmConnectionsWrite,
    Permission.ScmConnectionsDelete,
    // Sources
    Permission.SourcesRead,
    Permission.SourcesWrite,
    Permission.SourcesDelete,
    // Commands
    Permission.CommandsRead,
    Permission.CommandsWrite,
    Permission.CommandsDelete,
    // Pipelines
    Permission.PipelinesRead,
    Permission.PipelinesWrite,
    Permission.PipelinesDelete,
  ],

  [Role.Member]: [
    // Read + Write (no delete)
    Permission.AssetsRead,
    Permission.AssetsWrite,
    Permission.ProjectsRead,
    Permission.ProjectsWrite,
    Permission.ComponentsRead,
    Permission.ComponentsWrite,
    Permission.FindingsRead,
    Permission.FindingsWrite,
    Permission.VulnerabilitiesRead,
    Permission.DashboardRead,
    // Asset Groups (read + write)
    Permission.AssetGroupsRead,
    Permission.AssetGroupsWrite,
    // Scans (read + write)
    Permission.ScansRead,
    Permission.ScansWrite,
    // Scan Profiles (read + write, no delete)
    Permission.ScanProfilesRead,
    Permission.ScanProfilesWrite,
    // Tool Registry (read + tenant config write)
    Permission.ToolsRead,
    Permission.TenantToolsRead,
    Permission.TenantToolsWrite,
    // Scanner Templates (read + write)
    Permission.ScannerTemplatesRead,
    Permission.ScannerTemplatesWrite,
    // Template Sources (read + write)
    Permission.TemplateSourcesRead,
    Permission.TemplateSourcesWrite,
    // Secret Store (read only for members)
    Permission.SecretStoreRead,
    // Credentials (read only)
    Permission.CredentialsRead,
    // Reports (read + write)
    Permission.ReportsRead,
    Permission.ReportsWrite,
    // Pentest (read + write)
    Permission.PentestRead,
    Permission.PentestWrite,
    // Remediation (read + write)
    Permission.RemediationRead,
    Permission.RemediationWrite,
    // Workflows (read only)
    Permission.WorkflowsRead,
    // Can view members but not manage
    Permission.MembersRead,
    Permission.TeamRead,
    // Integrations (read only)
    Permission.IntegrationsRead,
    // Access Control - Groups (read only for members)
    Permission.GroupsRead,
    // Access Control - Roles (read only for members)
    Permission.RolesRead,
    // Agents (read only)
    Permission.AgentsRead,
    // SCM Connections (read only)
    Permission.ScmConnectionsRead,
    // Sources (read + write)
    Permission.SourcesRead,
    Permission.SourcesWrite,
    // Commands (read + write)
    Permission.CommandsRead,
    Permission.CommandsWrite,
    // Pipelines (read only)
    Permission.PipelinesRead,
  ],

  [Role.Viewer]: [
    // Read-only access
    Permission.AssetsRead,
    Permission.ProjectsRead,
    Permission.ComponentsRead,
    Permission.FindingsRead,
    Permission.VulnerabilitiesRead,
    Permission.DashboardRead,
    // Asset Groups (read only)
    Permission.AssetGroupsRead,
    // Scans (read only)
    Permission.ScansRead,
    // Scan Profiles (read only)
    Permission.ScanProfilesRead,
    // Tool Registry (read only)
    Permission.ToolsRead,
    Permission.TenantToolsRead,
    // Scanner Templates (read only)
    Permission.ScannerTemplatesRead,
    // Template Sources (read only)
    Permission.TemplateSourcesRead,
    // Secret Store (read only)
    Permission.SecretStoreRead,
    // Credentials (read only)
    Permission.CredentialsRead,
    // Reports (read only)
    Permission.ReportsRead,
    // Pentest (read only)
    Permission.PentestRead,
    // Remediation (read only)
    Permission.RemediationRead,
    // Workflows (read only)
    Permission.WorkflowsRead,
    // Can view team info
    Permission.MembersRead,
    Permission.TeamRead,
    // Integrations (read only)
    Permission.IntegrationsRead,
    // Access Control - Groups (read only)
    Permission.GroupsRead,
    // Access Control - Roles (read only)
    Permission.RolesRead,
    // Agents (read only)
    Permission.AgentsRead,
    // Sources (read only)
    Permission.SourcesRead,
    // Commands (read only)
    Permission.CommandsRead,
    // Pipelines (read only)
    Permission.PipelinesRead,
  ],
}

/**
 * Permission Set Types for Access Control
 *
 * Permission sets are reusable collections of permissions that can be
 * assigned to groups. They define what actions users can perform.
 */

/**
 * Permission set type classification
 */
export type PermissionSetType = 'system' | 'custom';

/**
 * Permission set entity
 */
export interface PermissionSet {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string;
  set_type: PermissionSetType;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Computed fields
  permission_count?: number;
  group_count?: number;
  permissions?: string[];
}

/**
 * Permission item within a permission set
 */
export interface PermissionItem {
  id: string;
  permission_set_id: string;
  permission: string;
  created_at: string;
}

/**
 * Permission set with full details including items
 */
export interface PermissionSetWithDetails extends PermissionSet {
  items: PermissionItem[];
  groups?: {
    id: string;
    name: string;
    type: string;
  }[];
}

/**
 * Input types for API operations
 */
export interface CreatePermissionSetInput {
  slug: string;
  name: string;
  description?: string;
  set_type: PermissionSetType;
  permissions?: string[];
}

export interface UpdatePermissionSetInput {
  slug?: string;
  name?: string;
  description?: string;
  set_type?: PermissionSetType;
}

export interface AddPermissionInput {
  permission: string;
}

/**
 * Filter options for listing permission sets
 */
export interface PermissionSetFilters {
  is_system?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Permission category for grouping in UI
 */
export interface PermissionCategory {
  name: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

/**
 * All permissions organized by category for UI display
 */
export const PermissionCategories: PermissionCategory[] = [
  {
    name: 'Assets',
    description: 'Asset management permissions',
    permissions: [
      { key: 'assets:read', label: 'View Assets', description: 'View asset inventory' },
      { key: 'assets:write', label: 'Manage Assets', description: 'Create and update assets' },
      { key: 'assets:delete', label: 'Delete Assets', description: 'Delete assets from inventory' },
    ],
  },
  {
    name: 'Findings',
    description: 'Security findings and vulnerabilities',
    permissions: [
      { key: 'findings:read', label: 'View Findings', description: 'View security findings' },
      { key: 'findings:write', label: 'Manage Findings', description: 'Update finding status and details' },
      { key: 'findings:delete', label: 'Delete Findings', description: 'Delete findings' },
    ],
  },
  {
    name: 'Scans',
    description: 'Security scanning operations',
    permissions: [
      { key: 'scans:read', label: 'View Scans', description: 'View scan configurations and results' },
      { key: 'scans:write', label: 'Manage Scans', description: 'Create and run scans' },
      { key: 'scans:delete', label: 'Delete Scans', description: 'Delete scan configurations' },
    ],
  },
  {
    name: 'Components',
    description: 'Software components (SBOM)',
    permissions: [
      { key: 'components:read', label: 'View Components', description: 'View software components' },
      { key: 'components:write', label: 'Manage Components', description: 'Update component information' },
      { key: 'components:delete', label: 'Delete Components', description: 'Delete components' },
    ],
  },
  {
    name: 'Credentials',
    description: 'Credential leak monitoring',
    permissions: [
      { key: 'credentials:read', label: 'View Credentials', description: 'View credential leaks' },
      { key: 'credentials:write', label: 'Manage Credentials', description: 'Update credential status' },
    ],
  },
  {
    name: 'Reports',
    description: 'Reporting and analytics',
    permissions: [
      { key: 'reports:read', label: 'View Reports', description: 'View security reports' },
      { key: 'reports:write', label: 'Generate Reports', description: 'Create and export reports' },
    ],
  },
  {
    name: 'Pentest',
    description: 'Penetration testing',
    permissions: [
      { key: 'pentest:read', label: 'View Pentest', description: 'View pentest campaigns and findings' },
      { key: 'pentest:write', label: 'Manage Pentest', description: 'Create campaigns and update findings' },
    ],
  },
  {
    name: 'Remediation',
    description: 'Remediation tracking',
    permissions: [
      { key: 'remediation:read', label: 'View Remediation', description: 'View remediation tasks' },
      { key: 'remediation:write', label: 'Manage Remediation', description: 'Create and update tasks' },
    ],
  },
  {
    name: 'Workflows',
    description: 'Automation workflows',
    permissions: [
      { key: 'workflows:read', label: 'View Workflows', description: 'View automation workflows' },
      { key: 'workflows:write', label: 'Manage Workflows', description: 'Create and edit workflows' },
    ],
  },
  {
    name: 'Team Management',
    description: 'User and team administration',
    permissions: [
      { key: 'members:read', label: 'View Members', description: 'View team members' },
      { key: 'members:invite', label: 'Invite Members', description: 'Invite new team members' },
      { key: 'members:manage', label: 'Manage Members', description: 'Update member roles and remove members' },
      { key: 'team:read', label: 'View Team Settings', description: 'View organization settings' },
      { key: 'team:update', label: 'Update Team Settings', description: 'Modify organization settings' },
      { key: 'team:delete', label: 'Delete Team', description: 'Delete the organization' },
    ],
  },
  {
    name: 'Access Control',
    description: 'Groups and permissions management',
    permissions: [
      { key: 'groups:read', label: 'View Groups', description: 'View access control groups' },
      { key: 'groups:write', label: 'Manage Groups', description: 'Create and update groups' },
      { key: 'groups:delete', label: 'Delete Groups', description: 'Delete groups' },
      { key: 'groups:members', label: 'Manage Group Members', description: 'Add and remove group members' },
      { key: 'groups:permissions', label: 'Manage Group Permissions', description: 'Assign permission sets to groups' },
      { key: 'permission-sets:read', label: 'View Permission Sets', description: 'View permission sets' },
      { key: 'permission-sets:write', label: 'Manage Permission Sets', description: 'Create and update permission sets' },
      { key: 'permission-sets:delete', label: 'Delete Permission Sets', description: 'Delete custom permission sets' },
    ],
  },
  {
    name: 'Integrations',
    description: 'External integrations',
    permissions: [
      { key: 'integrations:read', label: 'View Integrations', description: 'View integration configurations' },
      { key: 'integrations:manage', label: 'Manage Integrations', description: 'Configure integrations' },
    ],
  },
  {
    name: 'Audit',
    description: 'Audit and compliance',
    permissions: [
      { key: 'audit:read', label: 'View Audit Logs', description: 'View audit trail and activity logs' },
    ],
  },
  {
    name: 'Billing',
    description: 'Subscription and billing',
    permissions: [
      { key: 'billing:read', label: 'View Billing', description: 'View billing information' },
      { key: 'billing:manage', label: 'Manage Billing', description: 'Update payment and subscription' },
    ],
  },
];

/**
 * Get all permission keys as a flat array
 */
export function getAllPermissionKeys(): string[] {
  return PermissionCategories.flatMap(cat => cat.permissions.map(p => p.key));
}

/**
 * Get permission info by key
 */
export function getPermissionInfo(key: string): { label: string; description: string; category: string } | null {
  for (const category of PermissionCategories) {
    const permission = category.permissions.find(p => p.key === key);
    if (permission) {
      return {
        label: permission.label,
        description: permission.description,
        category: category.name,
      };
    }
  }
  return null;
}

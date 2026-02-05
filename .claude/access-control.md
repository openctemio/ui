# Access Control Architecture

> Comprehensive guide to the 3-layer access control system in Rediver.io

## Overview

Rediver.io implements a **3-layer access control** architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: LICENSING (Tenant)                   │
├─────────────────────────────────────────────────────────────────┤
│  Tenant → Plan → Modules                                        │
│  "What modules can this tenant access?"                         │
│  Determined by: Subscription plan (Free, Pro, Business, etc.)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 2: RBAC (User)                          │
├─────────────────────────────────────────────────────────────────┤
│  User → Roles → Permissions                                      │
│  "What can this user do within allowed modules?"                 │
│  Note: Can only use permissions from modules tenant has          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: DATA SCOPE (Groups)                  │
├─────────────────────────────────────────────────────────────────┤
│  User → Groups → Assets/Data                                     │
│  "What data can this user see?"                                  │
│  Determined by: Group membership and asset ownership             │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Licensing (Module Access)

### Hook: useTenantModules

```typescript
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules';

const { moduleIds, modules, eventTypes, isLoading } = useTenantModules();

// Check if tenant has a module
const hasFindings = moduleIds.includes('findings');

// Available event types for notifications (filtered by modules)
// e.g., ['new_finding', 'scan_completed'] based on tenant's plan
```

### Available Plans

| Plan | Modules |
|------|---------|
| Free | Core (dashboard, assets, team) |
| Pro | Core + Security (findings, scans) |
| Business | Core + Security + Platform + Compliance |
| Enterprise | All modules |

## Layer 2: RBAC (Feature Permissions)

## Core Concepts

### 1. Membership (Organization Level)

Determines user's organizational status within a tenant.

| Level | isAdmin JWT | Permissions in JWT | Description |
|-------|-------------|-------------------|-------------|
| **Owner** | ✅ true | nil | Full access including owner-only operations. Cannot be removed. |
| **Admin** | ✅ true | nil | Almost full access. Cannot do owner-only operations. |
| **Member** | ❌ false | ~42 permissions | Standard read/write access. Permissions from RBAC roles. |
| **Viewer** | ❌ false | ~25 permissions | Read-only access. Permissions from RBAC roles. |

**Key Points:**
- **Owner** has ALL permissions - bypass all permission checks
- **Admin** has almost all permissions - bypass general permission checks, but NOT owner-only operations
- **Member/Viewer** - permissions checked from JWT (included in token)
- All invited users start as "member" with permissions from assigned RBAC roles

**Owner-only Operations** (Admin cannot do):
| Permission | Description |
|------------|-------------|
| `TeamDelete` | Delete the tenant |
| `BillingManage` | Manage billing settings |
| `GroupsDelete` | Delete access control groups |
| `PermissionSetsDelete` | Delete permission sets |
| `AssignmentRulesDelete` | Delete assignment rules |

### 2. RBAC Roles (Layer 2 - Feature Permissions)

Define what actions users can perform. Users can have multiple roles.
**This is the ONLY source of permissions** (except Owner who has full access).

**System Roles (predefined):**
- `Administrator` (115 permissions) - Full administrative access
- `Member` (49 permissions) - Standard read/write access
- `Viewer` (38 permissions) - Read-only access

**Custom Roles:**
- Created by tenant admins
- Can have any combination of permissions
- Examples: "Security Analyst", "Developer", "Compliance Officer"

**Permission Resolution:**
```
User's Effective Permissions = Union of all assigned Role permissions

Owner Exception: Owners have ALL permissions regardless of roles
```

**Invitation Flow (Simplified):**
```
Admin invites user@example.com
    ↓
Select RBAC roles only (Administrator, Member, Viewer, Custom...)
    ↓
User accepts invitation
    ↓
User becomes "member" automatically
    ↓
Selected RBAC roles are assigned
    ↓
User's permissions = Union of selected role permissions
```

**Note:** There is NO membership level selection in the invite UI. All invited users are "member". Permissions are determined entirely by RBAC roles.

### 3. Groups (Layer 3 - Data Scope)

Organize users and control access to **data** (assets, findings).

**Group Types:**
| Type | Purpose |
|------|---------|
| `security_team` | SOC, AppSec, Pentest teams |
| `asset_owner` | Teams owning specific assets |
| `team` | Development teams |
| `department` | Organizational departments |
| `project` | Project-specific access |
| `external` | Vendors, contractors |
| `custom` | Other use cases |

**Group Features:**
- **Members**: Users in the group (with role: admin, member)
- **Assets**: Assets owned by the group (primary, shared ownership)
- **Data Scope**: Members can only see data related to group's assets

## Permission Naming Convention

Permissions follow a hierarchical naming pattern:

```
{module}:{subfeature}:{action}
```

Examples:
- `integrations:scm:read` - View SCM connections
- `assets:groups:write` - Manage asset groups
- `team:roles:assign` - Assign roles to users

For simpler permissions:
```
{module}:{action}
```

Examples:
- `dashboard:read`, `assets:read`, `findings:write`

## Permission Categories

The system has 150+ granular permissions organized in modules:

| Module | Permissions | Description |
|--------|-------------|-------------|
| **Assets** | `assets:read`, `assets:groups:write`, `assets:repositories:read` | Asset management |
| **Findings** | `findings:read`, `findings:vulnerabilities:write`, `findings:remediation:read` | Vulnerability management |
| **Scans** | `scans:read`, `scans:profiles:write`, `scans:execute` | Security scanning |
| **Team** | `team:read`, `team:members:invite`, `team:groups:members` | Team management |
| **Integrations** | `integrations:scm:read`, `integrations:notifications:write` | External integrations |
| **Settings** | `settings:billing:read`, `settings:sla:write` | Tenant settings |
| **Reports** | `reports:read`, `reports:write` | Reporting |
| **Agents** | `agents:read`, `agents:commands:write` | Agent management |
| **Audit** | `audit:read` | Audit log access |
| **Settings** | `settings:read`, `settings:write` | Tenant settings |

## Data Flow

### Permission Check Flow

```
API Request
    ↓
JWT Token → Extract user_id, tenant_id
    ↓
Fetch User's Roles → Get all permissions
    ↓
Check: Does user have required permission?
    ↓
If feature access granted:
    ↓
Fetch User's Groups → Get accessible assets
    ↓
Filter data by group's asset scope
    ↓
Return filtered data
```

### Example Scenario

```
User: Security Analyst Alice

Roles: [Security Analyst]
  └── Permissions: findings:read, findings:write, scans:read, reports:create

Groups: [Security Team, Project Alpha]
  └── Assets: [webapp-1, api-server, database-1]

When Alice requests GET /findings:
1. Check: Alice has "findings:read" permission ✓
2. Filter: Return only findings for webapp-1, api-server, database-1
```

## API Endpoints

### Roles API

```
GET    /api/v1/roles                    # List all roles
POST   /api/v1/roles                    # Create custom role
GET    /api/v1/roles/{id}               # Get role details
PUT    /api/v1/roles/{id}               # Update role
DELETE /api/v1/roles/{id}               # Delete custom role

GET    /api/v1/users/{id}/roles         # Get user's roles
PUT    /api/v1/users/{id}/roles         # Set user's roles (replace all)
POST   /api/v1/users/{id}/roles         # Assign role to user
DELETE /api/v1/users/{id}/roles/{roleId} # Remove role from user
```

### Groups API

```
GET    /api/v1/groups                   # List groups
POST   /api/v1/groups                   # Create group
GET    /api/v1/groups/{id}              # Get group details
PUT    /api/v1/groups/{id}              # Update group
DELETE /api/v1/groups/{id}              # Delete group

GET    /api/v1/groups/{id}/members      # List group members
POST   /api/v1/groups/{id}/members      # Add member
DELETE /api/v1/groups/{id}/members/{userId} # Remove member

GET    /api/v1/groups/{id}/assets       # List group assets
POST   /api/v1/groups/{id}/assets       # Assign asset
DELETE /api/v1/groups/{id}/assets/{assetId} # Unassign asset
```

### Permission Query API

```
GET    /api/v1/permissions              # List all available permissions
GET    /api/v1/permissions/modules      # List permission modules
GET    /api/v1/me/permissions           # Get current user's effective permissions
GET    /api/v1/me/groups                # Get current user's groups
GET    /api/v1/me/assets                # Get current user's accessible assets
```

## Frontend Integration

### Permission Storage (JWT-based)

Permissions are handled differently based on role to keep JWT under 4KB browser cookie limit:

| Role | JWT Size | Permission Source |
|------|----------|-------------------|
| Owner/Admin | ~500B | Bypass all checks (isAdmin=true in JWT) |
| Member | ~1.5KB | Permissions array in JWT (~42 permissions) |
| Viewer | ~1KB | Permissions array in JWT (~25 permissions) |

**Flow:**
```
Login → Token Exchange → JWT contains:
    - isAdmin: true (for owner/admin) OR
    - permissions: [...] (for member/viewer)
    → Client extracts from JWT via auth store
```

**Note:** The `app_permissions` cookie is no longer used. Permissions come directly from JWT.

### Hooks

```typescript
// ============================================
// PERMISSION CHECKING (from JWT)
// ============================================
import { usePermissions, Permission, Can } from '@/lib/permissions';

const { can, canAny, canAll, permissions, isOwner, isAdmin } = usePermissions();

// Single permission check (Owner/Admin bypass automatically)
if (can(Permission.AssetsWrite)) {
  // Show edit button
}

// Any of multiple permissions
if (canAny(Permission.FindingsRead, Permission.DashboardRead)) {
  // Show stats
}

// All permissions required
if (canAll(Permission.AssetsWrite, Permission.AssetsDelete)) {
  // Show bulk actions
}

// ============================================
// OWNER-ONLY CHECKS (for sensitive operations)
// ============================================

// Check if user is owner (for owner-only operations)
if (isOwner()) {
  // Show delete tenant button, billing management, etc.
}

// Check if user is admin or higher
if (isAdmin()) {
  // Show admin panel
}

// ============================================
// RBAC MANAGEMENT (Admin features)
// ============================================
import { useRoles, useUserRoles, useSetUserRoles } from '@/features/access-control';

const { roles } = useRoles();                    // All roles
const { roles: userRoles } = useUserRoles(userId); // User's assigned roles
const { setUserRoles } = useSetUserRoles(userId);  // Assign roles to user

// Groups
import { useGroups, useGroupMembers, useGroupAssets } from '@/features/access-control';

const { groups } = useGroups();
const { members } = useGroupMembers(groupId);
const { assets } = useGroupAssets(groupId);
```

### Permission-Gated API Hooks

All API hooks automatically check permissions before fetching:

```typescript
// Example: Assets hook with permission check
export function useAssets(tenantId: string | null, filters?: AssetSearchFilters) {
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = tenantId && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<AssetListResponse>(
    shouldFetch ? ['assets', tenantId, filters] : null,  // null key = no fetch
    () => get<AssetListResponse>(assetEndpoints.list(filters)),
    { revalidateOnFocus: false }
  )

  return {
    assets: data?.data || [],
    isLoading: shouldFetch ? isLoading : false,  // Not loading if no permission
    error,
    mutate,
  }
}
```

**Hooks with permission checks:**

| Hook | Required Permission |
|------|---------------------|
| `useAssets`, `useAssetStats` | `assets:read` |
| `useFindings`, `useFindingStats` | `findings:read` |
| `useExposures`, `useExposureStats` | `findings:read` |
| `useComponents`, `useComponentStats` | `assets:components:read` |
| `useAssetGroups`, `useGroupAssets` | `assets:groups:read` |
| `useThreatIntelStats`, `useKEVStats` | `findings:vulnerabilities:read` |
| `useDashboardStats` | `dashboard:read` |
| `useMembers`, `useMemberStats` | `team:members:read` |
| `useTenantSettings` | `team:read` |
| `useRepositories` | `assets:repositories:read` |
| `useSCMConnections` | `integrations:scm:read` |

### Permission Guard Components

Two approaches for permission-based UI:

**1. Can Component (from lib/permissions) - RECOMMENDED**

```tsx
import { Can, Permission } from '@/lib/permissions';

// Hide mode (default) - completely hides if no permission
<Can permission={Permission.AssetsWrite}>
  <Button>Edit Asset</Button>
</Can>

// Disable mode - shows disabled button with tooltip
// IMPORTANT: Disabled Links/buttons are blocked from navigation
<Can permission={Permission.AssetsDelete} mode="disable">
  <Button>Delete Asset</Button>
</Can>

// With Link - disabled Links will NOT navigate
<Can permission={Permission.ScansWrite} mode="disable" disabledTooltip="No permission to create scans">
  <Button asChild>
    <Link href="/scans/new">New Scan</Link>
  </Button>
</Can>

// Custom tooltip message
<Can permission="billing:manage" mode="disable" disabledTooltip="Contact admin for access">
  <Button>Manage Billing</Button>
</Can>

// Multiple permissions (any)
<Can permission={['assets:write', 'projects:write']}>
  <Button>Edit</Button>
</Can>
```

**Disable Mode Behavior:**
- Adds `disabled`, `aria-disabled="true"` attributes to children
- Wraps in a div that blocks `onClick` and `onMouseDown` events
- Shows tooltip explaining why the action is disabled
- **Links inside disabled buttons will NOT navigate** (click events are prevented)

**2. PermissionGate Component (from features/auth)**

```tsx
import { PermissionGate } from '@/features/auth/components/permission-gate';

// Hide mode with fallback
<PermissionGate permission="findings:write">
  <Button>Edit Finding</Button>
</PermissionGate>

// Disable mode
<PermissionGate permission="reports:export" mode="disable">
  <ExportButton />
</PermissionGate>

// With admin override disabled (default: true)
<PermissionGate permission="billing:manage" adminOverride={false} mode="disable">
  <Button>Billing</Button>
</PermissionGate>
```

**Mode Selection Guide:**

| Use Case | Mode | Example |
|----------|------|---------|
| Navigation/Menu items | `hide` (default) | Sidebar links |
| Action buttons with Links | `disable` | Quick action buttons (New Scan, View Reports) |
| Destructive actions | `disable` | Delete, Remove buttons |
| Critical features | `disable` with custom tooltip | Billing, Admin settings |
| Dropdown menu items | `hide` | Context menu actions |

### Sidebar Permission Filtering

Sidebar menu items are automatically filtered based on user permissions:

```typescript
// sidebar-data.ts
{
  title: "Asset Groups",
  url: "/asset-groups",
  icon: FolderKanban,
  permission: Permission.AssetGroupsRead,  // Item hidden if no permission
},
```

**Filtering Logic:**
```typescript
// In sidebar component
const filteredItems = items.filter(item => {
  if (!item.permission) return true  // No permission = always show
  return can(item.permission)         // Check permission
})
```

## Best Practices

### 1. Role Design

- **Keep roles focused**: Each role should represent a job function
- **Don't over-permission**: Start with minimal permissions, add as needed
- **Use descriptive names**: "Security Analyst" not "Role 1"

### 2. Group Organization

- **Map to org structure**: Teams, departments, projects
- **Asset ownership**: Assign assets to groups that own them
- **Avoid overlapping scope**: Clear boundaries between groups

### 3. Permission Assignment

```
DO:
- Assign roles based on job function
- Use groups for data scoping
- Review permissions quarterly

DON'T:
- Give everyone admin role
- Create roles with all permissions
- Ignore the principle of least privilege
```

## Migration from Legacy System

If migrating from a simpler permission system:

1. **Audit existing permissions**: Document current user access
2. **Design role structure**: Map job functions to roles
3. **Create groups**: Organize users by team/project
4. **Assign roles**: Give users appropriate roles
5. **Set data scope**: Assign assets to groups
6. **Test access**: Verify users can access what they need

## Troubleshooting

### User can't access a feature

1. Check user's roles: Do they have the required permission?
2. Check the permission name: Is it spelled correctly?
3. Check role assignment: Is the role properly assigned?

### User can't see certain data

1. Check user's groups: Are they in a group with access?
2. Check asset assignment: Is the asset assigned to the group?
3. Check ownership type: Primary vs shared ownership

### Permission changes not taking effect

1. User may need to re-login (JWT refresh)
2. Check if role was saved successfully
3. Clear browser cache

## Database Schema

```sql
-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    tenant_id UUID,           -- NULL for system roles
    slug VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    is_system BOOLEAN,
    hierarchy_level INT,
    has_full_data_access BOOLEAN
);

-- Role Permissions
CREATE TABLE role_permissions (
    role_id UUID,
    permission_id VARCHAR(100),
    PRIMARY KEY (role_id, permission_id)
);

-- User Roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID,
    tenant_id UUID,
    role_id UUID,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID,
    UNIQUE (user_id, tenant_id, role_id)
);

-- Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    name VARCHAR(100),
    slug VARCHAR(100),
    group_type VARCHAR(50),
    description TEXT,
    is_active BOOLEAN
);

-- Group Members
CREATE TABLE group_members (
    group_id UUID,
    user_id UUID,
    role VARCHAR(50),      -- admin, member
    joined_at TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

-- Asset Owners (Group → Asset relationship)
CREATE TABLE asset_owners (
    id UUID PRIMARY KEY,
    group_id UUID,
    asset_id UUID,
    ownership_type VARCHAR(20),  -- primary, shared
    assigned_at TIMESTAMPTZ
);
```

## Security Considerations

1. **JWT Token Security**: Tokens expire after 15 minutes
2. **Permission Caching**: Permissions are resolved on each request
3. **Audit Logging**: All permission changes are logged
4. **Role Hierarchy**: Lower hierarchy users cannot modify higher
5. **Data Isolation**: Groups provide tenant-level data isolation

---

**Last Updated**: 2026-01-22

# Access Control System

**Last Updated:** 2026-01-21

This document describes the group-based access control system for tenant administrators.

---

## Overview

The Access Control system provides a flexible, group-based permission management for multi-tenant environments. It allows tenant admins to:

1. **Create Groups** - Organize users into logical groups (Security Teams, Asset Owners, Custom)
2. **Assign Permission Sets** - Grant permissions to groups via reusable permission sets
3. **Manage Members** - Add/remove users from groups with specific roles (Admin/Member)

---

## Architecture

### Two-Layer Role Model

```
Tenant Level (tenant_members.role)
├── owner    → Full tenant control, billing, delete tenant
├── admin    → Manage members, settings, access control
├── member   → Standard access (determined by groups)
└── viewer   → Read-only access (determined by groups)

Group Level (group_members.role)
├── admin    → Can manage group members and settings
└── member   → Inherits group permissions only
```

### Data Model

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│     Groups      │────▶│   group_members      │◀────│      Users      │
│                 │     │ (user_id, role)      │     │                 │
└────────┬────────┘     └──────────────────────┘     └─────────────────┘
         │
         │ assigns
         ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ group_permission_sets   │────▶│    permission_sets      │
│ (group_id, ps_id)       │     │ (name, is_system)       │
└─────────────────────────┘     └───────────┬─────────────┘
                                            │
                                            │ contains
                                            ▼
                                ┌─────────────────────────┐
                                │ permission_set_items    │
                                │ (permission key)        │
                                └─────────────────────────┘
```

---

## Features

### Groups Management

**Route:** `/settings/access-control/groups`

Features:
- Create, edit, delete groups
- Three group types:
  - **Security Team** - Teams focused on security operations
  - **Asset Owner** - Groups that own and manage specific assets
  - **Custom** - Custom groups for specific use cases
- Member management with admin/member roles
- Permission set assignment
- Asset assignment (primary/shared ownership)

### Permission Sets Management

**Route:** `/settings/access-control/permission-sets`

Features:
- View system permission sets (read-only)
- Create custom permission sets
- Edit/delete custom permission sets
- Permission categories:
  - Assets (read, write, delete)
  - Findings (read, write, delete)
  - Scans (read, write, delete)
  - Components (read, write, delete)
  - Credentials (read, write)
  - Reports (read, write)
  - Pentest (read, write)
  - Remediation (read, write)
  - Workflows (read, write)
  - Team Management (members, team settings)
  - Access Control (groups, permission sets)
  - Integrations (read, manage)
  - Audit (read)
  - Billing (read, manage)

---

## API Endpoints

### Groups API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/groups` | List all groups |
| GET | `/api/v1/groups/me` | List groups for current user |
| GET | `/api/v1/groups/:id` | Get group details |
| POST | `/api/v1/groups` | Create group |
| PUT | `/api/v1/groups/:id` | Update group |
| DELETE | `/api/v1/groups/:id` | Delete group |
| GET | `/api/v1/groups/:id/members` | List group members |
| POST | `/api/v1/groups/:id/members` | Add member to group |
| PUT | `/api/v1/groups/:id/members/:userId` | Update member role |
| DELETE | `/api/v1/groups/:id/members/:userId` | Remove member |
| GET | `/api/v1/groups/:id/permission-sets` | List assigned permission sets |
| POST | `/api/v1/groups/:id/permission-sets` | Assign permission set |
| DELETE | `/api/v1/groups/:id/permission-sets/:psId` | Unassign permission set |
| GET | `/api/v1/groups/:id/assets` | List group assets |
| POST | `/api/v1/groups/:id/assets` | Assign asset |
| DELETE | `/api/v1/groups/:id/assets/:assetId` | Unassign asset |

### Permission Sets API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/permission-sets` | List all permission sets |
| GET | `/api/v1/permission-sets/system` | List system permission sets |
| GET | `/api/v1/permission-sets/:id` | Get permission set details |
| POST | `/api/v1/permission-sets` | Create custom permission set |
| PUT | `/api/v1/permission-sets/:id` | Update permission set |
| DELETE | `/api/v1/permission-sets/:id` | Delete permission set |
| POST | `/api/v1/permission-sets/:id/permissions` | Add permission |
| DELETE | `/api/v1/permission-sets/:id/permissions/:pId` | Remove permission |

---

## UI Components

### Feature Location

```
ui/src/features/access-control/
├── types/
│   ├── group.types.ts          # Group-related types
│   ├── permission-set.types.ts # Permission set types
│   └── index.ts
├── api/
│   ├── use-groups.ts           # Groups SWR hooks
│   ├── use-permission-sets.ts  # Permission sets SWR hooks
│   └── index.ts
├── components/
│   ├── group-detail-sheet.tsx          # Group detail/edit sheet
│   ├── permission-set-detail-sheet.tsx # Permission set detail sheet
│   └── index.ts
└── index.ts                    # Feature exports
```

### Pages Location

```
ui/src/app/(dashboard)/settings/access-control/
├── groups/
│   └── page.tsx                # Groups management page
└── permission-sets/
    └── page.tsx                # Permission sets management page
```

---

## Usage Examples

### Check Permission in Components

```tsx
import { Can, Permission, usePermissions } from "@/lib/permissions";

function MyComponent() {
  const { can } = usePermissions();

  // Conditional rendering
  return (
    <Can permission={Permission.AssetsWrite}>
      <Button>Create Asset</Button>
    </Can>
  );

  // Programmatic check
  if (can(Permission.AssetsDelete)) {
    // Show delete button
  }
}
```

### Using API Hooks

```tsx
import {
  useGroups,
  useCreateGroup,
  usePermissionSets
} from "@/features/access-control";

function GroupsPage() {
  const { groups, isLoading } = useGroups();
  const { createGroup, isCreating } = useCreateGroup();
  const { permissionSets } = usePermissionSets();

  const handleCreate = async () => {
    await createGroup({
      slug: "security-team",           // Required
      name: "Security Team",           // Required
      group_type: "security_team",     // Required
      description: "Main security operations team"
    });
  };
}
```

---

## Best Practices

1. **Use System Permission Sets** - Prefer system permission sets for common use cases
2. **Least Privilege** - Grant only necessary permissions
3. **Group Organization** - Use meaningful group types (security_team, asset_owner)
4. **Regular Audit** - Review group memberships and permissions regularly
5. **Permission Inheritance** - Users inherit permissions from all their groups

---

## Implementation Assessment

**Last Assessed:** 2026-01-21

### Overall Status: Implemented with Improvements Needed

The Access Control feature has a solid foundation with proper structure, type safety, and user experience. However, there are several areas that need improvement.

### Assessment Summary

| Category | Status | Issues |
|----------|--------|--------|
| Type Safety | Good | 3 minor issues |
| Error Handling | Needs Work | 3 issues (1 high) |
| Loading States | Good | 2 minor issues |
| User Experience | Good | 3 incomplete features |
| Code Quality | Good | 4 minor issues |

---

### Detailed Findings

#### 1. Type Safety & API Consistency

**Status:** Mostly Good

| Issue | Severity | File | Description |
|-------|----------|------|-------------|
| Dual-format types | Medium | `group.types.ts:48-58` | `GroupMember` supports both flattened (`user_name`) and nested (`user.name`) formats |
| Dual-format types | Medium | `group.types.ts:79-90` | `GroupPermissionSet` has same issue |
| Alias inconsistency | Low | `permission-set.types.ts:45-47` | `items` vs `permissions` alias could confuse |

**Recommendation:** Standardize on one format based on actual API response.

#### 2. Error Handling

**Status:** Needs Improvement

| Issue | Severity | File | Description |
|-------|----------|------|-------------|
| Batch permission errors | **High** | `permission-set-detail-sheet.tsx:138-141` | Loop adds permissions one-by-one without error aggregation |
| No error type distinction | Medium | Multiple components | All errors shown same way (validation vs network vs server) |
| Generic error messages | Medium | `group-detail-sheet.tsx` | Limited context in error messages |

**Recommendation:** Implement error aggregation for batch operations, add error type handling.

#### 3. Missing Functionality

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Bulk delete | Medium | Not implemented | Shows "not implemented yet" toast |
| Permission aggregation | Medium | Missing | No view showing combined permissions from multiple sets |
| Search in detail sheets | Low | Missing | Long lists not searchable |
| Audit trail | Low | Missing | No history of changes |
| Import/Export | Low | Missing | No CSV import for bulk member management |

#### 4. Code Quality Issues

| Issue | File | Description |
|-------|------|-------------|
| Code duplication | `groups/page.tsx` + `group-detail-sheet.tsx` | `getGroupType()` helper duplicated |
| Code duplication | Both pages | `generateSlug()` helper duplicated |
| Inline type assertions | `group-detail-sheet.tsx:451, 522` | Should use proper types |
| String-based cache matching | `groups/page.tsx:374` | Fragile pattern for SWR cache |

---

### Improvement Plan

#### Phase 1: Critical Fixes (High Priority)

- [ ] **Fix batch permission error handling**
  - File: `permission-set-detail-sheet.tsx`
  - Add error aggregation in `handleAddPermissions()`
  - Show which permissions failed vs succeeded

- [ ] **Extract shared utilities**
  - Create `ui/src/features/access-control/lib/utils.ts`
  - Move `getGroupType()`, `generateSlug()` to shared location
  - Update imports in pages and components

- [ ] **Implement bulk delete**
  - File: `groups/page.tsx`, `permission-sets/page.tsx`
  - Add confirmation dialog for bulk operations
  - Handle partial failures

#### Phase 2: Type & API Improvements (Medium Priority)

- [ ] **Consolidate type definitions**
  - Decide on flattened vs nested format
  - Update `GroupMember` and `GroupPermissionSet` types
  - Add type guards for runtime safety

- [ ] **Add permission aggregation view**
  - New component: `GroupPermissionsOverview`
  - Show union of all permissions from assigned sets
  - Highlight permission conflicts/overlaps

- [ ] **Improve error handling**
  - Create custom error types for validation vs network
  - Add error context to toast messages
  - Show field-level validation errors

#### Phase 3: Enhanced Features (Low Priority)

- [ ] **Add search to detail sheets**
  - Add search input for members list (>10 items)
  - Add search input for permissions list

- [ ] **Implement audit trail**
  - New tab: "Activity" in detail sheets
  - Show who changed what and when

- [ ] **Add import/export**
  - CSV export for group members
  - CSV import for bulk member addition

---

### API Field Requirements

**Groups API expects:**
```typescript
// POST /api/v1/groups
{
  slug: string;        // Required - auto-generated from name
  name: string;        // Required
  description?: string;
  group_type: 'security_team' | 'asset_owner' | 'custom';  // Required
}
```

**Permission Sets API expects:**
```typescript
// POST /api/v1/permission-sets
{
  slug: string;        // Required - auto-generated from name
  name: string;        // Required
  description?: string;
  set_type: 'system' | 'custom';  // Required - always 'custom' for user-created
  permissions?: string[];
}
```

---

### File Reference

**Types:**
- `ui/src/features/access-control/types/group.types.ts`
- `ui/src/features/access-control/types/permission-set.types.ts`

**API Hooks:**
- `ui/src/features/access-control/api/use-groups.ts`
- `ui/src/features/access-control/api/use-permission-sets.ts`

**Components:**
- `ui/src/features/access-control/components/group-detail-sheet.tsx`
- `ui/src/features/access-control/components/permission-set-detail-sheet.tsx`

**Pages:**
- `ui/src/app/(dashboard)/settings/access-control/groups/page.tsx`
- `ui/src/app/(dashboard)/settings/access-control/permission-sets/page.tsx`

---

## Related Documentation

- [Authentication](../features/auth/README.md) - Auth system overview
- [API Integration](../guides/API_INTEGRATION.md) - API client patterns
- [Architecture](../ARCHITECTURE.md) - System architecture

---

**Maintained by:** Platform Team

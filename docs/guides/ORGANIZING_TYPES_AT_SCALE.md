# Organizing Types at Scale

**Last Updated:** 2025-12-11
**For:** Large projects with 50+ types

---

## Table of Contents

- [Problem](#problem)
- [Solution: Domain-based Organization](#solution-domain-based-organization)
- [Recommended Structure](#recommended-structure)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Tooling](#tooling)

---

## Problem

**Current structure (small projects):**
```typescript
// src/lib/api/types.ts (1 file)
export interface User { ... }
export interface Post { ... }
export interface Product { ... }
export interface Order { ... }
export interface Category { ... }
// ... 50+ more types
// → File becomes 2000+ lines!
```

**Issues when scaling:**
- ❌ Hard to find specific type
- ❌ Merge conflicts frequently
- ❌ Slow IDE autocomplete
- ❌ Difficult to maintain
- ❌ Unclear ownership

---

## Solution: Domain-based Organization

**Organize by feature/domain instead of single file!**

```
src/lib/api/types/
├── index.ts              # Re-exports everything
├── common.ts             # Shared types (pagination, errors)
├── users/
│   ├── index.ts          # Re-exports user types
│   ├── user.types.ts     # User entity
│   └── auth.types.ts     # Auth-related types
├── products/
│   ├── index.ts
│   ├── product.types.ts
│   ├── category.types.ts
│   └── inventory.types.ts
├── orders/
│   ├── index.ts
│   ├── order.types.ts
│   └── payment.types.ts
└── posts/
    ├── index.ts
    ├── post.types.ts
    └── comment.types.ts
```

---

## Recommended Structure

### Level 1: Small Projects (<20 types)

**Keep single file:**
```
src/lib/api/
└── types.ts              # All types in one file
```

✅ Simple
✅ Easy to navigate
✅ Good for prototypes

### Level 2: Medium Projects (20-50 types)

**Split by category:**
```
src/lib/api/types/
├── index.ts              # Re-exports
├── common.ts             # ApiResponse, Pagination, etc.
├── users.ts              # User, Profile, Auth
├── products.ts           # Product, Category, Inventory
├── orders.ts             # Order, Payment, Shipping
└── posts.ts              # Post, Comment, Tag
```

✅ Organized by domain
✅ Easier to find types
✅ Better for teams

### Level 3: Large Projects (50+ types) ⭐ RECOMMENDED

**Feature-based with subfolders:**
```
src/lib/api/types/
├── index.ts                      # Main re-export
├── common/
│   ├── index.ts
│   ├── api.types.ts              # ApiResponse, ApiError
│   ├── pagination.types.ts       # Pagination
│   └── validation.types.ts       # Validation errors
├── users/
│   ├── index.ts
│   ├── user.types.ts             # User entity
│   ├── profile.types.ts          # UserProfile
│   ├── auth.types.ts             # Login, Register requests
│   ├── settings.types.ts         # User settings
│   └── preferences.types.ts      # User preferences
├── products/
│   ├── index.ts
│   ├── product.types.ts          # Product entity
│   ├── category.types.ts         # Category
│   ├── inventory.types.ts        # Stock, Warehouse
│   ├── pricing.types.ts          # Price, Discount
│   └── variants.types.ts         # Product variants
├── orders/
│   ├── index.ts
│   ├── order.types.ts            # Order entity
│   ├── cart.types.ts             # Shopping cart
│   ├── payment.types.ts          # Payment methods
│   ├── shipping.types.ts         # Shipping info
│   └── invoice.types.ts          # Invoice
└── posts/
    ├── index.ts
    ├── post.types.ts             # Post entity
    ├── comment.types.ts          # Comments
    ├── tag.types.ts              # Tags
    └── media.types.ts            # Images, Videos
```

✅ Highly scalable
✅ Clear ownership
✅ Easy to navigate
✅ Good for large teams

---

## Migration Guide

### Step 1: Create Directory Structure

```bash
# Create directories
mkdir -p src/lib/api/types/common
mkdir -p src/lib/api/types/users
mkdir -p src/lib/api/types/products
mkdir -p src/lib/api/types/orders
mkdir -p src/lib/api/types/posts

# Or use script
npx tsx scripts/setup-types-structure.ts
```

### Step 2: Move Types to Domain Files

**Before (single file):**
```typescript
// src/lib/api/types.ts
export interface User { ... }
export interface CreateUserRequest { ... }
export interface Product { ... }
export interface Order { ... }
```

**After (organized):**
```typescript
// src/lib/api/types/users/user.types.ts
export interface User { ... }
export interface CreateUserRequest { ... }
export interface UpdateUserRequest { ... }

// src/lib/api/types/products/product.types.ts
export interface Product { ... }
export interface CreateProductRequest { ... }

// src/lib/api/types/orders/order.types.ts
export interface Order { ... }
export interface CreateOrderRequest { ... }
```

### Step 3: Create Re-export Files

**Domain index:**
```typescript
// src/lib/api/types/users/index.ts
export * from './user.types'
export * from './auth.types'
export * from './profile.types'
```

**Main index:**
```typescript
// src/lib/api/types/index.ts
export * from './common'
export * from './users'
export * from './products'
export * from './orders'
export * from './posts'
```

### Step 4: Update Imports

**Before:**
```typescript
import type { User, Product } from '@/lib/api/types'
```

**After (same!):**
```typescript
import type { User, Product } from '@/lib/api/types'
// Still works thanks to re-exports!
```

**Or be specific:**
```typescript
import type { User } from '@/lib/api/types/users'
import type { Product } from '@/lib/api/types/products'
```

---

## Best Practices

### 1. Naming Conventions

**File naming:**
```
✅ user.types.ts
✅ product.types.ts
✅ order.types.ts

❌ user.ts           (unclear)
❌ types.ts          (too generic)
❌ userTypes.ts      (inconsistent)
```

**Type naming:**
```typescript
// Entity types
export interface User { ... }
export interface Product { ... }

// Request types - suffix with Request
export interface CreateUserRequest { ... }
export interface UpdateProductRequest { ... }

// Response types - suffix with Response
export interface LoginResponse { ... }
export interface SearchResponse<T> { ... }

// Status/enum types - singular
export type UserStatus = 'active' | 'inactive'
export type OrderStatus = 'pending' | 'shipped'

// List types - plural or suffix with List
export interface UserList { ... }
export type Products = Product[]
```

### 2. File Organization

**Keep related types together:**
```typescript
// ✅ Good - related types in same file
// src/lib/api/types/users/user.types.ts
export interface User { ... }
export interface CreateUserRequest { ... }
export interface UpdateUserRequest { ... }
export type UserStatus = 'active' | 'inactive'
export type UserRole = 'admin' | 'user'

// ❌ Bad - splitting unnecessarily
// user.types.ts
export interface User { ... }

// user-request.types.ts
export interface CreateUserRequest { ... }

// user-enums.types.ts
export type UserStatus = ...
```

**But separate when file gets too large (>300 lines):**
```typescript
// user.types.ts (100 lines)
export interface User { ... }

// user-settings.types.ts (100 lines)
export interface UserSettings { ... }

// user-permissions.types.ts (100 lines)
export interface UserPermissions { ... }
```

### 3. Common Types

**Extract truly shared types:**
```typescript
// src/lib/api/types/common/api.types.ts
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// src/lib/api/types/common/pagination.types.ts
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
```

### 4. Avoid Circular Dependencies

**Problem:**
```typescript
// user.types.ts
import type { Post } from './post.types'
export interface User {
  posts: Post[]
}

// post.types.ts
import type { User } from './user.types'
export interface Post {
  author: User
}
// ❌ Circular dependency!
```

**Solution 1: Inline minimal type**
```typescript
// post.types.ts
export interface Post {
  author: {
    id: string
    name: string
  }  // Don't import full User
}
```

**Solution 2: Extract to common**
```typescript
// common/entities.types.ts
export interface UserSummary {
  id: string
  name: string
}

// post.types.ts
import type { UserSummary } from '../common'
export interface Post {
  author: UserSummary
}
```

### 5. Documentation

**Add JSDoc comments:**
```typescript
/**
 * User entity from backend
 *
 * @endpoint GET /api/users/:id
 * @example
 * ```typescript
 * const user = await get<User>('/api/users/123')
 * ```
 */
export interface User {
  /**
   * Unique user identifier
   */
  id: string

  /**
   * User's email address
   * Must be unique and verified
   */
  email: string

  /**
   * User status
   * - active: Can access system
   * - inactive: Suspended
   * - pending: Email not verified
   */
  status: UserStatus
}
```

---

## Examples

### Example 1: E-commerce Structure

```
src/lib/api/types/
├── index.ts
├── common/
│   ├── index.ts
│   ├── api.types.ts
│   ├── pagination.types.ts
│   └── search.types.ts
├── users/
│   ├── index.ts
│   ├── user.types.ts
│   ├── address.types.ts
│   ├── auth.types.ts
│   └── preferences.types.ts
├── products/
│   ├── index.ts
│   ├── product.types.ts
│   ├── category.types.ts
│   ├── inventory.types.ts
│   ├── pricing.types.ts
│   ├── variants.types.ts
│   └── reviews.types.ts
├── orders/
│   ├── index.ts
│   ├── order.types.ts
│   ├── cart.types.ts
│   ├── payment.types.ts
│   ├── shipping.types.ts
│   ├── invoice.types.ts
│   └── returns.types.ts
└── marketing/
    ├── index.ts
    ├── promotion.types.ts
    ├── coupon.types.ts
    └── campaign.types.ts
```

### Example 2: SaaS Structure

```
src/lib/api/types/
├── index.ts
├── common/
│   ├── index.ts
│   ├── api.types.ts
│   └── pagination.types.ts
├── auth/
│   ├── index.ts
│   ├── user.types.ts
│   ├── session.types.ts
│   ├── permissions.types.ts
│   └── sso.types.ts
├── workspace/
│   ├── index.ts
│   ├── workspace.types.ts
│   ├── member.types.ts
│   ├── role.types.ts
│   └── settings.types.ts
├── projects/
│   ├── index.ts
│   ├── project.types.ts
│   ├── task.types.ts
│   └── milestone.types.ts
├── billing/
│   ├── index.ts
│   ├── subscription.types.ts
│   ├── invoice.types.ts
│   ├── payment.types.ts
│   └── plan.types.ts
└── analytics/
    ├── index.ts
    ├── metrics.types.ts
    └── report.types.ts
```

---

## Tooling

### Auto-generate Types from OpenAPI/Swagger

```bash
# Install
npm install --save-dev openapi-typescript

# Generate from OpenAPI spec
npx openapi-typescript http://localhost:8000/openapi.json \
  --output src/lib/api/types/generated.ts
```

### Generate from Backend Code (if using TypeScript backend)

```bash
# If backend is TypeScript
# Copy shared types from backend

# Backend: backend/src/types/user.types.ts
# Frontend: src/lib/api/types/users/user.types.ts
```

### Type Validation Script

```typescript
// scripts/validate-types.ts
// Check for unused types, circular deps, etc.
import ts from 'typescript'

// Implementation...
```

---

## Migration Checklist

When migrating to organized structure:

- [ ] Create directory structure
- [ ] Move types to domain files
- [ ] Create index re-exports
- [ ] Update imports (optional - re-exports handle this)
- [ ] Test that all imports still work
- [ ] Update documentation
- [ ] Run type-check: `npm run build`
- [ ] Commit changes

---

## FAQ

**Q: Should I organize from the start?**
A: No! Start simple with single file. Organize when:
- File > 500 lines
- 20+ types
- Multiple people editing
- Frequent merge conflicts

**Q: How many types per file?**
A: Aim for 5-15 related types per file. Split when >300 lines.

**Q: How to name files?**
A: Use `*.types.ts` suffix for clarity.

**Q: Re-export or direct import?**
A: Both work! Re-exports are cleaner for consumers.

**Q: Shared types - where to put?**
A: In `common/` directory. Only truly shared types!

**Q: How to avoid circular dependencies?**
A: Use minimal inline types or extract to common.

---

## Summary

**Small Project (<20 types):**
```
src/lib/api/types.ts          # Single file
```

**Medium Project (20-50 types):**
```
src/lib/api/types/
├── index.ts
├── common.ts
├── users.ts
├── products.ts
└── orders.ts
```

**Large Project (50+ types):**
```
src/lib/api/types/
├── index.ts
├── common/
│   └── *.types.ts
├── users/
│   └── *.types.ts
├── products/
│   └── *.types.ts
└── orders/
    └── *.types.ts
```

**Benefits:**
✅ Scalable
✅ Easy to find types
✅ Clear ownership
✅ Better for teams
✅ Reduces merge conflicts

---

**Next Steps:**
1. Start with single file
2. Split when needed (>20 types)
3. Organize by domain
4. Use re-exports
5. Document well

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0

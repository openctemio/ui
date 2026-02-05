# Customize Types Guide

**Time Required:** 15-30 minutes
**Last Updated:** 2025-12-11

Complete guide to customize API types to match your backend schema.

---

## Table of Contents

- [Overview](#overview)
- [Step-by-Step Guide](#step-by-step-guide)
- [Common Patterns](#common-patterns)
- [Examples](#examples)
- [Validation](#validation)
- [Best Practices](#best-practices)

---

## Overview

### What to Customize

The file `src/lib/api/types.ts` contains TypeScript interfaces that define:
- **Request types** - Data sent TO backend
- **Response types** - Data received FROM backend
- **Common types** - Shared structures (pagination, errors, etc.)

### Why Customize

Your backend schema is unique! You need to:
1. Match field names (e.g., `user_id` vs `userId`)
2. Match data types (e.g., `string` vs `number`)
3. Add custom fields specific to your domain
4. Handle backend-specific response formats

---

## Step-by-Step Guide

### Step 1: Inspect Your Backend Response

First, see what your backend actually returns:

**Method A: Use API Test Page**
```bash
# Open http://localhost:3000/api-test
# Click "Auth GET Request" to call /api/auth/me
# Copy the JSON response
```

**Method B: Use curl**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/users
```

**Method C: Use Postman/Insomnia**
- Make GET request to your backend
- Copy response JSON

**Example Backend Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "123",
    "full_name": "John Doe",
    "email_address": "john@example.com",
    "created_date": "2024-01-01T00:00:00Z",
    "profile": {
      "avatar_url": "https://example.com/avatar.jpg",
      "bio": "Hello world"
    },
    "permissions": ["read", "write"]
  }
}
```

### Step 2: Create Your Type

Based on the response, create TypeScript interface:

```typescript
// src/lib/api/types.ts

/**
 * User from your backend
 * Matches the structure from GET /api/users/:id
 */
export interface User {
  user_id: string              // ← Match field name exactly
  full_name: string            // ← Use snake_case if backend uses it
  email_address: string
  created_date: string         // ← ISO date string
  profile: {
    avatar_url?: string        // ← Optional field (?)
    bio?: string
  }
  permissions: string[]        // ← Array type
}
```

### Step 3: Create Request Types

Define what you send TO the backend:

```typescript
/**
 * Create user request
 * Sent to POST /api/users
 */
export interface CreateUserRequest {
  full_name: string
  email_address: string
  password: string
  profile?: {
    bio?: string
  }
}

/**
 * Update user request
 * Sent to PUT /api/users/:id
 */
export interface UpdateUserRequest {
  full_name?: string        // ← Optional for partial updates
  profile?: {
    avatar_url?: string
    bio?: string
  }
}
```

### Step 4: Update Existing Types

Replace the example `User` type in `types.ts`:

```typescript
// BEFORE (example type)
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  roles: string[]
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

// AFTER (your actual backend schema)
export interface User {
  user_id: string
  full_name: string
  email_address: string
  created_date: string
  profile: {
    avatar_url?: string
    bio?: string
  }
  permissions: string[]
}
```

### Step 5: Test Your Types

Create a test component to verify types match:

```typescript
'use client'
import { get } from '@/lib/api'
import type { User } from '@/lib/api'

export function TestTypes() {
  const testFetch = async () => {
    const user = await get<User>('/api/users/123')

    // TypeScript will show errors if types don't match
    console.log(user.user_id)      // ✅ OK
    console.log(user.full_name)    // ✅ OK
    console.log(user.id)           // ❌ Error - doesn't exist
  }

  return <button onClick={testFetch}>Test</button>
}
```

---

## Common Patterns

### Pattern 1: Snake Case Backend (Python, Ruby)

**Backend Response:**
```json
{
  "user_id": "123",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**TypeScript Type:**
```typescript
export interface User {
  user_id: string          // Keep snake_case to match backend
  first_name: string
  last_name: string
  created_at: string
}
```

**Usage:**
```typescript
const user = await get<User>('/api/users/123')
console.log(user.first_name)  // Use snake_case in code
```

**Alternative: Transform to camelCase**
```typescript
// If you prefer camelCase in frontend
export interface User {
  userId: string
  firstName: string
  lastName: string
  createdAt: string
}

// Add transformer in API client
function transformKeys(obj: any): any {
  // Convert snake_case to camelCase
  // (Implementation depends on your preference)
}
```

### Pattern 2: Nested Objects

**Backend Response:**
```json
{
  "id": "123",
  "profile": {
    "settings": {
      "notifications": {
        "email": true,
        "push": false
      }
    }
  }
}
```

**TypeScript Type:**
```typescript
export interface User {
  id: string
  profile: {
    settings: {
      notifications: {
        email: boolean
        push: boolean
      }
    }
  }
}

// Or break into separate interfaces
export interface NotificationSettings {
  email: boolean
  push: boolean
}

export interface ProfileSettings {
  notifications: NotificationSettings
}

export interface UserProfile {
  settings: ProfileSettings
}

export interface User {
  id: string
  profile: UserProfile
}
```

### Pattern 3: Enums/Unions

**Backend Response:**
```json
{
  "id": "123",
  "status": "active",
  "role": "admin"
}
```

**TypeScript Type:**
```typescript
export type UserStatus = 'active' | 'inactive' | 'pending' | 'banned'
export type UserRole = 'admin' | 'user' | 'moderator'

export interface User {
  id: string
  status: UserStatus
  role: UserRole
}

// Now TypeScript enforces valid values
const user: User = {
  id: '123',
  status: 'active',    // ✅ OK
  role: 'superadmin'   // ❌ Error - not in UserRole
}
```

### Pattern 4: Dates

**Backend Response:**
```json
{
  "id": "123",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": 1704067200000
}
```

**TypeScript Type:**
```typescript
export interface User {
  id: string
  created_at: string      // ISO 8601 string
  updated_at: number      // Unix timestamp
}

// Usage
const user = await get<User>('/api/users/123')
const createdDate = new Date(user.created_at)
const updatedDate = new Date(user.updated_at)
```

### Pattern 5: Arrays & Collections

**Backend Response:**
```json
{
  "id": "123",
  "tags": ["typescript", "react"],
  "posts": [
    { "id": "1", "title": "Hello" },
    { "id": "2", "title": "World" }
  ]
}
```

**TypeScript Type:**
```typescript
export interface Post {
  id: string
  title: string
}

export interface User {
  id: string
  tags: string[]        // Array of strings
  posts: Post[]         // Array of objects
}
```

### Pattern 6: Nullable vs Optional

**Backend Response:**
```json
{
  "id": "123",
  "middle_name": null,
  "nickname": "JD"
}
```

**TypeScript Type:**
```typescript
export interface User {
  id: string
  middle_name: string | null    // Can be null
  nickname?: string             // May not exist
}

// Usage
if (user.middle_name === null) {
  // Handle null case
}

if (user.nickname) {
  // Handle present case
}
```

---

## Examples

### Example 1: E-commerce Product

**Backend Response:**
```json
{
  "product_id": "p123",
  "name": "Widget",
  "price": {
    "amount": 9999,
    "currency": "USD"
  },
  "inventory": {
    "in_stock": true,
    "quantity": 42
  },
  "images": [
    { "url": "https://...", "alt": "Front view" }
  ],
  "category": {
    "id": "c1",
    "name": "Electronics"
  }
}
```

**TypeScript Types:**
```typescript
export interface Price {
  amount: number        // cents
  currency: string
}

export interface Inventory {
  in_stock: boolean
  quantity: number
}

export interface ProductImage {
  url: string
  alt: string
}

export interface Category {
  id: string
  name: string
}

export interface Product {
  product_id: string
  name: string
  price: Price
  inventory: Inventory
  images: ProductImage[]
  category: Category
}

// Request types
export interface CreateProductRequest {
  name: string
  price: Price
  category_id: string
}

export interface UpdateProductRequest {
  name?: string
  price?: Price
  inventory?: Partial<Inventory>
}
```

### Example 2: Blog Post

**Backend Response:**
```json
{
  "id": "post-123",
  "title": "My Post",
  "content": "Lorem ipsum...",
  "author": {
    "id": "user-1",
    "name": "John Doe"
  },
  "published_at": "2024-01-01T00:00:00Z",
  "status": "published",
  "tags": ["tech", "tutorial"],
  "meta": {
    "views": 1234,
    "likes": 56
  }
}
```

**TypeScript Types:**
```typescript
export interface Author {
  id: string
  name: string
}

export interface PostMeta {
  views: number
  likes: number
}

export type PostStatus = 'draft' | 'published' | 'archived'

export interface Post {
  id: string
  title: string
  content: string
  author: Author
  published_at: string | null
  status: PostStatus
  tags: string[]
  meta: PostMeta
}

export interface CreatePostRequest {
  title: string
  content: string
  status?: PostStatus
  tags?: string[]
}

export interface UpdatePostRequest {
  title?: string
  content?: string
  status?: PostStatus
  tags?: string[]
}
```

---

## Validation

### Runtime Validation with Zod

For critical data, add runtime validation:

```typescript
import { z } from 'zod'

// Define Zod schema
export const UserSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  email_address: z.string().email(),
  created_date: z.string().datetime(),
  profile: z.object({
    avatar_url: z.string().url().optional(),
    bio: z.string().optional(),
  }),
  permissions: z.array(z.string()),
})

// Infer TypeScript type from Zod schema
export type User = z.infer<typeof UserSchema>

// Validate at runtime
const user = UserSchema.parse(backendData)  // Throws if invalid
```

### Type Guards

Create type guards for runtime checks:

```typescript
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user_id' in obj &&
    'full_name' in obj &&
    'email_address' in obj
  )
}

// Usage
const data = await get('/api/users/123')
if (isUser(data)) {
  console.log(data.user_id)  // TypeScript knows it's User
}
```

---

## Best Practices

### 1. Match Backend Exactly

**DON'T** transform field names in types:
```typescript
// ❌ Bad - doesn't match backend
export interface User {
  id: string              // Backend sends 'user_id'
  name: string            // Backend sends 'full_name'
}
```

**DO** match backend field names:
```typescript
// ✅ Good - matches backend
export interface User {
  user_id: string
  full_name: string
}
```

### 2. Use Descriptive Names

```typescript
// ❌ Bad - unclear
export interface Data {
  val: string
  num: number
}

// ✅ Good - clear purpose
export interface UserProfile {
  displayName: string
  followerCount: number
}
```

### 3. Document Complex Fields

```typescript
export interface Product {
  /**
   * Price in cents (e.g., 9999 = $99.99)
   */
  price: number

  /**
   * ISO 8601 date string
   * Example: "2024-01-01T00:00:00Z"
   */
  created_at: string

  /**
   * Stock status
   * - in_stock: Available for purchase
   * - out_of_stock: Sold out
   * - pre_order: Available for pre-order
   */
  stock_status: 'in_stock' | 'out_of_stock' | 'pre_order'
}
```

### 4. Separate Request/Response Types

```typescript
// Response from GET /api/users/:id
export interface User {
  id: string
  email: string
  created_at: string    // Read-only
}

// Request to POST /api/users
export interface CreateUserRequest {
  email: string
  password: string
  // No 'id' or 'created_at' - backend generates these
}

// Request to PUT /api/users/:id
export interface UpdateUserRequest {
  email?: string
  // No 'id' - in URL param
  // No 'password' - use separate endpoint
  // No 'created_at' - read-only
}
```

### 5. Use Utility Types

```typescript
// Reuse base type for updates
export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

// All fields optional for PATCH
export type UpdateUserRequest = Partial<Omit<User, 'id' | 'created_at'>>

// Pick specific fields
export type UserSummary = Pick<User, 'id' | 'name'>

// Omit sensitive fields
export type PublicUser = Omit<User, 'email'>
```

---

## Checklist

After customizing types:

- [ ] Types match backend response exactly
- [ ] Field names are identical to backend
- [ ] Data types are correct (string, number, boolean, etc.)
- [ ] Optional fields marked with `?`
- [ ] Nullable fields have `| null`
- [ ] Arrays typed correctly (`string[]`, `User[]`)
- [ ] Nested objects properly typed
- [ ] Request types separate from response types
- [ ] Enums/unions for limited values
- [ ] Comments added for complex fields
- [ ] Types tested with real API calls

---

## Next Steps

1. **Update types.ts** - Match your backend schema
2. **Test types** - Make API calls and verify
3. **Update endpoints** - Add your domain endpoints
4. **Create hooks** - Build custom hooks for your data
5. **Replace mock data** - Use real API in components

---

**See Also:**
- [API Integration Guide](./API_INTEGRATION.md)
- [Endpoint Customization](./CUSTOMIZE_ENDPOINTS_GUIDE.md) (next step)

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0

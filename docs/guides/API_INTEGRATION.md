# API Integration Guide

**Last Updated:** 2025-12-11
**Version:** 1.0.0

Complete guide for integrating with your separate backend API.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Client Usage](#api-client-usage)
- [Using Hooks](#using-hooks)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)
- [Examples](#examples)
- [Backend Requirements](#backend-requirements)
- [Troubleshooting](#troubleshooting)

---

## Overview

The frontend connects to your separate backend API using:
- **API Client:** Type-safe HTTP client with automatic auth headers
- **SWR Hooks:** React hooks for data fetching with caching
- **Error Handler:** Centralized error handling with user-friendly messages

**Architecture:**
```
Frontend (Next.js) → API Client → Backend API
                        ↓
                  Auto-inject Bearer Token
```

---

## Quick Start

### 1. Configure Backend URL

```bash
# .env.local
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend-api.com
```

### 2. Use in Components

```typescript
'use client'
import { useUsers, useCreateUser } from '@/lib/api'

export function UsersPage() {
  // Fetch users
  const { data, error, isLoading } = useUsers({ page: 1, pageSize: 10 })

  // Create user mutation
  const { trigger: createUser, isMutating } = useCreateUser()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <ul>
        {data?.data.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button
        onClick={() => createUser({ name: 'John', email: 'john@example.com', password: '123' })}
        disabled={isMutating}
      >
        Create User
      </button>
    </div>
  )
}
```

---

## Configuration

### Environment Variables

```env
# Required - Your backend API base URL
NEXT_PUBLIC_BACKEND_API_URL=https://api.example.com

# Optional - Server-side only (for Server Components)
BACKEND_API_URL=https://api.example.com

# Optional - Request timeout (default: 30000ms)
API_TIMEOUT=30000
```

### SWR Configuration

```typescript
// src/lib/api/hooks.ts (already configured)
export const defaultSwrConfig = {
  revalidateOnFocus: false,      // Don't refetch on window focus
  revalidateOnReconnect: true,   // Refetch on network reconnect
  shouldRetryOnError: true,      // Retry on error
  errorRetryCount: 3,            // Max 3 retries
  errorRetryInterval: 1000,      // 1s between retries
  dedupingInterval: 2000,        // Dedupe requests within 2s
}
```

---

## API Client Usage

### Basic Requests

```typescript
import { get, post, put, del } from '@/lib/api'

// GET request
const users = await get<User[]>('/api/users')

// POST request
const newUser = await post<User>('/api/users', {
  name: 'John',
  email: 'john@example.com'
})

// PUT request
const updated = await put<User>('/api/users/123', {
  name: 'John Doe'
})

// DELETE request
await del('/api/users/123')
```

### With Type Safety

```typescript
import { get, endpoints } from '@/lib/api'
import type { User, PaginatedResponse } from '@/lib/api'

// Type-safe endpoint + response type
const users = await get<PaginatedResponse<User>>(
  endpoints.users.list({ page: 1, pageSize: 10 })
)

// users.data is User[]
// users.pagination has page info
```

### Authentication

**Auth headers are injected automatically:**

```typescript
import { get } from '@/lib/api'

// Access token from Zustand store is automatically added
// Authorization: Bearer {accessToken}
const profile = await get('/api/auth/me')
```

**Skip auth (for public endpoints):**

```typescript
const data = await get('/api/public/stats', { skipAuth: true })
```

### File Upload

```typescript
import { uploadFile } from '@/lib/api'

const handleFileUpload = async (file: File) => {
  const result = await uploadFile('/api/files/upload', file, {
    onProgress: (progress) => {
      console.log(`Uploaded: ${progress.percentage}%`)
    }
  })

  console.log('File URL:', result.url)
}
```

---

## Using Hooks

### Fetching Data

```typescript
import { useUsers, useUser } from '@/lib/api'

function UsersList() {
  // List users with filters
  const { data, error, isLoading, mutate } = useUsers({
    page: 1,
    pageSize: 20,
    search: 'john',
    role: 'admin'
  })

  // Single user
  const { data: user } = useUser('user-123')

  // Refresh data
  const handleRefresh = () => mutate()

  if (isLoading) return <Loading />
  if (error) return <Error />

  return (
    <div>
      {data?.data.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}
```

### Mutations (Create/Update/Delete)

```typescript
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/api'

function UserManagement() {
  const { trigger: createUser, isMutating: isCreating } = useCreateUser()
  const { trigger: updateUser } = useUpdateUser('user-123')
  const { trigger: deleteUser } = useDeleteUser('user-123')

  const handleCreate = async () => {
    try {
      const newUser = await createUser({
        name: 'John',
        email: 'john@example.com',
        password: 'secure123'
      })
      toast.success('User created!')
    } catch (error) {
      // Error already shown by error handler
    }
  }

  const handleUpdate = async () => {
    await updateUser({ name: 'John Doe' })
  }

  const handleDelete = async () => {
    if (confirm('Delete user?')) {
      await deleteUser()
    }
  }

  return (
    <>
      <button onClick={handleCreate} disabled={isCreating}>
        Create User
      </button>
      <button onClick={handleUpdate}>Update User</button>
      <button onClick={handleDelete}>Delete User</button>
    </>
  )
}
```

### File Upload with Progress

```typescript
import { useUploadFile } from '@/lib/api'
import { useState } from 'react'

function FileUploader() {
  const { trigger: uploadFile, isMutating } = useUploadFile()
  const [progress, setProgress] = useState(0)

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile({
        file,
        onProgress: (p) => setProgress(p.percentage)
      })

      toast.success(`File uploaded: ${result.url}`)
    } catch (error) {
      // Error handled automatically
    } finally {
      setProgress(0)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={isMutating}
      />
      {isMutating && <progress value={progress} max={100} />}
    </div>
  )
}
```

### Conditional Fetching

```typescript
import { useUser, useDependentData, endpoints } from '@/lib/api'

function UserPosts({ userId }: { userId: string | null }) {
  // Only fetch when userId is available
  const { data: user } = useUser(userId)

  // Fetch user's posts only after user is loaded
  const { data: posts } = useDependentData(
    user?.id,
    (id) => endpoints.users.posts(id),
    get
  )

  if (!userId) return <div>Select a user</div>
  if (!user) return <Loading />

  return <PostsList posts={posts?.data || []} />
}
```

### Infinite Scroll

```typescript
import { useInfiniteUsers } from '@/lib/api'

function InfiniteUsersList() {
  const {
    data,
    size,
    setSize,
    isLoading,
    isValidating
  } = useInfiniteUsers({ pageSize: 20 })

  const users = data ? data.flatMap(page => page.data) : []
  const isLoadingMore = isValidating && data && data.length === size

  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}

      {isLoadingMore && <Loading />}

      <button onClick={() => setSize(size + 1)}>
        Load More
      </button>
    </div>
  )
}
```

### Polling (Auto-refresh)

```typescript
import { usePolling, endpoints, get } from '@/lib/api'

function LiveDashboard() {
  // Refresh every 5 seconds
  const { data: stats } = usePolling(
    endpoints.auth.me(),
    get,
    5000
  )

  return <div>Active users: {stats?.activeUsers}</div>
}
```

---

## Error Handling

### Automatic Error Handling

Errors are handled automatically with user-friendly toast messages:

```typescript
const { data, error } = useUsers()

// If error occurs:
// - Toast shows: "Error: Network error. Please check your connection"
// - Error logged to console
// - Error is in `error` variable for custom handling
```

### Custom Error Handling

```typescript
import { handleApiError } from '@/lib/api'

try {
  await createUser(data)
} catch (error) {
  handleApiError(error, {
    showToast: false,         // Don't show toast
    logError: true,           // Log to console
    customMessages: {
      'USER_EXISTS': 'Email already taken',
      'INVALID_EMAIL': 'Please provide a valid email'
    },
    onError: (err) => {
      // Custom handling
      if (err.isValidationError()) {
        setFormErrors(extractValidationErrors(err))
      }
    }
  })
}
```

### Error Types

```typescript
import { ApiClientError } from '@/lib/api'

try {
  await apiCall()
} catch (error) {
  if (error instanceof ApiClientError) {
    if (error.isAuthError()) {
      // Handle auth errors (401, token expired, etc.)
      router.push('/login')
    } else if (error.isValidationError()) {
      // Handle validation errors (422)
      const errors = extractValidationErrors(error)
      setFormErrors(errors)
    } else if (error.isNotFoundError()) {
      // Handle 404
      router.push('/404')
    } else if (error.isServerError()) {
      // Handle 5xx
      showServerErrorPage()
    }
  }
}
```

### Validation Errors

```typescript
import { extractValidationErrors } from '@/lib/api'

try {
  await createUser(formData)
} catch (error) {
  if (error instanceof ApiClientError && error.isValidationError()) {
    const fieldErrors = extractValidationErrors(error)
    // { email: 'Invalid email format', password: 'Too short' }

    // Set form errors
    Object.entries(fieldErrors || {}).forEach(([field, message]) => {
      form.setError(field, { message })
    })
  }
}
```

---

## Advanced Patterns

### Optimistic Updates

```typescript
import { optimisticUpdate, endpoints } from '@/lib/api'

const handleLike = async (postId: string) => {
  const optimisticData = { ...post, likes: post.likes + 1 }

  await optimisticUpdate(
    endpoints.posts.get(postId),
    optimisticData,
    () => post('/api/posts/${postId}/like')
  )
}
```

### Retry with Backoff

```typescript
import { retryWithBackoff, get } from '@/lib/api'

const data = await retryWithBackoff(
  () => get('/api/users'),
  {
    maxRetries: 3,
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt} after error:`, error.message)
    }
  }
)
```

### Custom Fetcher

```typescript
import useSWR from 'swr'
import { get } from '@/lib/api'

function useCustomData() {
  return useSWR('/api/custom', async (url) => {
    // Custom logic before fetch
    console.log('Fetching:', url)

    const data = await get(url)

    // Custom logic after fetch
    return transformData(data)
  })
}
```

### Prefetching

```typescript
import { mutate } from 'swr'
import { get, endpoints } from '@/lib/api'

// Prefetch on hover
const handleMouseEnter = async () => {
  await mutate(
    endpoints.users.get('user-123'),
    get(endpoints.users.get('user-123')),
    { revalidate: false }
  )
}

<Link href="/users/123" onMouseEnter={handleMouseEnter}>
  View User
</Link>
```

---

## Examples

### Complete CRUD Example

```typescript
'use client'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type User,
  type CreateUserRequest
} from '@/lib/api'
import { useState } from 'react'

export function UserManagement() {
  const [page, setPage] = useState(1)

  // Fetch users
  const { data, error, isLoading, mutate } = useUsers({ page, pageSize: 10 })

  // Mutations
  const { trigger: createUser } = useCreateUser()
  const { trigger: updateUser } = useUpdateUser('user-id')
  const { trigger: deleteUser } = useDeleteUser('user-id')

  // Create
  const handleCreate = async (userData: CreateUserRequest) => {
    try {
      await createUser(userData)
      mutate() // Refresh list
    } catch (error) {
      // Error handled automatically
    }
  }

  // Update
  const handleUpdate = async (userId: string, data: Partial<User>) => {
    try {
      await updateUser(data)
      mutate() // Refresh list
    } catch (error) {
      // Error handled
    }
  }

  // Delete
  const handleDelete = async (userId: string) => {
    if (confirm('Delete user?')) {
      await deleteUser()
      mutate() // Refresh list
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading users</div>

  return (
    <div>
      <h1>Users</h1>

      <ul>
        {data?.data.map(user => (
          <li key={user.id}>
            {user.name}
            <button onClick={() => handleUpdate(user.id, { name: 'New Name' })}>
              Edit
            </button>
            <button onClick={() => handleDelete(user.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  )
}
```

### Server Component Example

```typescript
// app/users/page.tsx (Server Component)
import { get, endpoints } from '@/lib/api'
import type { PaginatedResponse, User } from '@/lib/api'

export default async function UsersPage() {
  // Fetch on server
  const users = await get<PaginatedResponse<User>>(
    endpoints.users.list({ page: 1, pageSize: 10 })
  )

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.data.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Backend Requirements

Your backend API must support:

### 1. JWT Token Validation

Validate Keycloak JWT tokens from `Authorization` header:

```
Authorization: Bearer {access_token}
```

### 2. CORS Configuration

Allow requests from Next.js frontend:

```javascript
// Example Express.js CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,  // http://localhost:3000
  credentials: true
}))
```

### 3. Response Format (Recommended)

Use consistent response format:

```json
{
  "success": true,
  "data": { /* your data */ }
}
```

Or for errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "email": "Invalid email format"
    }
  }
}
```

### 4. HTTP Status Codes

Use standard status codes:
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

## Troubleshooting

### CORS Errors

**Problem:** `Access to fetch has been blocked by CORS policy`

**Solution:**
```javascript
// Backend CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',  // Your Next.js URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))
```

### Authentication Errors

**Problem:** 401 Unauthorized

**Solutions:**
1. Check access token exists: `useAuthStore.getState().accessToken`
2. Check token not expired: Use JWT debugger
3. Verify backend validates Keycloak tokens correctly

### Network Errors

**Problem:** `Network error - please check your connection`

**Solutions:**
1. Check `NEXT_PUBLIC_BACKEND_API_URL` is correct
2. Verify backend is running
3. Check firewall/proxy settings

### TypeScript Errors

**Problem:** Type mismatch errors

**Solution:** Update types in `src/lib/api/types.ts` to match your backend:

```typescript
// Customize to match your backend response
export interface User {
  id: string
  email: string
  name: string
  // Add your custom fields
  customField?: string
}
```

---

## Next Steps

1. **Configure Environment:** Set `NEXT_PUBLIC_BACKEND_API_URL` in `.env.local`
2. **Customize Types:** Update `src/lib/api/types.ts` for your backend schema
3. **Add Endpoints:** Add more endpoints in `src/lib/api/endpoints.ts`
4. **Create Hooks:** Create domain-specific hooks for your features
5. **Replace Mock Data:** Update dashboard to use real API calls

---

**See Also:**
- [Architecture Documentation](../ARCHITECTURE.md)
- [Auth Usage Guide](../features/auth/AUTH_USAGE.md)
- [Troubleshooting](../features/auth/TROUBLESHOOTING.md)

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0

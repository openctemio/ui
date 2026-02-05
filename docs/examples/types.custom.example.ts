/**
 * Custom Types Template
 *
 * Copy this file to understand how to customize types for your backend
 *
 * Steps:
 * 1. Look at your backend JSON response
 * 2. Create interfaces that match exactly
 * 3. Update src/lib/api/types.ts with your types
 * 4. Test with real API calls
 */

// ============================================
// EXAMPLE 1: Snake Case Backend (Python/Ruby)
// ============================================

/**
 * Backend Response:
 * {
 *   "user_id": "123",
 *   "full_name": "John Doe",
 *   "email_address": "john@example.com",
 *   "created_at": "2024-01-01T00:00:00Z",
 *   "is_active": true
 * }
 */
export interface UserSnakeCase {
  user_id: string
  full_name: string
  email_address: string
  created_at: string
  is_active: boolean
}

// ============================================
// EXAMPLE 2: Nested Objects
// ============================================

/**
 * Backend Response:
 * {
 *   "id": "123",
 *   "profile": {
 *     "avatar": "https://...",
 *     "settings": {
 *       "notifications": {
 *         "email": true,
 *         "push": false
 *       }
 *     }
 *   }
 * }
 */
export interface NotificationSettings {
  email: boolean
  push: boolean
}

export interface ProfileSettings {
  notifications: NotificationSettings
}

export interface UserProfile {
  avatar: string
  settings: ProfileSettings
}

export interface UserWithProfile {
  id: string
  profile: UserProfile
}

// ============================================
// EXAMPLE 3: Arrays and Collections
// ============================================

/**
 * Backend Response:
 * {
 *   "id": "post-123",
 *   "title": "My Post",
 *   "tags": ["tech", "tutorial"],
 *   "comments": [
 *     {
 *       "id": "c1",
 *       "text": "Great post!",
 *       "author": { "id": "u1", "name": "Jane" }
 *     }
 *   ]
 * }
 */
export interface CommentAuthor {
  id: string
  name: string
}

export interface Comment {
  id: string
  text: string
  author: CommentAuthor
}

export interface PostWithComments {
  id: string
  title: string
  tags: string[]           // Array of strings
  comments: Comment[]      // Array of objects
}

// ============================================
// EXAMPLE 4: Enums and Unions
// ============================================

/**
 * Backend Response:
 * {
 *   "id": "123",
 *   "status": "active",
 *   "role": "admin",
 *   "plan": "premium"
 * }
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'banned'
export type UserRole = 'admin' | 'moderator' | 'user'
export type SubscriptionPlan = 'free' | 'premium' | 'enterprise'

export interface UserWithEnums {
  id: string
  status: UserStatus
  role: UserRole
  plan: SubscriptionPlan
}

// ============================================
// EXAMPLE 5: Nullable vs Optional
// ============================================

/**
 * Backend Response:
 * {
 *   "id": "123",
 *   "middle_name": null,        // Can be null
 *   "nickname": "JD",           // May or may not exist
 *   "bio": ""                   // Can be empty string
 * }
 */
export interface UserWithNullable {
  id: string
  middle_name: string | null    // Explicitly null
  nickname?: string             // May not exist
  bio: string                   // Always exists (can be empty)
}

// ============================================
// EXAMPLE 6: Pagination Response
// ============================================

/**
 * Backend Response:
 * {
 *   "data": [...],
 *   "meta": {
 *     "page": 1,
 *     "per_page": 10,
 *     "total": 100,
 *     "total_pages": 10
 *   }
 * }
 */
export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// Usage:
// const users: PaginatedResponse<User> = await get('/api/users')

// ============================================
// EXAMPLE 7: API Response Wrapper
// ============================================

/**
 * If your backend wraps all responses:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "Success"
 * }
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ============================================
// EXAMPLE 8: Real-world E-commerce Product
// ============================================

/**
 * Backend Response:
 * {
 *   "product_id": "p123",
 *   "name": "Widget",
 *   "price": {
 *     "amount": 9999,
 *     "currency": "USD",
 *     "formatted": "$99.99"
 *   },
 *   "inventory": {
 *     "in_stock": true,
 *     "quantity": 42,
 *     "warehouse": "WH-1"
 *   },
 *   "images": [
 *     {
 *       "url": "https://...",
 *       "alt": "Front view",
 *       "position": 0
 *     }
 *   ],
 *   "category": {
 *     "id": "cat-1",
 *     "name": "Electronics",
 *     "slug": "electronics"
 *   },
 *   "created_at": "2024-01-01T00:00:00Z"
 * }
 */
export interface Price {
  amount: number        // in cents
  currency: string
  formatted: string
}

export interface Inventory {
  in_stock: boolean
  quantity: number
  warehouse: string
}

export interface ProductImage {
  url: string
  alt: string
  position: number
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Product {
  product_id: string
  name: string
  price: Price
  inventory: Inventory
  images: ProductImage[]
  category: Category
  created_at: string
}

// Request types
export interface CreateProductRequest {
  name: string
  price: Omit<Price, 'formatted'>  // Backend calculates formatted
  category_id: string
  images?: Omit<ProductImage, 'position'>[]  // Backend sets position
}

export interface UpdateProductRequest {
  name?: string
  price?: Omit<Price, 'formatted'>
  inventory?: Partial<Inventory>
}

// ============================================
// EXAMPLE 9: Date/Time Formats
// ============================================

/**
 * Different date formats from backend
 */
export interface DateFormats {
  // ISO 8601 string
  created_at: string              // "2024-01-01T00:00:00Z"

  // Unix timestamp
  updated_at: number              // 1704067200

  // Date only
  birth_date: string              // "1990-01-01"

  // Time only
  start_time: string              // "14:30:00"
}

// ============================================
// EXAMPLE 10: Relations
// ============================================

/**
 * Backend Response with relations:
 * {
 *   "id": "post-123",
 *   "title": "My Post",
 *   "author_id": "user-1",       // Just ID
 *   "author": {                  // Or full object
 *     "id": "user-1",
 *     "name": "John"
 *   }
 * }
 */

// When backend returns just ID
export interface PostWithAuthorId {
  id: string
  title: string
  author_id: string
}

// When backend returns full object
export interface Author {
  id: string
  name: string
}

export interface PostWithAuthor {
  id: string
  title: string
  author: Author
}

// When it can be either (use union)
export interface PostFlexible {
  id: string
  title: string
  author: string | Author  // Can be ID or full object
}

// ============================================
// HOW TO USE THESE EXAMPLES
// ============================================

/**
 * 1. Find the example that matches your backend response
 * 2. Copy the interface
 * 3. Modify field names to match your backend exactly
 * 4. Add to src/lib/api/types.ts
 * 5. Use in your API calls:
 *
 * import type { Product } from '@/lib/api'
 * const product = await get<Product>('/api/products/123')
 */

// ============================================
// TESTING YOUR TYPES
// ============================================

/**
 * Test your types match the backend:
 *
 * 'use client'
 * import { get } from '@/lib/api'
 * import type { Product } from '@/lib/api'
 *
 * export function TestComponent() {
 *   const test = async () => {
 *     const product = await get<Product>('/api/products/123')
 *
 *     // TypeScript will show errors if types don't match
 *     console.log(product.product_id)    // ✅ OK if field exists
 *     console.log(product.wrong_field)   // ❌ Error
 *   }
 *
 *   return <button onClick={test}>Test Types</button>
 * }
 */

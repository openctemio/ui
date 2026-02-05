/**
 * Setup Types Structure
 *
 * Creates organized type structure for scaling
 *
 * Usage:
 *   npx tsx scripts/setup-types-structure.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const TYPES_DIR = 'src/lib/api/types'

// Directory structure
const STRUCTURE = {
  common: ['api.types.ts', 'pagination.types.ts', 'validation.types.ts'],
  users: ['user.types.ts', 'auth.types.ts', 'profile.types.ts'],
  products: ['product.types.ts', 'category.types.ts', 'inventory.types.ts'],
  orders: ['order.types.ts', 'payment.types.ts', 'shipping.types.ts'],
  posts: ['post.types.ts', 'comment.types.ts', 'tag.types.ts'],
}

// Templates
const templates = {
  'common/api.types.ts': `/**
 * Common API Types
 *
 * Shared API response structures
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}
`,

  'common/pagination.types.ts': `/**
 * Pagination Types
 *
 * Shared pagination structures
 */

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

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
`,

  'common/validation.types.ts': `/**
 * Validation Types
 *
 * Validation error structures
 */

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationErrorResponse {
  errors: ValidationError[]
  message: string
}
`,

  'users/user.types.ts': `/**
 * User Types
 *
 * User entity and related types
 */

/**
 * User entity from backend
 * @endpoint GET /api/users/:id
 */
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

/**
 * Create user request
 * @endpoint POST /api/users
 */
export interface CreateUserRequest {
  email: string
  name: string
  password: string
  roles?: string[]
}

/**
 * Update user request
 * @endpoint PUT /api/users/:id
 */
export interface UpdateUserRequest {
  name?: string
  avatar?: string
  roles?: string[]
}

export type UserStatus = 'active' | 'inactive' | 'pending' | 'banned'
export type UserRole = 'admin' | 'moderator' | 'user'
`,

  'users/auth.types.ts': `/**
 * Authentication Types
 *
 * Auth-related types
 */

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  confirmPassword: string
}
`,

  'users/profile.types.ts': `/**
 * User Profile Types
 */

export interface UserProfile {
  bio?: string
  location?: string
  website?: string
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    email: boolean
    push: boolean
  }
}
`,

  'products/product.types.ts': `/**
 * Product Types
 */

export interface Product {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  categoryId: string
  inStock: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  name: string
  description: string
  price: number
  categoryId: string
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  price?: number
  categoryId?: string
  inStock?: boolean
}
`,

  'products/category.types.ts': `/**
 * Category Types
 */

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  createdAt: string
}

export interface CreateCategoryRequest {
  name: string
  slug: string
  description?: string
  parentId?: string
}
`,

  'products/inventory.types.ts': `/**
 * Inventory Types
 */

export interface Inventory {
  productId: string
  quantity: number
  reserved: number
  available: number
  warehouse: string
  lastRestocked: string
}

export interface UpdateInventoryRequest {
  quantity?: number
  warehouse?: string
}
`,

  'orders/order.types.ts': `/**
 * Order Types
 */

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  shippingAddress: Address
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  total: number
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface CreateOrderRequest {
  items: Array<{
    productId: string
    quantity: number
  }>
  shippingAddress: Address
}
`,

  'orders/payment.types.ts': `/**
 * Payment Types
 */

export interface Payment {
  id: string
  orderId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  createdAt: string
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  method: PaymentMethod
  details: Record<string, unknown>
}
`,

  'orders/shipping.types.ts': `/**
 * Shipping Types
 */

export interface ShippingInfo {
  orderId: string
  trackingNumber: string
  carrier: string
  status: ShippingStatus
  estimatedDelivery: string
  actualDelivery?: string
}

export type ShippingStatus = 'preparing' | 'shipped' | 'in_transit' | 'delivered'

export interface UpdateShippingRequest {
  trackingNumber?: string
  status?: ShippingStatus
}
`,

  'posts/post.types.ts': `/**
 * Post Types
 */

export interface Post {
  id: string
  title: string
  content: string
  authorId: string
  published: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CreatePostRequest {
  title: string
  content: string
  published?: boolean
  tags?: string[]
}

export interface UpdatePostRequest {
  title?: string
  content?: string
  published?: boolean
  tags?: string[]
}
`,

  'posts/comment.types.ts': `/**
 * Comment Types
 */

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCommentRequest {
  postId: string
  content: string
  parentId?: string
}
`,

  'posts/tag.types.ts': `/**
 * Tag Types
 */

export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  count: number
}

export interface CreateTagRequest {
  name: string
  slug: string
  description?: string
}
`,
}

// Index file template
const indexTemplate = (domain: string, files: string[]) => `/**
 * ${domain.charAt(0).toUpperCase() + domain.slice(1)} Types
 *
 * Re-exports all ${domain} types
 */

${files.map(file => `export * from './${file.replace('.ts', '')}'`).join('\n')}
`

const mainIndexTemplate = (domains: string[]) => `/**
 * API Types
 *
 * Centralized re-export of all API types
 */

${domains.map(domain => `export * from './${domain}'`).join('\n')}
`

function setupTypesStructure() {
  console.log('🚀 Setting up organized types structure...\n')

  // Create main directory
  if (!existsSync(TYPES_DIR)) {
    mkdirSync(TYPES_DIR, { recursive: true })
    console.log('✅ Created:', TYPES_DIR)
  }

  // Create subdirectories and files
  for (const [domain, files] of Object.entries(STRUCTURE)) {
    const domainDir = join(TYPES_DIR, domain)

    // Create domain directory
    if (!existsSync(domainDir)) {
      mkdirSync(domainDir, { recursive: true })
      console.log(`✅ Created: ${domainDir}`)
    }

    // Create type files
    for (const file of files) {
      const filePath = join(domainDir, file)
      const templateKey = `${domain}/${file}`

      if (!existsSync(filePath)) {
        const content = templates[templateKey as keyof typeof templates] || `/**\n * ${file}\n */\n\n// Add your types here\n`
        writeFileSync(filePath, content)
        console.log(`  ✅ Created: ${file}`)
      }
    }

    // Create domain index
    const indexPath = join(domainDir, 'index.ts')
    if (!existsSync(indexPath)) {
      const content = indexTemplate(domain, files)
      writeFileSync(indexPath, content)
      console.log(`  ✅ Created: index.ts`)
    }
  }

  // Create main index
  const mainIndexPath = join(TYPES_DIR, 'index.ts')
  if (!existsSync(mainIndexPath)) {
    const content = mainIndexTemplate(Object.keys(STRUCTURE))
    writeFileSync(mainIndexPath, content)
    console.log(`\n✅ Created: ${TYPES_DIR}/index.ts`)
  }

  console.log('\n✅ Types structure setup complete!')
  console.log('\nStructure created:')
  console.log(`
src/lib/api/types/
├── index.ts                      # Main re-export
├── common/
│   ├── index.ts
│   ├── api.types.ts
│   ├── pagination.types.ts
│   └── validation.types.ts
├── users/
│   ├── index.ts
│   ├── user.types.ts
│   ├── auth.types.ts
│   └── profile.types.ts
├── products/
│   ├── index.ts
│   ├── product.types.ts
│   ├── category.types.ts
│   └── inventory.types.ts
├── orders/
│   ├── index.ts
│   ├── order.types.ts
│   ├── payment.types.ts
│   └── shipping.types.ts
└── posts/
    ├── index.ts
    ├── post.types.ts
    ├── comment.types.ts
    └── tag.types.ts
  `)

  console.log('\n📝 Next steps:')
  console.log('1. Review generated files in src/lib/api/types/')
  console.log('2. Customize types to match your backend')
  console.log('3. Import: import type { User } from "@/lib/api/types"')
  console.log('4. See docs: docs/ORGANIZING_TYPES_AT_SCALE.md')
}

// Run if called directly
if (require.main === module) {
  setupTypesStructure()
}

export { setupTypesStructure }

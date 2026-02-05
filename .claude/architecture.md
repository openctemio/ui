# Architecture Deep Dive

> Detailed explanation of project structure and organization principles.

## 📁 Complete Folder Structure

```
my-nextjs-app/
├── app/                                    # Next.js App Router
│   ├── (auth)/                            # Route group: Authentication
│   │   ├── login/
│   │   │   ├── page.tsx                   # /login
│   │   │   └── loading.tsx
│   │   ├── register/
│   │   │   └── page.tsx                   # /register
│   │   ├── layout.tsx                     # Auth layout (centered, minimal)
│   │   └── error.tsx
│   │
│   ├── (dashboard)/                       # Route group: Dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx                   # /dashboard
│   │   ├── users/
│   │   │   ├── page.tsx                   # /users (list)
│   │   │   ├── loading.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx               # /users/[id] (detail)
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx           # /users/[id]/edit
│   │   │   │   └── not-found.tsx
│   │   │   └── new/
│   │   │       └── page.tsx               # /users/new
│   │   ├── products/
│   │   │   └── ...
│   │   ├── layout.tsx                     # Dashboard layout (sidebar, nav)
│   │   └── error.tsx
│   │
│   ├── (marketing)/                       # Route group: Public pages
│   │   ├── page.tsx                       # / (home)
│   │   ├── about/
│   │   │   └── page.tsx                   # /about
│   │   ├── pricing/
│   │   │   └── page.tsx                   # /pricing
│   │   ├── blog/
│   │   │   ├── page.tsx                   # /blog
│   │   │   └── [slug]/
│   │   │       └── page.tsx               # /blog/[slug]
│   │   ├── layout.tsx                     # Marketing layout (header, footer)
│   │   └── loading.tsx
│   │
│   ├── api/                               # API Routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts               # /api/auth/*
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts               # /api/webhooks/stripe
│   │   ├── users/
│   │   │   ├── route.ts                   # GET/POST /api/users
│   │   │   └── [id]/
│   │   │       └── route.ts               # GET/PUT/DELETE /api/users/[id]
│   │   └── health/
│   │       └── route.ts                   # /api/health
│   │
│   ├── layout.tsx                         # Root layout (global)
│   ├── error.tsx                          # Global error boundary
│   ├── not-found.tsx                      # Global 404
│   ├── loading.tsx                        # Global loading
│   ├── template.tsx                       # Re-renders on navigation
│   └── globals.css                        # Global styles + Tailwind
│
├── features/                               # 🎯 Business logic modules
│   ├── auth/
│   │   ├── components/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   ├── logout-button.tsx
│   │   │   ├── auth-provider.tsx
│   │   │   └── password-reset-form.tsx
│   │   ├── actions/
│   │   │   └── auth-actions.ts            # login, register, logout actions
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   └── use-session.ts
│   │   ├── schemas/
│   │   │   └── auth.schema.ts             # loginSchema, registerSchema
│   │   ├── types/
│   │   │   └── auth.types.ts              # User, Session types
│   │   ├── lib/
│   │   │   ├── auth-config.ts
│   │   │   ├── session.ts
│   │   │   └── tokens.ts
│   │   └── index.ts                       # Barrel export
│   │
│   ├── users/
│   │   ├── components/
│   │   │   ├── user-card.tsx
│   │   │   ├── user-form.tsx
│   │   │   ├── user-list.tsx
│   │   │   ├── user-avatar.tsx
│   │   │   ├── user-profile.tsx
│   │   │   ├── create-user-dialog.tsx
│   │   │   ├── edit-user-dialog.tsx
│   │   │   └── delete-user-dialog.tsx
│   │   ├── actions/
│   │   │   └── user-actions.ts            # CRUD operations
│   │   ├── hooks/
│   │   │   ├── use-user.ts
│   │   │   └── use-users.ts
│   │   ├── schemas/
│   │   │   └── user.schema.ts
│   │   ├── types/
│   │   │   └── user.types.ts
│   │   ├── lib/
│   │   │   └── user-utils.ts
│   │   └── index.ts
│   │
│   ├── products/
│   │   └── ... (same structure)
│   │
│   ├── orders/
│   │   └── ... (same structure)
│   │
│   └── analytics/
│       └── ... (same structure)
│
├── components/                             # Shared components
│   ├── ui/                                # Radix UI primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── separator.tsx
│   │   ├── tabs.tsx
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   └── ... (other Radix components)
│   │
│   ├── layouts/                           # Layout components
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   ├── sidebar.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── page-header.tsx
│   │
│   ├── forms/                             # Reusable form components
│   │   ├── form-field.tsx
│   │   ├── form-error.tsx
│   │   ├── form-success.tsx
│   │   ├── form-label.tsx
│   │   └── submit-button.tsx
│   │
│   └── providers/                         # Global providers
│       ├── theme-provider.tsx
│       ├── toast-provider.tsx
│       ├── query-provider.tsx
│       └── auth-provider.tsx
│
├── lib/                                    # Shared utilities
│   ├── utils.ts                           # cn() utility và helpers
│   ├── api-client.ts                      # API client setup
│   ├── constants.ts                       # App constants
│   │
│   ├── db/                                # Database
│   │   ├── index.ts                       # Prisma/Drizzle client
│   │   ├── schema.ts                      # Schema definitions
│   │   └── migrations/
│   │       └── ...
│   │
│   ├── validations/                       # Shared Zod schemas
│   │   ├── common.schema.ts               # Common validators
│   │   └── index.ts
│   │
│   └── services/                          # External services
│       ├── email.service.ts
│       ├── storage.service.ts
│       ├── payment.service.ts
│       ├── analytics.service.ts
│       └── notification.service.ts
│
├── hooks/                                  # Global shared hooks
│   ├── use-mounted.ts
│   ├── use-media-query.ts
│   ├── use-toast.ts
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   ├── use-scroll-position.ts
│   └── use-intersection-observer.ts
│
├── types/                                  # Global TypeScript types
│   ├── index.ts
│   ├── api.types.ts
│   ├── database.types.ts
│   └── globals.d.ts
│
├── config/                                 # Configuration files
│   ├── site.ts                            # Site metadata, SEO
│   ├── nav.ts                             # Navigation configuration
│   ├── dashboard.ts                       # Dashboard config
│   └── marketing.ts                       # Marketing pages config
│
├── styles/                                 # Additional styles
│   └── custom.css                         # Custom CSS if needed
│
├── public/                                 # Static assets
│   ├── images/
│   │   ├── logo.svg
│   │   ├── logo-dark.svg
│   │   └── og-image.jpg
│   ├── fonts/
│   │   └── ... (custom fonts)
│   └── icons/
│       └── ... (icons, favicons)
│
├── .claude/                                # Claude documentation
│   ├── architecture.md                    # This file
│   ├── patterns.md                        # Common patterns
│   └── troubleshooting.md                 # Common issues
│
├── tests/                                  # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                              # Environment variables
├── .env.example                            # Example env file
├── .eslintrc.json                          # ESLint config
├── .prettierrc                             # Prettier config
├── tailwind.config.ts                      # Tailwind config
├── tsconfig.json                           # TypeScript config
├── next.config.js                          # Next.js config
├── package.json
├── claude.md                               # Claude context (main)
└── README.md
```

## 🎯 Folder Responsibilities

### `/app` - Routing Only
**Purpose**: Handle routing, layouts, loading states
**Contains**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, API routes
**Does NOT contain**: Business logic, complex components, data transformations

```tsx
// ✅ Good - Simple, delegates to features
export default async function UsersPage() {
  const users = await getUsers()
  return <UserList users={users} />
}

// ❌ Bad - Too much logic in page
export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  // ... complex logic here
}
```

### `/features` - Business Logic
**Purpose**: Contain ALL code related to a specific feature
**Contains**: Components, actions, hooks, schemas, types, utilities for ONE feature
**Rule**: If it's used only by this feature, it goes here

```
features/users/
├── components/     # User-specific UI components
├── actions/        # User CRUD operations (Server Actions)
├── schemas/        # User validation schemas
├── types/          # User-related types
├── hooks/          # User-specific hooks
├── lib/            # User utilities
└── index.ts        # Public API (barrel export)
```

### `/components` - Shared Only
**Purpose**: Components used across MULTIPLE features
**Contains**: UI primitives, layouts, form helpers, providers
**Does NOT contain**: Feature-specific components

```tsx
// ✅ Good - Generic, reusable
components/ui/button.tsx
components/layouts/site-header.tsx

// ❌ Bad - Feature-specific
components/user-profile.tsx  // → features/users/components/
components/product-card.tsx  // → features/products/components/
```

### `/lib` - Infrastructure
**Purpose**: Shared utilities, database, external services
**Contains**: Database client, API utilities, shared helpers
**Does NOT contain**: Business logic, feature-specific code

## 📋 Decision Tree: Where Does Code Go?

### For Components:
```
Is it used in ONLY ONE feature?
├── YES → features/[feature]/components/
└── NO → Is it a UI primitive?
    ├── YES → components/ui/
    └── NO → Is it a layout?
        ├── YES → components/layouts/
        └── NO → components/ (generic shared)
```

### For Functions/Utilities:
```
Is it used in ONLY ONE feature?
├── YES → features/[feature]/lib/
└── NO → Is it database-related?
    ├── YES → lib/db/
    └── NO → Is it external service?
        ├── YES → lib/services/
        └── NO → lib/utils.ts or lib/[category].ts
```

### For Types:
```
Is it used in ONLY ONE feature?
├── YES → features/[feature]/types/
└── NO → Is it API-related?
    ├── YES → types/api.types.ts
    └── NO → Is it database-related?
        ├── YES → types/database.types.ts
        └── NO → types/index.ts
```

### For Hooks:
```
Is it used in ONLY ONE feature?
├── YES → features/[feature]/hooks/
└── NO → hooks/use-[name].ts
```

## 🚀 Creating a New Feature

### Step 1: Decide if it's a feature
**Ask:**
- Does it have 2+ related components?
- Does it represent a business domain?
- Could it be deployed independently?

**Examples:**
- ✅ `features/auth/` - Authentication domain
- ✅ `features/users/` - User management
- ✅ `features/products/` - Product catalog
- ❌ `features/button/` - Just UI component
- ❌ `features/utils/` - Just utilities

### Step 2: Create feature structure
```bash
mkdir -p features/[feature-name]/{components,actions,hooks,schemas,types,lib}
touch features/[feature-name]/index.ts
```

### Step 3: Create barrel export
```tsx
// features/[feature-name]/index.ts
export { Component1, Component2 } from "./components/[name]"
export { action1, action2 } from "./actions/[name]-actions"
export { schema } from "./schemas/[name].schema"
export type { Type1, Type2 } from "./types/[name].types"
```

### Step 4: Start building
1. Define types in `types/`
2. Create schemas in `schemas/`
3. Build components in `components/`
4. Add actions in `actions/`
5. Create hooks if needed in `hooks/`

## 🔄 Feature Dependencies

### Rule: Minimize Feature-to-Feature Dependencies

```tsx
// ❌ Bad - Direct feature dependency
// features/orders/components/order-card.tsx
import { UserAvatar } from "@/features/users/components/user-avatar"

// ✅ Better - Move to shared
// components/ui/avatar.tsx (generic)
// features/orders/components/order-card.tsx
import { Avatar } from "@/components/ui/avatar"

// ✅ Or: Accept as prop
// features/orders/components/order-card.tsx
interface OrderCardProps {
  order: Order
  userAvatar?: ReactNode // Let parent provide
}
```

### Allowed Dependencies:
```
features/[any]/
├── ✅ Can import from: components/
├── ✅ Can import from: lib/
├── ✅ Can import from: hooks/
├── ✅ Can import from: types/
├── ⚠️ Carefully import: other features/ (explicit dependency)
└── ❌ Never import from: app/ (creates circular dependency)
```

## 🎨 Styling Organization

### CSS Variables
```css
/* app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... theme variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark theme */
}
```

### Component Styles
```tsx
// ✅ Good - Tailwind utilities
<div className="flex items-center gap-4 p-6 rounded-lg">

// ✅ Good - CSS variables
<div className="bg-background text-foreground">

// ⚠️ OK - Custom CSS when necessary
// styles/custom.css
.custom-gradient {
  background: linear-gradient(...);
}
```

## 📊 Import Path Mapping

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/features/*": ["features/*"],
      "@/lib/*": ["lib/*"],
      "@/hooks/*": ["hooks/*"],
      "@/types/*": ["types/*"],
      "@/config/*": ["config/*"]
    }
  }
}
```

## 🔍 Real-World Example

### Scenario: E-commerce App

```
features/
├── auth/              # Login, register, logout
├── users/             # User profiles, settings
├── products/          # Product catalog, details
├── cart/              # Shopping cart
├── checkout/          # Checkout process
├── orders/            # Order history, tracking
├── payments/          # Payment processing
├── reviews/           # Product reviews
└── wishlist/          # User wishlists

components/
├── ui/                # Shared UI components
├── layouts/           # Headers, footers, sidebars
└── forms/             # Form helpers

lib/
├── db/                # Database client
├── services/
│   ├── stripe.service.ts
│   ├── email.service.ts
│   └── storage.service.ts
└── utils.ts
```

### Example: Cart Feature

```tsx
// features/cart/components/cart-item.tsx
"use client"
import { Button } from "@/components/ui/button"
import { removeFromCart } from "../actions/cart-actions"

export function CartItem({ item }) {
  return (
    <div>
      <span>{item.name}</span>
      <Button onClick={() => removeFromCart(item.id)}>
        Remove
      </Button>
    </div>
  )
}

// features/cart/actions/cart-actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function removeFromCart(itemId: string) {
  await db.cartItem.delete({ where: { id: itemId } })
  revalidatePath("/cart")
  return { success: true }
}

// app/(shop)/cart/page.tsx
import { CartList } from "@/features/cart/components/cart-list"

export default async function CartPage() {
  const cartItems = await db.cartItem.findMany()
  return <CartList items={cartItems} />
}
```

## 🎯 Key Principles

1. **Colocate by feature** - Keep related code together
2. **Minimize coupling** - Features should be independent
3. **Clear boundaries** - Know what goes where
4. **Consistency** - Same structure for all features
5. **Scalability** - Easy to add new features
6. **Maintainability** - Easy to find and update code

---

**See also:**
- [patterns.md](patterns.md) - Common code patterns
- [troubleshooting.md](troubleshooting.md) - Common issues
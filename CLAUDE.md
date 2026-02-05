# Project Context - Next.js 16 Application

> **Quick Reference**: Essential project rules. Details in [`.claude/`](.claude/) directory.

## 📋 Project Overview

Modern Next.js 16 with internationalization (en/vi/ar), RTL support, Zustand auth, and shadcn/ui. Feature-based architecture with `src/` directory.

**Status**: Production-ready • TypeScript strict • React Compiler • Turbopack

**CRITICAL: Backend Tenant-Scoped Isolation**

> **Important for API Integration:** This UI connects to a multi-tenant backend API. Every backend repository function that works with tables containing a `tenant_id` column **MUST** enforce tenant-scoped isolation.
>
> - All API calls automatically include tenant context from JWT
> - Backend enforces `WHERE tenant_id = ?` on all data queries
> - This prevents data leakage between tenants
> - Never attempt to access data from other tenants via API
> - Applies to all multi-tenant endpoints (findings, assets, scans, etc.)

**Backend Query Optimization:**

> **Important for API Usage:** All backend database queries are optimized for performance. When using API endpoints:
>
> - Always use pagination parameters (`page`, `limit`) for list endpoints
> - Use filtering and sorting parameters to reduce data transfer
> - Avoid making multiple API calls in loops - use batch endpoints when available
> - Cache frequently accessed data on the frontend when appropriate
> - Be aware of query limits and implement proper error handling

**Frontend Caching Best Practices:**

> **Important:** The UI uses SWR (stale-while-revalidate) for API caching. Follow these guidelines:
>
> 1. **Use SWR hooks for API calls**
>    - Automatic caching, revalidation, and deduplication
>    - Set appropriate `revalidateOnFocus` and `revalidateOnReconnect`
>    - Use `mutate()` to invalidate cache after mutations
> 2. **localStorage caching**
>    - Cache user preferences (theme, language)
>    - Cache permissions for instant UI render (sync with server)
>    - Always set expiration timestamp
>    - Clear on logout
> 3. **When NOT to cache**
>    - Real-time data (scan progress, live updates)
>    - Sensitive data (tokens should be in httpOnly cookies)
>    - Large datasets (use pagination instead)
> 4. **Cache invalidation**
>    ```tsx
>    // After mutation, invalidate related queries
>    const { mutate } = useSWRConfig()
>    await createFinding(data)
>    mutate('/api/v1/findings') // Revalidate list
>    ```

## 🛠️ Tech Stack

**Core:**

- Next.js 16 (App Router, Turbopack, Server Components) • [Docs](https://nextjs.org/docs)
- React 19 with Server Components • [Docs](https://react.dev)
- TypeScript (strict mode)
- Node.js 20+

**UI & Styling:**

- shadcn/ui - Radix UI-based components • [Docs](https://ui.shadcn.com)
- Tailwind CSS with CSS Variables • [Docs](https://tailwindcss.com)
- CVA (class-variance-authority) for variants
- cn() utility for conditional classes
- Geist & Geist Mono fonts

**i18n:**

- Custom proxy (Next.js 16): locale detection
- Locales: `en`, `vi`, `ar`
- RTL: ar, he, fa, ur
- Cookie + header injection

**State & Forms:**

- Zustand → Global state (auth)
- React Context → UI state (theme, direction, layout, search)
- React Hook Form + Zod validation
- Server Actions for mutations

**Dev:**

- ESLint + Prettier
- Path alias: `@/*` → `./src/*`

## 📁 Project Structure

```
project/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                # Route group: auth
│   │   ├── (dashboard)/           # Route group: dashboard
│   │   ├── api/                   # API routes
│   │   ├── providers.tsx          # Providers wrapper
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   │
│   ├── config/                     # 🔧 App-level configuration
│   │   ├── sidebar-data.ts        # Navigation config
│   │   └── index.ts               # Barrel export
│   │
│   ├── features/                   # 🎯 Business logic
│   │   └── [name]/
│   │       ├── components/        # Feature components
│   │       ├── actions/           # Server Actions
│   │       ├── schemas/           # Zod validation
│   │       ├── types/             # Types
│   │       ├── hooks/             # Hooks
│   │       └── lib/               # Utils
│   │
│   ├── components/                 # Shared only
│   │   ├── ui/                    # shadcn/ui
│   │   └── layout/                # Layout components
│   │
│   ├── context/                    # React Context providers
│   ├── stores/                     # Zustand stores
│   ├── lib/                        # Utilities
│   ├── hooks/                      # Global hooks
│   ├── types/                      # Global types
│   └── assets/                     # Static assets
│
├── proxy.ts                        # Next.js 16 Proxy (replaces middleware.ts)
└── public/                         # Static files
```

**See [architecture.md](.claude/architecture.md) for detailed explanation.**

## Test-Driven Development (TDD)

**CRITICAL:** When implementing any new feature or significant change:

1. **Research thoroughly** before writing code
   - Analyze requirements and objectives
   - Identify ALL use cases and edge cases
   - Understand boundary conditions and special scenarios
   - Review existing components and patterns

2. **Write Tests FIRST** before implementation
   - Write tests to cover ALL use cases
   - Write tests for ALL edge cases (loading states, error states, empty states)
   - Tests must fail initially (no implementation yet)
   - Tests must be clear, understandable, and maintainable
   - Test both component behavior and user interactions

3. **Develop the feature** to pass tests
   - Implement code to pass each test
   - Refactor code to improve quality
   - Ensure all tests pass
   - Do not skip any failing tests

**Benefits:**

- Ensures high code coverage
- Catches bugs early
- Components are easier to maintain and refactor
- Tests serve as documentation
- Confidence when changing code

**Testing Approach for UI:**

- **Component Tests**: Test component rendering, props, user interactions
- **Integration Tests**: Test feature workflows (e.g., form submission)
- **E2E Tests**: Test critical user flows (login, dashboard navigation)
- **Accessibility Tests**: Ensure ARIA labels, keyboard navigation work

**Running Tests:**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## ⚡ Core Conventions

### 1. Import Paths

```tsx
// ✅ Always use @/* alias
import { Button } from '@/components/ui/button'
import { createUser } from '@/features/users/actions/user-actions'

// ❌ Never relative from src/
import { Button } from '../../components/ui/button'
```

### 2. Feature Organization

- **Rule**: One feature = one folder in `src/features/`
- Structure: `components/`, `actions/`, `schemas/`, `types/`, `hooks/`, `lib/`
- **If used ONLY in one feature** → put in that feature

### 3. File Naming

```
Components:     user-card.tsx      (kebab-case)
Actions:        user-actions.ts    (suffix: -actions)
Schemas:        user.schema.ts     (suffix: .schema)
Types:          user.types.ts      (suffix: .types)
Hooks:          use-user.ts        (prefix: use-)
```

### 4. Component Types

```tsx
// Default: Server Component (no directive)
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client: "use client" (hooks, events, browser APIs)
"use client"
export function Form() {
  const [state, setState] = useState()
}

// Server Action: "use server" (mutations)
"use server"
export async function create(formData: FormData) {
  await db.create(...)
  revalidatePath("/path")
}
```

### 5. App Router Files

- `page.tsx` - Route content
- `layout.tsx` - Shared UI (persistent)
- `loading.tsx` - Loading state
- `error.tsx` - Error boundary (must be Client)
- `not-found.tsx` - 404 page
- `route.ts` - API endpoint

### 6. Styling

```tsx
import { cn } from "@/lib/utils"

// ✅ Use cn() for conditional classes
<button className={cn(
  "px-4 py-2 rounded-md",
  variant === "primary" && "bg-blue-500",
  className
)}>

// ✅ shadcn/ui with variants
<Button variant="outline" size="lg">Click</Button>

// ✅ Tailwind utilities (no custom CSS unless needed)
// ✅ Mobile-first • CSS variables for theming
// ❌ NO EMOJI in code/JSX (use text or icons)
```

No Emoji Rule:

```tsx
// ❌ WRONG - No emoji in UI
<Button>Save 💾</Button>
<h1>Welcome 👋</h1>

// ✅ CORRECT - Use text or icon components
<Button>Save</Button>
<h1>Welcome</h1>

// ✅ CORRECT - Use icon libraries (lucide-react, etc.)
import { Save } from "lucide-react"
<Button><Save className="mr-2" />Save</Button>
```

### 7. State Management

```tsx
// ✅ Zustand for GLOBAL (auth)
const { user, accessToken, logout } = useAuthStore()

// ✅ Context for UI (theme, direction, layout, search)
const { theme, setTheme } = useTheme()
const { direction } = useDirection()
```

### 8. i18n

```tsx
// Server Component
const locale = (await headers()).get('x-locale') || 'en'

// Client Component (if context created)
const { locale } = useLocale()

// Locales: en, vi, ar • RTL: ar, he, fa, ur
// Cookie + header injection via middleware
```

### 9. Data Fetching

```tsx
// ✅ Server Components (default)
async function getData() {
  return await fetch('...', { next: { revalidate: 3600 } })
}

// ✅ Server Actions (mutations)
"use server"
export async function update(formData: FormData) {
  await db.update(...)
  revalidatePath("/path")
  return { success: true }
}

// ✅ Client (only when needed)
const { data } = useSWR('/api/data')
```

### 10. Validation & Errors

- ✅ Always validate server-side (Zod)
- ✅ Server Actions return: `{ success: boolean, error?: string, data?: T }`
- ✅ Every route group needs `error.tsx`
- ✅ Toast notifications via sonner

## 🎯 When to Create Feature

**✅ Create Feature When:**

- 2+ related components
- Distinct business domain
- Could be independent module
- Examples: auth, users, products, orders

**❌ Don't Create Feature:**

- 1-2 simple components → `components/`
- Pure UI → `components/ui/`
- Utils → `lib/`
- Layouts → `components/layouts/`

## 🌍 Internationalization

**Flow:**

```
Request → Proxy → Cookie/Header → x-locale injection
→ Root layout → dir="ltr|rtl" → Components
```

**Implementation:**

```tsx
// proxy.ts (Next.js 16 - replaces middleware.ts)
export function proxy(request: NextRequest) {
  const locale = getLocale(request)
  const response = NextResponse.next()
  response.cookies.set("locale", locale)
  response.headers.set("x-locale", locale)
  return response
}

// Root layout
const dir = ["ar","he","fa","ur"].includes(locale) ? "rtl" : "ltr"
<html lang={locale} dir={dir}>
```

**See [i18n.md](.claude/i18n.md) for complete guide.**

## 🔐 Authentication

Multi-tenant auth with local, social, and OIDC support. See [auth.md](.claude/auth.md) for complete guide.

**Auth Flow:**

```
Unauthenticated → /login
    ↓ login
No Tenant → /onboarding/create-team
    ↓ create team
Has Tenant → / (Dashboard)
```

**Key Files:**

```
src/features/auth/actions/     # Server actions (login, register, etc.)
src/lib/middleware/auth.ts     # Route protection
src/components/layout/tenant-gate.tsx  # Dashboard guard
proxy.ts                       # Next.js 16 middleware
```

**Important:** After auth changes, use `window.location.href` (not `router.push`) to ensure cookies are picked up.

## 🛡️ Access Control (RBAC)

Simplified permission model. See [access-control.md](.claude/access-control.md) for complete guide.

**Architecture:**

```
User → Membership (owner | member)
     → Roles → Feature Permissions (what can you DO)
     → Groups → Data Scope (what can you SEE)
```

**Key Concepts:**

- **Membership**: Owner (protected, full access) | Member (permissions from roles)
- **RBAC Roles**: Feature permissions (system + custom roles with 150+ permissions)
- **Groups**: Data scoping (teams, departments, projects)

**Invitation Flow:**

```
Invite user → Select RBAC roles → User accepts → Becomes "member" + roles applied
```

**Key Files:**

```
src/features/access-control/        # RBAC feature
src/features/access-control/api/    # Role & Group hooks
src/features/access-control/types/  # Type definitions
```

**Hooks:**

```tsx
// Roles
const { roles } = useRoles() // All available roles
const { roles } = useUserRoles(userId) // User's assigned roles
const { setUserRoles } = useSetUserRoles(userId) // Assign roles

// Groups
const { groups } = useGroups()
const { members } = useGroupMembers(groupId)

// Permissions
const { hasPermission } = useMyPermissions()
if (hasPermission('assets:write')) {
  /* show edit */
}
```

### Permission Real-time Sync

**Important:** Permissions sync in real-time when admin revokes/grants access (no logout/login required).

See [`docs/architecture/permission-realtime-sync.md`](../docs/architecture/permission-realtime-sync.md) for complete implementation guide.

**Key Points:**

- Permissions cached in localStorage for instant UI render
- `X-Permission-Stale` header triggers automatic refresh (immediate)
- Sync triggers:
  - Stale header detected → immediate sync
  - 403 Forbidden error → immediate sync
  - Tab focus → only if tab hidden > 30 seconds (prevents unnecessary calls)
  - Polling → every 2 minutes
- Debounce: minimum 5 seconds between fetches
- PermissionProvider manages cache + version tracking using refs (stable callbacks)

**Usage:**

```tsx
// PermissionProvider wraps app (auto-handles sync)
const { permissions, hasPermission, isLoading } = usePermissions()

// PermissionGate for UI visibility
<PermissionGate permission="assets:write">
  <EditButton />
</PermissionGate>

// API Client intercepts X-Permission-Stale header automatically
```

## 🔔 Notification System

Multi-channel notification system for security alerts. Supports Slack, Teams, Telegram, Email (SMTP), and custom webhooks.

**Key Files:**

```
src/features/notifications/
├── components/
│   ├── add-notification-dialog.tsx    # Create new channel
│   ├── edit-notification-dialog.tsx   # Edit channel settings
│   └── notification-events.tsx        # View sent notifications
src/features/integrations/
├── types/integration.types.ts         # Types & constants
└── api/use-integrations-api.ts        # API hooks
src/app/(dashboard)/settings/integrations/notifications/
├── page.tsx                           # Channel list
├── history/page.tsx                   # Notification events history
└── outbox/page.tsx                    # Queue management
```

**Types:**

```tsx
// Event types for notification routing
type NotificationEventType = 'findings' | 'exposures' | 'scans' | 'alerts'

// All known event types (for UI)
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  DEFAULT_ENABLED_EVENT_TYPES,
} from '@/features/integrations/types/integration.types'

// NotificationExtension from API
interface NotificationExtension {
  enabled_severities?: NotificationSeverity[] // Severity filters
  enabled_event_types?: NotificationEventType[] // Event routing
  message_template?: string // Custom template
  include_details: boolean
  min_interval_minutes: number // Rate limiting
}
// Note: Provider-specific config (chat_id, channel_name, smtp_host) is stored
// in Integration.metadata (non-sensitive) and credentials (sensitive)
```

**Hooks:**

```tsx
// List notification integrations
const { data, isLoading, mutate } = useNotificationIntegrationsApi()

// Create notification integration
const { trigger: create } = useCreateNotificationIntegrationApi()
await create({
  name: 'Security Alerts',
  provider: 'slack',
  credentials: 'https://hooks.slack.com/...',
  notify_on_critical: true,
  enabled_event_types: ['findings', 'exposures'],
})

// Get notification events (audit trail)
const { data: events } = useNotificationEventsApi(integrationId, { limit: 20 })
```

**Template Variables:**
Custom message templates support these variables:

- `{title}` - Notification title
- `{severity}` - Severity level (CRITICAL, HIGH, etc.)
- `{severity_emoji}` - Emoji for severity
- `{body}` - Notification body
- `{url}` - Link to finding/alert
- `{timestamp}` - When sent

### Notification Outbox (Queue Management)

The notification outbox allows tenants to monitor and manage their notification delivery queue.

**Key Files:**

```
src/features/notifications/
├── api/use-notification-outbox-api.ts     # API hooks
├── types/notification-outbox.types.ts     # Types & status configs
src/app/(dashboard)/settings/integrations/notifications/
└── outbox/page.tsx                        # Queue management page
```

**Types:**

```tsx
type OutboxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead'

interface OutboxEntry {
  id: string
  event_type: string
  aggregate_type: string
  title: string
  severity: OutboxSeverity
  status: OutboxStatus
  retry_count: number
  max_retries: number
  last_error?: string
  scheduled_at: string
}

interface OutboxStats {
  pending: number
  processing: number
  completed: number
  failed: number
  dead: number
  total: number
}
```

**Hooks:**

```tsx
// List outbox entries (tenant-scoped)
const { data, isLoading } = useNotificationOutboxApi({ status: 'failed', page: 1 })

// Get outbox statistics
const { data: stats } = useNotificationOutboxStatsApi()

// Retry failed entry
const { trigger: retry } = useRetryOutboxEntryApi(entryId)
await retry()

// Delete entry
const { trigger: del } = useDeleteOutboxEntryApi(entryId)
await del()
```

**Permissions Required:**

- `integrations:notifications:read` for viewing
- `integrations:notifications:write` for retry
- `integrations:notifications:delete` for delete

## 👤 Account Settings

User account management for profile, security, and preferences.

**Key Files:**

```
src/features/account/
├── api/
│   ├── use-profile.ts        # Profile CRUD hooks
│   ├── use-security.ts       # Password, 2FA hooks
│   ├── use-sessions.ts       # Session management
│   └── use-preferences.ts    # User preferences
├── types/
│   └── account.types.ts      # Type definitions
└── index.ts                  # Feature exports

src/app/(dashboard)/account/
├── layout.tsx                # Account layout with tabs
├── page.tsx                  # Profile tab
├── security/page.tsx         # Security tab (password, 2FA, sessions)
├── preferences/page.tsx      # Preferences tab (theme, language, notifications)
└── activity/page.tsx         # Activity log tab
```

**Types:**

```tsx
// User profile
interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string
  phone?: string
  bio?: string
  auth_provider: 'local' | 'google' | 'github' | 'microsoft' | 'saml' | 'oidc'
}

// Session
interface Session {
  id: string
  device: string
  browser: string
  ip_address: string
  is_current: boolean
  last_active_at: string
}

// Preferences
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  email_notifications: EmailNotificationPreferences
  desktop_notifications: boolean
}
```

**Hooks:**

```tsx
// Profile
const { profile, isLoading, mutate } = useProfile()
const { updateProfile, isUpdating } = useUpdateProfile()
const { updateAvatar, removeAvatar } = useUpdateAvatar()

// Security
const { changePassword, isChanging } = useChangePassword()
const { status: twoFactorStatus } = useTwoFactorStatus()

// Sessions
const { sessions, mutate } = useSessions()
const { revokeSession } = useRevokeSession()
const { revokeAllSessions } = useRevokeAllSessions()

// Preferences
const { preferences, mutate } = usePreferences()
const { updatePreferences, isUpdating } = useUpdatePreferences()
```

**API Endpoints:**

| Endpoint                           | Method          | Description        |
| ---------------------------------- | --------------- | ------------------ |
| `/api/v1/users/me`                 | GET/PUT         | Profile CRUD       |
| `/api/v1/users/me/avatar`          | PUT/DELETE      | Avatar management  |
| `/api/v1/users/me/change-password` | POST            | Change password    |
| `/api/v1/users/me/2fa`             | GET/POST/DELETE | 2FA management     |
| `/api/v1/users/me/sessions`        | GET/DELETE      | Session management |
| `/api/v1/users/me/preferences`     | GET/PUT         | User preferences   |

**Navigation:**

- Accessible via profile dropdown (top-right)
- Tab-based navigation: Profile > Security > Preferences > Activity

## 🎨 UI & Theming

```tsx
// Theme
const { theme, setTheme } = useTheme() // "light"|"dark"|"system"

// Direction
const { direction } = useDirection() // "ltr"|"rtl"

// Components
import { Button, Dialog, Input } from '@/components/ui/...'

// Toasts
import { toast } from 'sonner'
toast.success('Done!')
toast.error('Failed!')
```

## 🔧 Project-Specific

**React Compiler:**

- Enabled in `next.config.ts`
- Auto-optimizes → No manual memoization needed

**Providers:**

- Wrapped in `src/app/providers.tsx`
- Order: Theme → Direction → Layout → Search

**TypeScript:**

- Strict mode • Explicit return types
- No `any` (use `unknown`)
- Generate types from DB schema

## 📚 Documentation

**Guides:**

- [architecture.md](.claude/architecture.md) - Structure deep dive
- [auth.md](.claude/auth.md) - Authentication & multi-tenant flow
- [access-control.md](.claude/access-control.md) - RBAC & permissions system
- [account.md](.claude/account.md) - Account settings & preferences
- [patterns.md](.claude/patterns.md) - Code patterns & examples
- [i18n.md](.claude/i18n.md) - Internationalization guide
- [troubleshooting.md](.claude/troubleshooting.md) - Common issues

**External:**

- [Next.js 16](https://nextjs.org/docs) • [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs/) • [Tailwind](https://tailwindcss.com/docs)

## 💡 Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check
npm run validate     # Run type-check + lint (use before commit)
```

## 🔍 MANDATORY: Code Quality Checks

**CRITICAL**: After completing ANY code changes, you MUST run these checks and fix ALL errors before committing:

```bash
# 1. Run type-check and lint - MUST pass with no errors
npm run validate

# 2. If validate passes, run full build to catch any remaining issues
npm run build
```

**Pre-commit hooks will automatically run type-check and ESLint on staged files.**

### Pre-commit Hook (Automatic)

This project uses **Husky + lint-staged** to automatically check code before commits:

- TypeScript type checking runs on all staged files
- ESLint auto-fixes staged `.ts` and `.tsx` files

### Common Issues to Avoid

| Issue                    | Problem       | Solution                                       |
| ------------------------ | ------------- | ---------------------------------------------- |
| **Unused imports**       | Lint warning  | Remove or prefix with `_`                      |
| **Missing type imports** | Build error   | Import all types used in interfaces            |
| **Property mismatch**    | Build error   | Check type definitions before accessing        |
| **Snake vs Camel case**  | Runtime error | UI uses `snake_case`, backend uses `camelCase` |

### Naming Convention for Unused Variables

```tsx
// ✅ Prefix with underscore for intentionally unused
const { data, isLoading: _isLoading } = useQuery()
const [_unused, setUsed] = useState()

// ❌ Don't leave unused without prefix (causes lint warning)
const { data, isLoading } = useQuery() // warning if isLoading not used
```

### Type Safety Tips

```tsx
// ✅ Always import types you use
import type { ScannerType, FindingStatus } from "../types"

// ✅ Use Record for flexible object types
const labels: Record<string, string> = { ... }

// ✅ Add optional chaining for possibly undefined
selectedItem?.property

// ✅ Add null checks before accessing
{selectedItem.tags && selectedItem.tags.map(...)}
```

## 🔄 CI/CD Workflows

### PR to main/develop

```
├── quality (type-check + lint + prettier)  ─┐
└── test                                     ─┴── Done (no build)
```

### Push to main/develop

```
├── quality ─┐
└── test    ─┴── build ── Done
```

### Tag Release (v\*)

```
prepare ── build (amd64) ─┐
         ── build (arm64) ─┴── merge ── Push to Docker Hub
```

**Notes:**

- PRs skip build to save time (quality + test is enough for review)
- Docker builds run in parallel for amd64/arm64
- All builds use GitHub Actions cache for faster subsequent runs

## 🚀 Claude Code Usage

| Task                 | Prompt                                       | Result                      |
| -------------------- | -------------------------------------------- | --------------------------- |
| **New feature**      | "Create feature [name] following structure"  | `src/features/[name]/{...}` |
| **i18n component**   | "Create localized [X] with locale detection" | Includes header reading     |
| **Auth page**        | "Create protected [X] checking auth"         | Includes Zustand check      |
| **Themed component** | "Create [X] with theme support"              | Uses useTheme hook          |
| **Pattern help**     | "Show CRUD pattern"                          | Links to patterns.md        |
| **RTL help**         | "How to handle RTL?"                         | Links to i18n.md            |

## 📝 Commits

```
feat: add user profile page
fix: resolve login redirect issue
docs: update README
style: format code with prettier
refactor: simplify auth logic
perf: optimize image loading
test: add button tests
chore: update dependencies
```

---

## ⚠️ Next.js 16 Breaking Changes

### Proxy replaces Middleware

**IMPORTANT**: Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`.

| Next.js 15                     | Next.js 16                |
| ------------------------------ | ------------------------- |
| `middleware.ts`                | `proxy.ts`                |
| `export function middleware()` | `export function proxy()` |
| Edge Runtime                   | Node.js Runtime           |

**Migration:**

```bash
# Rename file
mv middleware.ts proxy.ts
```

```tsx
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'

// Change function name from middleware → proxy
export function proxy(req: NextRequest) {
  // ... your logic
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

**Best Practices (Next.js 16):**

- Keep `proxy.ts` lightweight - only routing/coarse checks
- NO database calls or JWT verification in proxy
- Detailed auth should be in Server Components/Actions
- Use Node.js compatible libraries (not Edge-only)

**References:**

- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [Auth0: What's New in Next.js 16](https://auth0.com/blog/whats-new-nextjs-16/)

---

**Note**: Keep under 12KB. For patterns, examples, troubleshooting → see `.claude/`

---

**Last Updated**: 2026-01-24

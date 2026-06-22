# UI Project - Next.js 16 Application

> Essential rules and conventions. Detailed guides in [`.claude/`](.claude/) directory.

## Project Overview

Next.js 16 dashboard with locale/RTL **direction** support (en/vi/ar locales are
detected and drive `dir`; a translation layer is NOT yet wired — UI strings are
currently English), Zustand auth, and shadcn/ui.

**Status**: Production-ready | TypeScript strict | Turbopack
(React Compiler is NOT currently enabled — see Tech Stack)

**Multi-tenant**: Backend enforces `WHERE tenant_id = ?` on all queries. JWT includes tenant context automatically. Never attempt cross-tenant API access.

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack, Server Components, `proxy.ts` replaces `middleware.ts`)
- **React 19** with Server Components. NOTE: the React Compiler is **not enabled**
  yet (`next.config.ts` leaves it off; `babel-plugin-react-compiler` is an unused
  devDependency). Manual memoization (`useMemo`/`useCallback`) is therefore
  **load-bearing — do not strip it**. To enable the compiler, wire `reactCompiler`
  in `next.config.ts` and verify the build, then memoization becomes optional.
- **TypeScript** strict mode, no `any` (use `unknown`)
- **shadcn/ui** + Tailwind CSS + CVA + `cn()` utility
- **Zustand** for global state (auth), **React Context** for UI state (theme, direction, layout)
- **React Hook Form + Zod** for forms, **SWR** for API caching
- **ESLint + Prettier**, path alias `@/*` → `./src/*`

---

## Project Structure

```
src/
├── app/                    # App Router (route groups: (auth), (dashboard))
├── config/                 # App-level config (sidebar, etc.)
├── features/[name]/        # Business logic (components/, actions/, schemas/, types/, hooks/, lib/)
├── components/             # Shared components (ui/ = shadcn, layout/)
├── context/                # React Context providers
├── stores/                 # Zustand stores
├── lib/                    # Utilities
├── hooks/                  # Global hooks
├── types/                  # Global types
└── assets/                 # Static assets
proxy.ts                    # Next.js 16 Proxy (locale detection, routing)
```

See [architecture.md](.claude/architecture.md) for details.

---

## TDD — Write Tests First

**CRITICAL:** For new features: Research → Write tests first (all edge cases) → Implement → All tests pass.

- Component tests, integration tests, E2E tests, accessibility tests
- `npm test`, `npm test -- --watch`, `npm test -- --coverage`

---

## MANDATORY: Quality Checks

```bash
npm run validate    # type-check + lint (run before every commit)
npm run build       # Full build to catch remaining issues
```

Pre-commit hooks (Husky + lint-staged) run automatically on staged files.

---

## Core Conventions

### Imports — always `@/*` alias

```tsx
import { Button } from '@/components/ui/button' // GOOD
import { Button } from '../../components/ui/button' // BAD
```

### File Naming

```
Components: user-card.tsx    Actions: user-actions.ts    Schemas: user.schema.ts
Types: user.types.ts         Hooks: use-user.ts
```

### Component Types

- **Server Component** (default) — no directive, can `await` data
- **Client Component** — `"use client"` for hooks, events, browser APIs
- **Server Action** — `"use server"` for mutations, call `revalidatePath` after

### Features

Create a `src/features/[name]/` folder when: 2+ related components, distinct business domain, could be independent module.

### Styling

- `cn()` for conditional classes, shadcn/ui variants, Tailwind utilities
- Mobile-first, CSS variables for theming
- **NO emoji in code/JSX** — use text or icon components (lucide-react)

### State Management

- **Zustand** → global (auth): `useAuthStore()`
- **Context** → UI (theme, direction, layout, search): `useTheme()`, `useDirection()`

### i18n

- Locales: `en`, `vi`, `ar` | RTL: `ar`, `he`, `fa`, `ur`
- Server: `(await headers()).get('x-locale') || 'en'`
- See [i18n.md](.claude/i18n.md) for complete guide

### Data Fetching

- Server Components for reads (default), Server Actions for mutations
- SWR for client-side fetching, `mutate()` to invalidate after mutations
- Always use pagination params (`page`, `limit`) on list endpoints

### Validation

- Zod schemas for all server-side validation
- Server Actions return `{ success: boolean, error?: string, data?: T }`
- Every route group needs `error.tsx`
- Toast via `sonner`

---

## Auth Flow

```
Unauthenticated → /login → No Tenant → /onboarding/create-team → Dashboard
```

After auth changes, use `window.location.href` (not `router.push`) to pick up cookies.
See [auth.md](.claude/auth.md) for details.

### CSRF (double-submit cookie)

All state-changing requests from the browser must carry an `X-CSRF-Token` header matching the `csrf_token` cookie. `src/lib/api/client.ts` does this automatically (reads cookie, attaches header on POST/PUT/PATCH/DELETE). The Next.js proxy route `src/app/api/v1/[...path]/route.ts` forwards both `refresh_token` and `csrf_token` cookies to the backend. If you bypass the shared client (raw `fetch`) on a mutating endpoint, you MUST add the header yourself — otherwise the backend returns `403 csrf_token_missing_header`.

### Markdown sanitisation

Rendered markdown (notes, finding descriptions, etc.) goes through `src/lib/sanitize-markdown.ts` wired as a `rehypeRewrite` plugin on the markdown editor. It strips `<script>/<iframe>/<object>/<embed>/<style>/<link>/<meta>/<base>/<form>`, `on*` handlers, inline `style`, and `javascript:`/`data:`/`vbscript:` URLs. Do not disable it. If you need to render a new dangerous-looking tag, extend the allowlist in that file and add a test case in `sanitize-markdown.test.ts`.

## Access Control (RBAC)

```
User → Membership (owner | member) → Roles → Permissions (DO) → Groups → Data Scope (SEE)
```

```tsx
const { hasPermission } = useMyPermissions()
<PermissionGate permission="assets:write"><EditButton /></PermissionGate>
```

Permissions sync in real-time via `X-Permission-Stale` header. See [access-control.md](.claude/access-control.md).

---

## Next.js 16 Breaking Change

`middleware.ts` → `proxy.ts`, `export function middleware()` → `export function proxy()`. Node.js runtime (not Edge). Keep proxy lightweight — no DB calls or JWT verification.

---

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check
npm run validate     # type-check + lint
```

## Commits

`feat:` `fix:` `docs:` `style:` `refactor:` `perf:` `test:` `chore:` — No Co-Authored-By lines.

---

## Detailed Guides

- [architecture.md](.claude/architecture.md) — Structure deep dive
- [auth.md](.claude/auth.md) — Authentication & multi-tenant flow
- [access-control.md](.claude/access-control.md) — RBAC & permissions
- [account.md](.claude/account.md) — Account settings
- [patterns.md](.claude/patterns.md) — Code patterns & examples
- [i18n.md](.claude/i18n.md) — Internationalization
- [troubleshooting.md](.claude/troubleshooting.md) — Common issues

---

**Last Updated**: 2026-03-17

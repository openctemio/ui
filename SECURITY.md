# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at OpenCTEM. If you discover a security vulnerability, please follow responsible disclosure practices.

### DO NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed
- Exploit the vulnerability beyond what is necessary to demonstrate it

### DO

1. **Email us directly** at security@openctem.io with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

2. **Use our bug bounty program** (if available) through:
   - [HackerOne](https://hackerone.com/openctemio) (coming soon)

### Response Timeline

| Severity | Acknowledgment  | Resolution Target |
| -------- | --------------- | ----------------- |
| Critical | 24 hours        | 24-72 hours       |
| High     | 48 hours        | 1-2 weeks         |
| Medium   | 5 business days | 2-4 weeks         |
| Low      | 5 business days | Next release      |

---

## Security Architecture Overview

```
Browser                          Next.js Server                    Backend API
  |                                   |                                |
  |-- (1) Login (email/password) ---->|                                |
  |                                   |-- POST /api/v1/auth/login ---->|
  |                                   |<-- { refresh_token, tenants } -|
  |                                   |                                |
  |                                   |-- POST /api/v1/auth/token ---->|
  |                                   |<-- { access_token, exp } ------|
  |                                   |                                |
  |<-- Set-Cookie: auth_token (httpOnly, secure, sameSite=lax) --------|
  |<-- Set-Cookie: refresh_token (httpOnly, secure, sameSite=lax) -----|
  |<-- access_token (in JSON response body, stored in Zustand) --------|
  |                                   |                                |
  |-- API request /api/v1/findings -->|                                |
  |   (cookie sent automatically)     |-- reads httpOnly cookie ------>|
  |                                   |-- Authorization: Bearer JWT -->|
  |                                   |<-- JSON response --------------|
  |<-- JSON response (no token) ------|                                |
```

---

## 1. Authentication

### 1.1 Dual-Token Strategy

| Token              | Storage                     | Lifetime                            | Access           |
| ------------------ | --------------------------- | ----------------------------------- | ---------------- |
| Access Token (JWT) | In-memory via Zustand store | ~15 min (from backend `expires_in`) | JavaScript only  |
| Refresh Token      | httpOnly secure cookie      | 7 days (`COOKIE_MAX_AGE`)           | Server-side only |

**Key implementation details** (`src/stores/auth-store.ts`):

- Access token stored exclusively in Zustand state. Never persisted to cookies, localStorage, or sessionStorage.
- JWT decoded client-side via `atob()` to extract user claims (`sub`, `email`, `permissions`, `tenant_id`, `tenant_role`). **No signature verification on client** -- verification is done server-side at the backend API.
- Zustand devtools disabled in production (`enabled: process.env.NODE_ENV === 'development'`).

### 1.2 Token Refresh

- Auto-refresh triggers `TOKEN_REFRESH_BEFORE_EXPIRY` seconds before expiration (default: 300s = 5 minutes).
- Calls `POST /api/auth/refresh` with `credentials: 'include'` (sends httpOnly cookie).
- **Mutex-protected**: `isRefreshingToken` flag prevents concurrent refresh attempts.
- **Permanent failure flag**: `authPermanentlyFailed` prevents infinite refresh loops. On failure, clears all auth state and redirects to login.
- Token size monitored: logs warning when JWT approaches 4KB cookie limit.

### 1.3 Same-Origin API Proxy

All client-side API requests go through the Next.js API proxy route (`src/app/api/v1/[...path]/route.ts`), not directly to the backend:

1. Browser sends request to `/api/v1/*` (same-origin, cookie sent automatically).
2. Proxy reads `auth_token` from httpOnly cookie.
3. Proxy forwards request to backend with `Authorization: Bearer <token>` header.
4. If 401: proxy auto-refreshes token and retries once.
5. Response returned to browser without exposing the token.

**Benefits**: Eliminates CORS issues, tokens never appear in client JavaScript for API calls, backend URL hidden from browser.

### 1.4 Cookie Configuration

All auth cookies are set with:

```
httpOnly: true
secure: true (when NODE_ENV === 'production')
sameSite: 'lax'
path: '/'
```

**Complete cookie inventory:**

| Cookie                | httpOnly | Sensitive | Purpose                              |
| --------------------- | -------- | --------- | ------------------------------------ |
| `auth_token`          | Yes      | Yes       | JWT access token                     |
| `refresh_token`       | Yes      | Yes       | Refresh token                        |
| `oauth_state`         | Yes      | Yes       | OAuth CSRF state parameter           |
| `oauth_redirect`      | Yes      | No        | Post-OAuth redirect URL              |
| `csrf_token`          | Yes      | Yes       | CSRF protection token                |
| `app_tenant`          | No       | No        | Current tenant info (display only)   |
| `app_user_info`       | No       | No        | User info for onboarding (5-min TTL) |
| `app_pending_tenants` | No       | No        | Multi-tenant selection (5-min TTL)   |
| `locale`              | No       | No        | Language preference                  |
| `theme`               | No       | No        | Theme preference                     |

### 1.5 Login Flow

1. User submits credentials to Server Action (`loginAction`).
2. Server Action calls backend `POST /api/v1/auth/login`.
3. Backend returns `refresh_token` + list of tenant memberships.
4. If single tenant: exchanges refresh token for tenant-scoped access token via `POST /api/v1/auth/token`.
5. If multiple tenants: stores tenant list in non-httpOnly cookie for selection UI.
6. If zero tenants: redirects to team creation onboarding.
7. Access token returned in response body (stored in Zustand), refresh token set as httpOnly cookie.

### 1.6 Logout

`logoutAction()` clears ALL auth cookies (`auth_token`, `refresh_token`, `app_tenant`, `app_user_info`, `app_pending_tenants`) and redirects to `/login`.

### 1.7 OAuth (Social Login)

- Supported providers: Google, GitHub, Microsoft.
- **CSRF protection**: Random `state` parameter stored in httpOnly `oauth_state` cookie, validated on callback.
- Token flow follows same httpOnly cookie pattern as local auth.

### 1.8 Email Enumeration Prevention

`forgotPasswordAction()` always returns `{ success: true }` regardless of whether the email exists in the system.

---

## 2. Authorization (RBAC)

### 2.1 Permission Model

- 150+ permissions defined in `src/lib/permissions/constants.ts`.
- Hierarchical format: `{module}:{subfeature}:{action}` (e.g., `assets:groups:write`).
- **Permissions are the source of truth from the API** -- no client-side bypass for Owner/Admin roles.

### 2.2 Real-Time Permission Sync

The `PermissionProvider` (`src/context/permission-provider.tsx`) keeps permissions in sync:

| Trigger                     | Condition                    | Behavior                                 |
| --------------------------- | ---------------------------- | ---------------------------------------- |
| Initial load                | Always                       | Fetch from `/api/v1/me/permissions/sync` |
| `X-Permission-Stale` header | API response includes header | Immediate refetch                        |
| 403 Forbidden               | API returns 403              | Immediate refetch                        |
| Tab focus                   | Tab hidden > 30 seconds      | Refetch                                  |
| Polling                     | Every 2 minutes              | Refetch if stale                         |

- **Debounce**: Minimum 5 seconds between API calls.
- **ETag support**: Conditional `If-None-Match` requests to reduce bandwidth.
- **localStorage cache**: Permissions cached for instant UI render on page reload. Cleared on logout via `clearAllStoredPermissions()`.

### 2.3 UI Permission Gating

```tsx
// Hide element if user lacks permission
<Can permission="assets:write">
  <EditButton />
</Can>

// Show disabled element with tooltip
<Can permission="assets:delete" behavior="disable">
  <DeleteButton />
</Can>
```

### 2.4 Multi-Tenant Isolation

- JWT contains `tenant_id` claim scoping all API requests.
- Backend enforces `WHERE tenant_id = ?` on all data queries.
- Permission cache keys include tenant ID to prevent cross-tenant data leaks.
- Team switching exchanges tokens via `POST /api/auth/switch-team`.

---

## 3. Route Protection

### 3.1 Default-Deny Model

The Next.js 16 proxy (`proxy.ts`) uses `handleAuth()` from `src/lib/middleware/auth.ts`:

- **All routes require authentication by default.**
- Public routes explicitly whitelisted: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/auth/error`.
- API routes (`/api/*`) handled separately.
- Authenticated users redirected away from auth pages.

### 3.2 Open Redirect Prevention

`validateRedirectUrl()` ensures redirect targets:

- Start with `/` (relative path) but not `//` (protocol-relative, which could redirect to external domains).
- Or match the `NEXT_PUBLIC_APP_URL` origin exactly.
- Falls back to `/dashboard` if validation fails.

### 3.3 Authentication Check

The proxy checks for cookie **existence** only (not validity). JWT signature verification happens at the backend API layer. This keeps the proxy lightweight and avoids duplicating verification logic.

---

## 4. Security Headers

Configured in `next.config.ts`, applied to all routes via `/:path*`:

### 4.1 Response Headers

| Header                   | Value                                      | Purpose                     |
| ------------------------ | ------------------------------------------ | --------------------------- |
| `X-Frame-Options`        | `DENY`                                     | Prevents clickjacking       |
| `X-Content-Type-Options` | `nosniff`                                  | Prevents MIME type sniffing |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          | Limits referrer leakage     |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` | Restricts browser APIs      |

### 4.2 Content Security Policy

| Directive         | Value                                                 | Notes                                   |
| ----------------- | ----------------------------------------------------- | --------------------------------------- |
| `default-src`     | `'self'`                                              | Baseline restriction                    |
| `script-src`      | `'self' 'unsafe-eval' 'unsafe-inline'`                | Required by Next.js compiler            |
| `style-src`       | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Tailwind CSS + Google Fonts             |
| `style-src-elem`  | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Google Fonts stylesheets                |
| `img-src`         | `'self' data: https:`                                 | Allows HTTPS images for avatars/uploads |
| `font-src`        | `'self' data: https://fonts.gstatic.com`              | Google Fonts files                      |
| `connect-src`     | `'self' https://*.openctem.io wss://*.openctem.io`    | API + WebSocket connections             |
| `frame-ancestors` | `'none'`                                              | Double protection with X-Frame-Options  |
| `base-uri`        | `'self'`                                              | Prevents base tag injection             |
| `form-action`     | `'self'`                                              | Restricts form submission targets       |

**Known trade-offs:**

- `unsafe-eval` and `unsafe-inline` in `script-src` are required by the Next.js compiler. Mitigated by strict `frame-ancestors 'none'` and `base-uri 'self'`. Nonce-based CSP should be explored in future versions.
- `img-src https:` allows images from any HTTPS source (needed for user avatars and external content).

---

## 5. WebSocket & SSE Security

### 5.1 Same-Origin WebSocket

For same-origin WebSocket connections, httpOnly cookies are sent automatically during the upgrade handshake. No additional token is needed.

### 5.2 Cross-Origin WebSocket

For cross-origin connections (`src/context/websocket-provider.tsx`):

1. Client fetches token from `/api/ws-token` (authenticated endpoint, reads httpOnly cookie).
2. Token appended as query parameter: `wss://api.example.com/ws?token=<jwt>`.
3. Protocol auto-selects `wss:` for HTTPS origins, `ws:` for HTTP.

**Trade-off**: JWT appears in URL for cross-origin WebSocket (common pattern due to WebSocket API limitations). The `/api/ws-token` endpoint only returns the token to the same browser session that owns the httpOnly cookie.

### 5.3 SSE Token

Same pattern as WebSocket. Endpoint at `/api/auth/sse-token` returns access token for Server-Sent Events connections. Auto-refreshes if access token expired.

---

## 6. CSRF Protection

- **OAuth flows**: Protected via random `state` parameter stored in httpOnly cookie.
- **API mutations**: Protected by same-origin proxy pattern. All API calls go through `/api/v1/*` (same-origin), so browsers enforce same-origin policy automatically.
- **CSRF token**: `generateCsrfToken()` in `src/lib/cookies-server.ts` generates tokens stored in httpOnly, secure, sameSite=strict cookies. The proxy forwards `x-csrf-token` headers to the backend.

---

## 7. Input Validation

### 7.1 Schema Validation (Zod)

All forms use Zod schemas (`src/features/*/schemas/`) for:

- Client-side validation (immediate UX feedback via React Hook Form).
- Server-side validation (Server Actions re-validate before processing).

### 7.2 Authentication Schemas

| Field            | Validation                      |
| ---------------- | ------------------------------- |
| Email            | Non-empty + valid email format  |
| Password         | Minimum 8 characters            |
| First/Last Name  | 1-50 characters                 |
| Confirm Password | Must match password field       |
| Reset Token      | Non-empty string                |
| OAuth State      | Validated against stored cookie |

### 7.3 TypeScript Strict Mode

- `strict: true` in `tsconfig.json` -- no implicit `any`, strict null checks.
- `no-explicit-any` ESLint rule enforced (except test files).

---

## 8. Environment Variables

### 8.1 Public Variables (`NEXT_PUBLIC_*`)

Baked into the client bundle at build time. Safe to expose:

| Variable                          | Default                 | Purpose                               |
| --------------------------------- | ----------------------- | ------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | `http://localhost:3000` | Frontend URL                          |
| `NEXT_PUBLIC_AUTH_PROVIDER`       | `local`                 | Auth mode (`local`, `oidc`, `hybrid`) |
| `NEXT_PUBLIC_WS_BASE_URL`         | (empty)                 | WebSocket URL (if cross-origin)       |
| `NEXT_PUBLIC_SSE_BASE_URL`        | (empty)                 | SSE URL (if cross-origin)             |
| `NEXT_PUBLIC_AUTH_COOKIE_NAME`    | `auth_token`            | Access token cookie name              |
| `NEXT_PUBLIC_REFRESH_COOKIE_NAME` | `refresh_token`         | Refresh token cookie name             |

### 8.2 Server-Only Variables

Never exposed to the browser:

| Variable                      | Default                 | Purpose                                                                          |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `BACKEND_API_URL`             | `http://localhost:8080` | Backend API URL                                                                  |
| `SECURE_COOKIES`              | `false`                 | Secure flag on cookies (overridden to `true` in production via `NODE_ENV` check) |
| `CSRF_SECRET`                 | (empty)                 | CSRF token signing key                                                           |
| `COOKIE_MAX_AGE`              | `604800` (7 days)       | Refresh token cookie lifetime                                                    |
| `ENABLE_TOKEN_REFRESH`        | `true`                  | Enable auto token refresh                                                        |
| `TOKEN_REFRESH_BEFORE_EXPIRY` | `300` (5 min)           | Refresh trigger threshold                                                        |

### 8.3 Validation

`validateEnv()` in `next.config.ts` validates required variables at build time. Warns on missing optional variables. Skipped during Docker builds (`CI=true`).

---

## 9. Docker Security

**File**: `Dockerfile`

| Layer             | Security Measure                                                     |
| ----------------- | -------------------------------------------------------------------- |
| Base image        | `node:25-alpine` (minimal attack surface)                            |
| Multi-stage build | Dev dependencies excluded from production image                      |
| Non-root user     | Production runs as `nextjs` (UID 1001)                               |
| Standalone output | Minimal file footprint in final image                                |
| Telemetry         | `NEXT_TELEMETRY_DISABLED=1`                                          |
| Health check      | `wget --spider http://localhost:3000/api/health`                     |
| Build args        | `NEXT_PUBLIC_*` vars baked at build, server vars injected at runtime |

---

## 10. CI/CD Security

### 10.1 Security Scanning (`security.yml`)

Runs on: push/PR to main/develop + weekly (Monday 00:00 UTC)

| Scanner               | Type       | Severity                           | Output                                          |
| --------------------- | ---------- | ---------------------------------- | ----------------------------------------------- |
| **CodeQL**            | SAST       | `security-and-quality` query suite | GitHub Security tab (SARIF)                     |
| **npm audit**         | SCA        | HIGH+                              | Artifact upload (30-day retention)              |
| **Trivy**             | Filesystem | CRITICAL, HIGH, MEDIUM             | GitHub Security tab (SARIF)                     |
| **ESLint**            | SAST       | All rules                          | GitHub Security tab (SARIF)                     |
| **Gitleaks**          | Secrets    | All                                | Optional (requires `ENABLE_GITLEAKS` + license) |
| **Snyk**              | SCA        | All                                | Optional (requires `ENABLE_SNYK` + token)       |
| **Docker Image Scan** | Container  | CRITICAL, HIGH                     | Trivy on built image (main branch only)         |

### 10.2 Quality Gates (`ci.yml`)

| Check        | Tool              | Blocks PR |
| ------------ | ----------------- | --------- |
| Type safety  | `tsc --noEmit`    | Yes       |
| Code quality | ESLint            | Yes       |
| Formatting   | Prettier          | Yes       |
| Unit tests   | Vitest + coverage | Yes       |
| Build        | `next build`      | Push only |

### 10.3 Pre-commit Hooks (Husky + lint-staged)

Automatically run on `git commit`:

- TypeScript type checking on all staged files.
- ESLint auto-fix on staged `.ts`/`.tsx` files.
- Prettier formatting on staged files.

### 10.4 Dependency Management (Dependabot)

- Weekly updates for npm, GitHub Actions, Docker base images.
- Grouped updates: React, Next.js, testing, linting, Tailwind, Radix UI, TypeScript.
- Major versions blocked by default (security updates still allowed).
- Review assigned to `openctemio/security` team.

---

## 11. Development Security

### 11.1 Dev Auth Bypass

A development-only auth bypass exists in `src/lib/dev-auth.ts`:

- Enabled **only** when `NODE_ENV === 'development'`.
- Uses hardcoded dev credentials (`admin@openctem.io`).
- Sets a `dev_auth_token` cookie (non-httpOnly) accepted by the middleware.
- **Completely disabled in production** via `NODE_ENV` guard.

### 11.2 Error Message Handling

The API error handler (`src/lib/api/error-handler.ts`) maps backend errors to user-friendly messages. Backend messages shorter than 100 characters and not containing internal markers are passed through. Sensitive errors (500s, auth failures) are replaced with generic messages.

---

## 12. Secure Development Guidelines for Contributors

### Must Do

1. **Never commit secrets** -- Use `.env.local` (gitignored), not `.env`.
2. **Validate all inputs** with Zod schemas in both client and server.
3. **Use Server Components** by default to reduce client-side attack surface.
4. **Use `window.location.href`** (not `router.push`) after auth changes to ensure cookies are picked up.
5. **No `any` types** -- Use `unknown` and narrow with type guards.
6. **Run `npm run validate`** before every commit (type-check + lint + format).

### Must Not

1. **Never store tokens in localStorage or sessionStorage** -- Use Zustand store (memory only).
2. **Never use `dangerouslySetInnerHTML`** without sanitization.
3. **Never add `NEXT_PUBLIC_` prefix** to secret environment variables.
4. **Never bypass the API proxy** for authenticated requests (except file uploads which use XHR with in-memory token).
5. **Never hardcode credentials** outside of dev-only guarded code.

### Cookie Rules

- Sensitive cookies: Always `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`.
- Client-accessible cookies: Only for non-sensitive data (locale, theme, tenant display info).
- The `authTokenCookie.set()` client-side method is deliberately blocked and logs an error.

---

## 13. Known Trade-offs & Hardening Roadmap

### Current Trade-offs

| Item                              | Status      | Rationale                                                                                     |
| --------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| CSP `unsafe-eval`/`unsafe-inline` | Required    | Next.js compiler dependency. Mitigated by `frame-ancestors 'none'` and `base-uri 'self'`.     |
| WebSocket token in URL query      | Accepted    | WebSocket API cannot send custom headers. Token scoped to same session via httpOnly endpoint. |
| Password policy (8 chars minimum) | Intentional | Backend enforces additional policies. Client-side strength meter provides guidance.           |
| `img-src https:` wildcard         | Accepted    | Required for user avatars and external content.                                               |

### Hardening Roadmap

- [ ] Nonce-based CSP to eliminate `unsafe-inline`/`unsafe-eval`
- [ ] Environment-conditional CSP `connect-src` (strip localhost in production)
- [ ] Upgrade CSRF token generation to `crypto.randomBytes()`
- [ ] Client-side rate limiting for login attempts (config exists at `SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS: 5` but not yet enforced)
- [ ] Subresource Integrity (SRI) for external resources

---

## 14. Compliance Targets

- OWASP Top 10 (actively addressed)
- CWE/SANS Top 25 (actively addressed)
- SOC 2 Type II (planned)
- ISO 27001 (planned)

---

## Contact

- **Security Team**: security@openctem.io
- **General Issues**: https://github.com/openctemio/ui/issues

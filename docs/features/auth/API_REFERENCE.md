# API Reference

Complete API documentation for Keycloak authentication library.

## Table of Contents

- [Environment (`@/lib/env`)](#environment-libenv)
- [Keycloak Client (`@/lib/keycloak`)](#keycloak-client-libkeycloak)
- [JWT Utilities (`@/lib/keycloak/jwt`)](#jwt-utilities-libkeycloakjwt)
- [Cookies Client (`@/lib/cookies`)](#cookies-client-libcookies)
- [Cookies Server (`@/lib/cookies-server`)](#cookies-server-libcookies-server)
- [Auth Store (`@/stores/auth-store`)](#auth-store-storesauth-store)
- [Types](#types)

---

## Environment (`@/lib/env`)

Type-safe access to environment variables.

### Public Variables (`env`)

```typescript
import { env } from '@/lib/env'

// Keycloak Configuration
env.keycloak.url: string          // Keycloak server URL
env.keycloak.realm: string        // Realm name
env.keycloak.clientId: string     // Client ID
env.keycloak.redirectUri: string  // OAuth callback URL

// Token Storage
env.auth.cookieName: string          // Access token cookie name
env.auth.refreshCookieName: string   // Refresh token cookie name

// API Configuration
env.api.url: string       // Backend API URL
env.api.timeout: number   // Request timeout (ms)

// Application
env.app.url: string       // App base URL
env.app.env: 'development' | 'production' | 'test'
```

### Server Variables (`serverEnv`)

⚠️ Server-side only!

```typescript
import { serverEnv } from '@/lib/env'

// Keycloak secrets
serverEnv.keycloak.clientSecret: string

// Security
serverEnv.security.secureCookies: boolean
serverEnv.security.csrfSecret: string

// Token management
serverEnv.token.cookieMaxAge: number
serverEnv.token.enableRefresh: boolean
serverEnv.token.refreshBeforeExpiry: number

// API
serverEnv.api.url: string
```

### Functions

#### `validateEnv()`

Validates all required environment variables at build time.

```typescript
import { validateEnv } from '@/lib/env'

// In next.config.ts
validateEnv() // Throws error if missing required vars
```

#### Helper Functions

```typescript
import { isProduction, isDevelopment, isServer, isClient } from '@/lib/env'

isProduction()  // true if NODE_ENV === 'production'
isDevelopment() // true if NODE_ENV === 'development'
isServer()      // true if running on server
isClient()      // true if running on client
```

---

## Keycloak Client (`@/lib/keycloak`)

Client-side Keycloak OAuth2/OIDC functions.

### URL Builders

#### `getKeycloakUrls()`

Returns all Keycloak endpoint URLs.

```typescript
import { getKeycloakUrls } from '@/lib/keycloak'

const urls = getKeycloakUrls()
// {
//   authorization: string
//   token: string
//   userInfo: string
//   logout: string
//   endSession: string
//   jwks: string
//   introspection: string
//   revocation: string
// }
```

#### `buildAuthorizationUrl(options?)`

Builds Keycloak authorization URL.

```typescript
import { buildAuthorizationUrl } from '@/lib/keycloak'

const url = buildAuthorizationUrl({
  scope: 'openid profile email',
  state: 'custom-state',
  prompt: 'login',
})
```

**Parameters:**
- `options?: Partial<KeycloakAuthParams>`

**Returns:** `string` - Full authorization URL

### Authentication Flow

#### `redirectToLogin(returnUrl?)`

Redirects to Keycloak login page.

```typescript
import { redirectToLogin } from '@/lib/keycloak'

redirectToLogin('/dashboard') // Return to /dashboard after login
```

**Parameters:**
- `returnUrl?: string` - URL to return to after login

#### `redirectToRegister()`

Redirects to Keycloak registration page.

```typescript
import { redirectToRegister } from '@/lib/keycloak'

redirectToRegister()
```

#### `redirectToLogout(options?)`

Redirects to Keycloak logout endpoint.

```typescript
import { redirectToLogout } from '@/lib/keycloak'

redirectToLogout({
  post_logout_redirect_uri: 'https://yourapp.com',
})
```

**Parameters:**
- `options?: KeycloakLogoutParams`

### Token Operations

#### `exchangeCodeForTokens(code)`

Exchange authorization code for tokens.

⚠️ **Security Note**: In production, do this server-side to protect client_secret.

```typescript
import { exchangeCodeForTokens } from '@/lib/keycloak'

const tokens = await exchangeCodeForTokens(code)
// {
//   access_token: string
//   refresh_token: string
//   expires_in: number
//   refresh_expires_in: number
//   token_type: 'Bearer'
//   id_token?: string
// }
```

**Parameters:**
- `code: string` - Authorization code from callback

**Returns:** `Promise<KeycloakTokenResponse>`

#### `fetchUserInfo(accessToken)`

Fetch user info from Keycloak UserInfo endpoint.

```typescript
import { fetchUserInfo } from '@/lib/keycloak'

const userInfo = await fetchUserInfo(accessToken)
// {
//   sub: string
//   email: string
//   name: string
//   ...
// }
```

**Parameters:**
- `accessToken: string` - Valid access token

**Returns:** `Promise<KeycloakUserInfo>`

### State Validation

#### `validateState(receivedState)`

Validates OAuth2 state parameter (CSRF protection).

```typescript
import { validateState } from '@/lib/keycloak'

const isValid = validateState(stateFromUrl)
// true if valid, false otherwise
```

#### `getReturnUrl()`

Gets stored return URL from sessionStorage.

```typescript
import { getReturnUrl } from '@/lib/keycloak'

const returnUrl = getReturnUrl() // '/dashboard' or null
```

#### `generateState()` / `generateNonce()`

Generate random state/nonce for OAuth2.

```typescript
import { generateState, generateNonce } from '@/lib/keycloak'

const state = generateState() // Random UUID
const nonce = generateNonce() // Random UUID
```

### Callback Handling

#### `isOAuthCallback()`

Checks if current URL is OAuth callback.

```typescript
import { isOAuthCallback } from '@/lib/keycloak'

if (isOAuthCallback()) {
  // Handle callback
}
```

#### `getCallbackParams()`

Extracts OAuth parameters from URL.

```typescript
import { getCallbackParams } from '@/lib/keycloak'

const { code, state, error, error_description } = getCallbackParams()
```

#### `clearCallbackParams()`

Removes OAuth parameters from URL without reload.

```typescript
import { clearCallbackParams } from '@/lib/keycloak'

clearCallbackParams() // Clean URL
```

---

## JWT Utilities (`@/lib/keycloak/jwt`)

JWT decoding, validation, and user extraction.

### Decoding

#### `decodeJWT<T>(token)`

Decodes JWT without verification.

⚠️ **Warning**: Does NOT verify signature. Use only for reading claims.

```typescript
import { decodeJWT } from '@/lib/keycloak'

const payload = decodeJWT<{exp: number, sub: string}>(token)
```

#### `decodeAccessToken(token)`

Decodes Keycloak access token.

```typescript
import { decodeAccessToken } from '@/lib/keycloak'

const decoded = decodeAccessToken(token)
// KeycloakAccessToken type
```

#### `decodeRefreshToken(token)` / `decodeIDToken(token)`

Similar to `decodeAccessToken()`.

### Validation

#### `isTokenExpired(token, bufferSeconds?)`

Checks if token is expired.

```typescript
import { isTokenExpired } from '@/lib/keycloak'

if (isTokenExpired(token)) {
  // Refresh token
}

// Consider expired 30s before actual expiry
if (isTokenExpired(token, 30)) {
  // ...
}
```

**Parameters:**
- `token: string | {exp: number}` - JWT or decoded token
- `bufferSeconds?: number` - Buffer time (default: 30)

**Returns:** `boolean`

#### `getTimeUntilExpiry(token)`

Gets seconds until token expires.

```typescript
import { getTimeUntilExpiry } from '@/lib/keycloak'

const seconds = getTimeUntilExpiry(token)
// 300 (5 minutes left)
// -60 (expired 1 minute ago)
```

#### `validateToken(token)`

Validates token structure and expiry.

```typescript
import { validateToken } from '@/lib/keycloak'

const validation = validateToken(token)
// {
//   valid: boolean
//   expired: boolean
//   expiresIn: number
//   error?: string
// }
```

#### `shouldRefreshToken(token, refreshBeforeSeconds?)`

Checks if token should be refreshed.

```typescript
import { shouldRefreshToken } from '@/lib/keycloak'

if (shouldRefreshToken(token, 300)) { // 5 minutes
  // Refresh token now
}
```

### User Extraction

#### `extractUser(accessToken)`

Extracts user info from access token.

```typescript
import { extractUser } from '@/lib/keycloak'

const user = extractUser(accessToken)
// {
//   id: string
//   email: string
//   name: string
//   username: string
//   emailVerified: boolean
//   roles: string[]           // All roles (realm + client)
//   realmRoles: string[]      // Realm roles only
//   clientRoles: {[clientId: string]: string[]}
// }
```

### Role Checking

#### `hasRole(user, roles, requireAll?)`

Checks if user has role(s).

```typescript
import { hasRole } from '@/lib/keycloak'

// Single role
hasRole(user, 'admin') // true/false

// Multiple roles (ANY)
hasRole(user, ['admin', 'moderator']) // true if has either

// Multiple roles (ALL)
hasRole(user, ['admin', 'superuser'], true) // true only if has both
```

#### `hasRealmRole(user, roles, requireAll?)`

Checks realm roles only.

#### `hasClientRole(user, clientId, roles, requireAll?)`

Checks client-specific roles.

```typescript
import { hasClientRole } from '@/lib/keycloak'

hasClientRole(user, 'my-client', 'admin')
```

### Token Info

#### `getTokenSubject(token)` → `string`

Gets user ID from token.

#### `getTokenIssuer(token)` → `string`

Gets issuer URL.

#### `getTokenExpiration(token)` → `Date | null`

Gets expiration as Date.

#### `getTokenIssuedAt(token)` → `Date | null`

Gets issuance time as Date.

#### `getTokenInfo(token)`

Gets comprehensive token information.

```typescript
import { getTokenInfo } from '@/lib/keycloak'

const info = getTokenInfo(token)
// {
//   valid: boolean
//   expired: boolean
//   expiresIn: number
//   expiresAt: Date | null
//   issuedAt: Date | null
//   subject: string | null
//   issuer: string | null
// }
```

#### `debugToken(token, label?)`

Pretty prints token info to console (dev only).

```typescript
import { debugToken } from '@/lib/keycloak'

debugToken(accessToken, 'Access Token')
// Logs detailed token info to console
```

---

## Cookies Client (`@/lib/cookies`)

Client-side cookie management (non-sensitive data only).

⚠️ **Cannot set HttpOnly cookies from client-side JavaScript!**

### Core Functions

#### `getCookie(name)`

```typescript
import { getCookie } from '@/lib/cookies'

const value = getCookie('theme') // 'dark' | undefined
```

#### `setCookie(name, value, options?)`

```typescript
import { setCookie } from '@/lib/cookies'

setCookie('theme', 'dark', {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  secure: true,
  sameSite: 'lax',
})
```

**Options:**
- `maxAge?: number` - Seconds until expiry
- `path?: string` - Cookie path (default: '/')
- `domain?: string` - Cookie domain
- `secure?: boolean` - HTTPS only (auto in production)
- `sameSite?: 'strict' | 'lax' | 'none'`

#### `removeCookie(name, options?)`

```typescript
import { removeCookie } from '@/lib/cookies'

removeCookie('theme')
```

#### `hasCookie(name)` → `boolean`

Check if cookie exists.

#### `getAllCookies()` → `Record<string, string>`

Get all cookies as object.

### Helpers

#### `localeCookie`

```typescript
import { localeCookie } from '@/lib/cookies'

localeCookie.get()               // Current locale
localeCookie.set('vi')          // Set locale
localeCookie.remove()           // Remove locale
```

#### `themeCookie`

```typescript
import { themeCookie } from '@/lib/cookies'

themeCookie.get()                // 'light' | 'dark' | 'system'
themeCookie.set('dark')
themeCookie.remove()
```

---

## Cookies Server (`@/lib/cookies-server`)

Server-side cookie management with HttpOnly support.

⚠️ **Server-side only! (API routes, Server Actions, Middleware)**

### Core Functions

#### `setServerCookie(name, value, options?)`

```typescript
import { setServerCookie } from '@/lib/cookies-server'

await setServerCookie('refresh_token', token, {
  httpOnly: true,   // XSS protection
  secure: true,     // HTTPS only
  sameSite: 'lax',  // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
})
```

#### `getServerCookie(name)`

```typescript
import { getServerCookie } from '@/lib/cookies-server'

const token = await getServerCookie('refresh_token')
```

#### `removeServerCookie(name)`

```typescript
import { removeServerCookie } from '@/lib/cookies-server'

await removeServerCookie('refresh_token')
```

#### `hasServerCookie(name)` → `Promise<boolean>`

#### `getAllServerCookies()` → `Promise<Map<string, string>>`

### Token Management

#### `setAccessToken(token)`

Set access token (short-lived, 15min).

#### `setRefreshToken(token)`

Set refresh token (HttpOnly, long-lived).

#### `getAccessToken()` / `getRefreshToken()`

Get tokens from cookies.

#### `clearAuthTokens()`

Remove all auth tokens.

### CSRF Protection

#### `setCsrfToken()` → `Promise<string>`

Generate and store CSRF token.

#### `verifyCsrfToken(token)` → `Promise<boolean>`

Verify CSRF token.

#### `clearCsrfToken()`

Remove CSRF token.

---

## Auth Store (`@/stores/auth-store`)

Zustand store for authentication state.

### State

```typescript
{
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'error'
  user: AuthUser | null
  accessToken: string | null
  expiresAt: number | null
  error: string | null
}
```

### Actions

#### `login(accessToken)`

Login with Keycloak token.

```typescript
import { useAuthStore } from '@/stores/auth-store'

const login = useAuthStore((state) => state.login)
login(accessToken)
```

#### `logout(postLogoutRedirectUri?)`

Logout and redirect to Keycloak.

```typescript
const logout = useAuthStore((state) => state.logout)
logout(window.location.origin)
```

#### `updateToken(accessToken)`

Update token (for refresh).

#### `clearAuth()`

Clear auth state without redirect.

#### `setError(error)` / `clearError()`

Manage error state.

### Getters

#### `isAuthenticated()` → `boolean`

Check if user is authenticated.

#### `isTokenExpiring()` → `boolean`

Check if token expires soon (<5min).

#### `getTimeUntilExpiry()` → `number`

Seconds until token expires.

### Selectors (Optimized)

```typescript
import {
  useUser,
  useAuthStatus,
  useIsAuthenticated,
  useUserRoles,
  useHasRole,
} from '@/stores/auth-store'

const user = useUser()                     // AuthUser | null
const status = useAuthStatus()             // AuthStatus
const isAuth = useIsAuthenticated()        // boolean
const roles = useUserRoles()               // string[]
const isAdmin = useHasRole('admin')        // boolean
```

### Actions (Outside Component)

```typescript
import { loginWithToken, logoutUser, forceLogin } from '@/stores/auth-store'

loginWithToken(token)         // Login from anywhere
logoutUser()                  // Logout from anywhere
forceLogin('/dashboard')      // Force redirect to login
```

---

## Types

### Authentication Types

```typescript
import type {
  AuthUser,
  AuthStatus,
  AuthState,
  KeycloakTokenResponse,
  KeycloakAccessToken,
  KeycloakUserInfo,
} from '@/lib/keycloak'
```

### Full Type Reference

See `src/lib/keycloak/types.ts` for complete type definitions.

---

**Last Updated**: 2025-12-10

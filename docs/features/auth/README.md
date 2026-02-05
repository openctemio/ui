# Authentication Documentation

Complete documentation for Keycloak authentication integration.

## 📚 Documentation Overview

This folder contains comprehensive guides for implementing Keycloak authentication in the Next.js application.

### Quick Links

| Document | Purpose | For Who |
|----------|---------|---------|
| **[Setup Guide](./KEYCLOAK_SETUP.md)** | Configure Keycloak server & client | DevOps, Backend Devs |
| **[Usage Guide](./AUTH_USAGE.md)** | Implement auth in your code | Frontend Devs |
| **[API Reference](./API_REFERENCE.md)** | Complete API documentation | All Developers |
| **[Migration Guide](./MIGRATION_GUIDE.md)** | Migrate from old auth system | All Developers |
| **[Troubleshooting](./TROUBLESHOOTING.md)** | Fix common issues | All Developers |

---

## 🚀 Quick Start

### For New Projects

1. **Setup Keycloak** → Read [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)
   - Configure Keycloak server
   - Create realm and client
   - Set environment variables

2. **Implement Authentication** → Read [AUTH_USAGE.md](./AUTH_USAGE.md)
   - Add login/logout buttons
   - Protect routes
   - Call APIs with auth

3. **Reference API** → Read [API_REFERENCE.md](./API_REFERENCE.md)
   - Look up functions and types
   - Copy-paste examples

### For Existing Projects

1. **Migrate Code** → Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
   - Update auth store usage
   - Replace mock authentication
   - Update API calls

2. **Test Migration** → Follow migration checklist

3. **Fix Issues** → Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if needed

---

## 📖 Documentation Details

### 1. [Keycloak Setup Guide](./KEYCLOAK_SETUP.md)

**What's included:**
- Prerequisites and requirements
- Step-by-step Keycloak configuration
- Environment variables setup
- Testing the setup
- Production deployment checklist

**When to read:**
- Setting up project for first time
- Deploying to new environment
- Configuring production Keycloak

**Estimated time:** 30-45 minutes

---

### 2. [Authentication Usage Guide](./AUTH_USAGE.md)

**What's included:**
- Quick start examples
- Login/logout implementation
- Protected routes patterns
- Role-based access control
- API calls with authentication
- Common patterns and hooks

**When to read:**
- Implementing new features
- Need code examples
- Learning authentication flow

**Estimated time:** 20-30 minutes

---

### 3. [API Reference](./API_REFERENCE.md)

**What's included:**
- Complete function signatures
- TypeScript types
- Parameter descriptions
- Return values
- Usage examples

**Modules documented:**
- Environment (`@/lib/env`)
- Keycloak Client (`@/lib/keycloak`)
- JWT Utilities
- Cookies (client & server)
- Auth Store

**When to read:**
- Need specific function details
- Looking up types
- Writing new code

**Estimated time:** Reference as needed

---

### 4. [Migration Guide](./MIGRATION_GUIDE.md)

**What's included:**
- Breaking changes overview
- Step-by-step migration
- Code update examples
- Before/after comparisons
- Testing checklist
- Rollback plan

**When to read:**
- Migrating from old auth system
- Upgrading authentication
- Refactoring existing code

**Estimated time:** 1-2 hours

---

### 5. [Troubleshooting Guide](./TROUBLESHOOTING.md)

**What's included:**
- Common errors and solutions
- Setup issues
- Login problems
- Token issues
- API integration problems
- Production issues
- Debug checklist

**When to read:**
- Something not working
- Error messages
- Debugging issues

**Estimated time:** Find your issue (5-10 mins)

---

## 🎯 Use Cases

### "I need to add login to my page"

1. Read: [AUTH_USAGE.md → Login Flow](./AUTH_USAGE.md#login-flow)
2. Copy example code
3. Customize for your page

### "How do I protect a route?"

1. Read: [AUTH_USAGE.md → Protected Routes](./AUTH_USAGE.md#protected-routes)
2. Choose pattern (client guard, layout, or middleware)
3. Implement

### "I'm getting 'Invalid redirect URI' error"

1. Read: [TROUBLESHOOTING.md → Login Issues](./TROUBLESHOOTING.md#login-issues)
2. Follow solution steps
3. Fix Keycloak configuration

### "How do I check if user has admin role?"

1. Read: [AUTH_USAGE.md → Role-Based Access](./AUTH_USAGE.md#role-based-access)
2. Or look up: [API_REFERENCE.md → hasRole()](./API_REFERENCE.md#hasrole)
3. Implement role check

### "What environment variables do I need?"

1. Read: [KEYCLOAK_SETUP.md → Environment Variables](./KEYCLOAK_SETUP.md#environment-variables)
2. Copy `.env.example` template
3. Fill in your values

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                    │
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │   Client     │         │     Server      │  │
│  │              │         │                 │  │
│  │ - Login UI   │◄────────┤ - API Routes    │  │
│  │ - User Info  │         │ - Middleware    │  │
│  │ - Protected  │         │ - Server        │  │
│  │   Routes     │         │   Actions       │  │
│  │              │         │                 │  │
│  │ Zustand      │         │ HttpOnly        │  │
│  │ (memory)     │         │ Cookies         │  │
│  └──────┬───────┘         └────────┬────────┘  │
│         │                          │           │
└─────────┼──────────────────────────┼───────────┘
          │                          │
          │  OAuth2 Code Flow        │
          ▼                          ▼
   ┌─────────────────────────────────────────┐
   │          Keycloak Server                │
   │                                         │
   │  - Authentication                       │
   │  - Token Issuance                       │
   │  - User Management                      │
   │  - Role Management                      │
   └─────────────────────────────────────────┘
```

### Key Components

1. **Client-Side** (`src/lib/keycloak/client.ts`)
   - OAuth2 authorization flow
   - Token exchange
   - Redirect handling

2. **JWT Utilities** (`src/lib/keycloak/jwt.ts`)
   - Token decoding
   - Validation
   - User extraction

3. **Auth Store** (`src/stores/auth-store.ts`)
   - In-memory token storage
   - User state management
   - Role checking

4. **Server-Side** (`src/lib/cookies-server.ts`)
   - HttpOnly cookies
   - Refresh token storage
   - CSRF protection

---

## 🔒 Security Best Practices

From the documentation:

✅ **DO:**
- Store access tokens in memory (Zustand)
- Store refresh tokens in HttpOnly cookies (server-side)
- Validate tokens on every request
- Use HTTPS in production (`SECURE_COOKIES=true`)
- Implement CSRF protection
- Whitelist redirect URIs in Keycloak
- Keep access tokens short-lived (5-15 min)
- Use refresh token rotation

❌ **DON'T:**
- Store tokens in localStorage
- Store tokens in regular cookies (accessible by JS)
- Skip token validation
- Use HTTP in production
- Allow any redirect URI
- Make access tokens long-lived
- Skip HTTPS verification

---

## 📝 Code Examples

### Quick Login Button

```tsx
import { redirectToLogin } from '@/lib/keycloak'

<Button onClick={() => redirectToLogin('/dashboard')}>
  Login
</Button>
```

### Quick Protected Route

```tsx
import { useIsAuthenticated, forceLogin } from '@/stores/auth-store'

export default function DashboardPage() {
  const isAuth = useIsAuthenticated()

  if (!isAuth) {
    forceLogin('/dashboard')
    return null
  }

  return <div>Dashboard Content</div>
}
```

### Quick Role Check

```tsx
import { useHasRole } from '@/stores/auth-store'

const isAdmin = useHasRole('admin')

{isAdmin && <AdminPanel />}
```

**More examples:** See [AUTH_USAGE.md](./AUTH_USAGE.md)

---

## 🆘 Need Help?

1. **Check Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. **Search Documentation:** Use Ctrl+F in each doc
3. **Check Examples:** [AUTH_USAGE.md](./AUTH_USAGE.md) has many examples
4. **Debug Tools:**
   ```typescript
   import { debugToken, getTokenInfo } from '@/lib/keycloak'
   debugToken(token)
   ```

5. **External Resources:**
   - [Keycloak Docs](https://www.keycloak.org/documentation)
   - [OAuth 2.0 Spec](https://oauth.net/2/)
   - [OpenID Connect](https://openid.net/connect/)

---

## 🔄 Updates

This documentation is maintained alongside the codebase.

**Last Major Update:** 2025-12-10

**What Changed:**
- ✅ Complete Keycloak integration
- ✅ Secure token management
- ✅ Type-safe environment variables
- ✅ JWT utilities
- ✅ Updated auth store

**Breaking Changes:** See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

## 📋 Documentation Checklist

Before deploying:

- [ ] Read setup guide
- [ ] Configure Keycloak
- [ ] Set environment variables
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test protected routes
- [ ] Test role-based access
- [ ] Test API calls with auth
- [ ] Verify HTTPS in production
- [ ] Check security settings
- [ ] Read troubleshooting guide

---

**Questions or feedback?** Open an issue or contact the team.

**Last Updated:** 2025-12-10

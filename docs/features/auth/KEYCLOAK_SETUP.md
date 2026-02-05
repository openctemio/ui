# Keycloak Setup Guide

Complete guide to set up Keycloak authentication for this Next.js application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Keycloak Configuration](#keycloak-configuration)
3. [Environment Variables](#environment-variables)
4. [Testing the Setup](#testing-the-setup)
5. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

- Keycloak Server (8.0+)
- Node.js 20+
- Access to Keycloak Admin Console

### Required Access

- Keycloak Admin credentials
- Ability to create realms and clients

---

## Keycloak Configuration

### Step 1: Create a Realm

1. Login to Keycloak Admin Console: `http://your-keycloak-server:8080/admin`
2. Click **"Add Realm"** in the left sidebar
3. Enter realm name (e.g., `my-app`)
4. Click **"Create"**

### Step 2: Create a Client

1. Navigate to **Clients** → **Create**
2. Fill in the form:

```
Client ID: nextjs-frontend
Client Protocol: openid-connect
Root URL: http://localhost:3000
```

3. Click **"Save"**

### Step 3: Configure Client Settings

Go to **Clients** → **nextjs-frontend** → **Settings** tab:

```yaml
# Access Settings
Access Type: public  # For SPA/frontend apps
Standard Flow Enabled: ON  # Authorization Code Flow
Direct Access Grants Enabled: OFF  # Don't allow password grant
Implicit Flow Enabled: OFF  # Not recommended for security

# URLs (Development)
Valid Redirect URIs:
  - http://localhost:3000/*
  - http://localhost:3000/auth/callback

Web Origins:
  - http://localhost:3000
  - +  # Allow CORS from redirect URIs

# URLs (Production - Add later)
Valid Redirect URIs:
  - https://your-domain.com/*
  - https://your-domain.com/auth/callback

Web Origins:
  - https://your-domain.com
```

4. Click **"Save"**

### Step 4: Configure Realm Roles

1. Navigate to **Roles** → **Add Role**
2. Create common roles:

```
- admin
- user
- moderator
```

### Step 5: Configure Client Roles (Optional)

1. Go to **Clients** → **nextjs-frontend** → **Roles** tab
2. Add client-specific roles:

```
- dashboard-access
- settings-access
```

### Step 6: Create Test User

1. Navigate to **Users** → **Add User**
2. Fill in:

```
Username: testuser
Email: test@example.com
Email Verified: ON
Enabled: ON
```

3. Click **"Save"**
4. Go to **Credentials** tab → Set password
5. Go to **Role Mappings** tab → Assign roles

### Step 7: Configure Token Settings (Optional)

Go to **Realm Settings** → **Tokens** tab:

```yaml
# Access Token Lifespan
Access Token Lifespan: 5 Minutes (short-lived for security)
Access Token Lifespan For Implicit Flow: 15 Minutes

# SSO Session Settings
SSO Session Idle: 30 Minutes
SSO Session Max: 10 Hours

# Refresh Token
Revoke Refresh Token: ON
Refresh Token Max Reuse: 0
```

### Step 8: Enable User Registration (Optional)

Go to **Realm Settings** → **Login** tab:

```
User registration: ON
Forgot password: ON
Remember me: ON
Email as username: ON (optional)
```

---

## Environment Variables

### Step 1: Copy Template

```bash
cp .env.example .env.local
```

### Step 2: Fill in Keycloak Configuration

Edit `.env.local`:

```bash
# ==============================================
# Keycloak Configuration
# ==============================================

# Keycloak server URL (no trailing slash)
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080

# Your realm name
NEXT_PUBLIC_KEYCLOAK_REALM=my-app

# Your client ID
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nextjs-frontend

# Client secret (only if using confidential client)
# For public clients (frontend), leave empty
KEYCLOAK_CLIENT_SECRET=

# OAuth callback URL
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=http://localhost:3000/auth/callback

# Token storage cookie names
NEXT_PUBLIC_AUTH_COOKIE_NAME=kc_auth_token
NEXT_PUBLIC_REFRESH_COOKIE_NAME=kc_refresh_token

# Cookie expiration (7 days in seconds)
COOKIE_MAX_AGE=604800
```

### Step 3: Configure Backend API

```bash
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Internal API URL (server-side, if different)
API_URL=http://localhost:8000/api
```

### Step 4: Security Settings

```bash
# CSRF secret (generate random 32+ char string)
# Generate with: openssl rand -base64 32
CSRF_SECRET=your-generated-secret-here

# Enable HTTPS-only cookies (set to true in production)
SECURE_COOKIES=false

# Enable automatic token refresh
ENABLE_TOKEN_REFRESH=true

# Refresh token N seconds before expiry
TOKEN_REFRESH_BEFORE_EXPIRY=300
```

---

## Testing the Setup

### Step 1: Start the Application

```bash
npm run dev
```

### Step 2: Test Keycloak Connection

Create a test page at `src/app/test-keycloak/page.tsx`:

```tsx
'use client'

import { env } from '@/lib/env'
import { getKeycloakUrls, buildAuthorizationUrl } from '@/lib/keycloak'

export default function TestKeycloakPage() {
  const urls = getKeycloakUrls()
  const authUrl = buildAuthorizationUrl()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Keycloak Configuration Test</h1>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">Configuration:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(env.keycloak, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-semibold">Endpoints:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(urls, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-semibold">Test Login:</h2>
          <a
            href={authUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Keycloak Login
          </a>
        </div>
      </div>
    </div>
  )
}
```

### Step 3: Visit Test Page

Navigate to: `http://localhost:3000/test-keycloak`

Expected results:
- ✅ Configuration shows your Keycloak URL, realm, client ID
- ✅ Endpoints show valid URLs
- ✅ Click "Test Keycloak Login" redirects to Keycloak login page

### Step 4: Test Full Login Flow

1. Click "Test Keycloak Login"
2. Enter test user credentials
3. Should redirect back to your app with `?code=...` in URL
4. Check browser console for any errors

---

## Production Deployment

### Step 1: Update Keycloak Client Settings

In Keycloak Admin Console:

```yaml
Valid Redirect URIs:
  - https://your-production-domain.com/*
  - https://your-production-domain.com/auth/callback

Web Origins:
  - https://your-production-domain.com
```

### Step 2: Production Environment Variables

Update your production `.env` (Vercel/deployment platform):

```bash
# Keycloak (Production)
NEXT_PUBLIC_KEYCLOAK_URL=https://your-keycloak-server.com
NEXT_PUBLIC_KEYCLOAK_REALM=production-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nextjs-frontend-prod
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=https://your-domain.com/auth/callback

# App URLs (Production)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Security (Production)
SECURE_COOKIES=true  # ⚠️ CRITICAL: Must be true in production
NODE_ENV=production

# CSRF Secret (Different from dev!)
CSRF_SECRET=different-production-secret-32-chars-min
```

### Step 3: Verify HTTPS

⚠️ **CRITICAL**: Keycloak requires HTTPS in production!

- Ensure your app is served over HTTPS
- Ensure Keycloak server is HTTPS
- Set `SECURE_COOKIES=true`

### Step 4: Test Production Login

1. Visit your production URL
2. Click login
3. Should redirect to Keycloak (HTTPS)
4. After login, should return to your app (HTTPS)
5. Verify cookies have `Secure` and `HttpOnly` flags (check browser DevTools)

---

## Security Checklist

Before going to production:

- [ ] Keycloak server is on HTTPS
- [ ] App is on HTTPS
- [ ] `SECURE_COOKIES=true` in production
- [ ] `CSRF_SECRET` is 32+ random characters
- [ ] Different secrets for dev/staging/production
- [ ] Redirect URIs are whitelisted in Keycloak
- [ ] Access token lifespan is short (5-15 minutes)
- [ ] Refresh token rotation is enabled
- [ ] No secrets in client-side code
- [ ] `.env.local` is in `.gitignore`
- [ ] Test logout flow
- [ ] Test token refresh flow

---

## Common Keycloak URLs

```bash
# Admin Console
https://your-keycloak-server.com/admin

# Realm Login
https://your-keycloak-server.com/realms/{realm}/account

# OpenID Configuration (check if working)
https://your-keycloak-server.com/realms/{realm}/.well-known/openid-configuration
```

---

## Next Steps

After completing setup:

1. Read [AUTH_USAGE.md](./AUTH_USAGE.md) for usage examples
2. Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) to migrate existing code
3. Read [API_REFERENCE.md](./API_REFERENCE.md) for API documentation
4. Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

---

## Need Help?

- **Keycloak Docs**: https://www.keycloak.org/documentation
- **OAuth2 Spec**: https://oauth.net/2/
- **OpenID Connect**: https://openid.net/connect/

---

**Last Updated**: 2025-12-10

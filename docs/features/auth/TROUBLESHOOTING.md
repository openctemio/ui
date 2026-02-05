# Troubleshooting Guide

Solutions to common Keycloak integration issues.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Login Issues](#login-issues)
- [Token Issues](#token-issues)
- [API Integration Issues](#api-integration-issues)
- [Environment Issues](#environment-issues)
- [Browser Issues](#browser-issues)
- [Production Issues](#production-issues)

---

## Setup Issues

### ❌ "Missing required environment variable: NEXT_PUBLIC_KEYCLOAK_URL"

**Cause:** `.env.local` file missing or not loaded.

**Solution:**
```bash
# 1. Check if .env.local exists
ls -la .env.local

# 2. If not, copy from example
cp .env.example .env.local

# 3. Fill in your Keycloak configuration
# 4. Restart dev server
npm run dev
```

**Verify:**
```typescript
import { env } from '@/lib/env'
console.log(env.keycloak.url) // Should not be empty
```

---

### ❌ "Cannot connect to Keycloak server"

**Cause:** Keycloak server not running or wrong URL.

**Solution:**

1. **Check Keycloak is running:**
```bash
curl http://localhost:8080
# Should return Keycloak page
```

2. **Check URL in .env.local:**
```bash
# NO trailing slash!
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080  ✅
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080/ ❌
```

3. **Test OpenID configuration:**
```bash
curl http://localhost:8080/realms/YOUR_REALM/.well-known/openid-configuration
# Should return JSON with endpoints
```

---

### ❌ "Realm 'my-realm' not found"

**Cause:** Realm doesn't exist or typo in name.

**Solution:**

1. Check realm name in Keycloak Admin Console
2. Update `.env.local`:
```bash
NEXT_PUBLIC_KEYCLOAK_REALM=exact-realm-name  # Case sensitive!
```

---

### ❌ "Client 'nextjs-frontend' not found"

**Cause:** Client doesn't exist or wrong client ID.

**Solution:**

1. Go to Keycloak Admin → Clients
2. Check your client ID (exact match)
3. Update `.env.local`:
```bash
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=exact-client-id
```

---

## Login Issues

### ❌ Clicking login button does nothing

**Cause:** JavaScript error or wrong Keycloak URL.

**Solution:**

1. **Check browser console for errors:**
```javascript
// Look for errors like:
// - Failed to fetch
// - CORS error
// - Network error
```

2. **Test URL manually:**
```typescript
import { buildAuthorizationUrl } from '@/lib/keycloak'

const url = buildAuthorizationUrl()
console.log('Auth URL:', url)
// Copy URL and paste in browser - should show Keycloak login
```

3. **Check network tab:**
- Should redirect to Keycloak URL
- If not, check if `redirectToLogin()` is being called

---

### ❌ "Invalid redirect URI"

**Cause:** Redirect URI not whitelisted in Keycloak.

**Solution:**

1. Go to Keycloak Admin → Clients → Your Client → Settings
2. Add to **Valid Redirect URIs:**
```
http://localhost:3000/*
http://localhost:3000/auth/callback
```

3. Add to **Web Origins:**
```
http://localhost:3000
+
```

4. Click **Save**

**Verify:**
```bash
# .env.local
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

### ❌ Stuck on "Processing login..." after callback

**Cause:** Callback page error or token exchange failed.

**Solution:**

1. **Check browser console:**
```javascript
// Look for errors like:
// - Failed to exchange code
// - Invalid state
// - Network error
```

2. **Check callback URL parameters:**
```
http://localhost:3000/auth/callback?code=XXX&state=YYY

# Should have 'code' and 'state' parameters
# If has 'error' parameter, check error message
```

3. **Debug callback:**
```typescript
// In callback page, add logging
const { code, state, error, error_description } = getCallbackParams()
console.log({ code, state, error, error_description })
```

---

### ❌ "Invalid state parameter"

**Cause:** State validation failed (possible CSRF or session issue).

**Solution:**

1. **Clear browser storage:**
```javascript
// In browser console
sessionStorage.clear()
localStorage.clear()
```

2. **Try login again**

3. **Check if sessionStorage works:**
```javascript
// Should be able to store data
sessionStorage.setItem('test', 'value')
console.log(sessionStorage.getItem('test')) // 'value'
```

4. **Disable browser extensions** that might block storage

---

### ❌ "Token exchange failed: unauthorized_client"

**Cause:** Client secret required but not provided, or wrong client type.

**Solution:**

1. Check **Access Type** in Keycloak client settings:
```
Access Type: public   ✅ For frontend apps (no secret needed)
Access Type: confidential ❌ Requires secret (backend only)
```

2. If using confidential client:
```bash
# Add to .env.local
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Exchange tokens server-side (API route)
```

---

## Token Issues

### ❌ "Token is expired"

**Cause:** Access token has expired (typical: 5-15 minutes).

**Solution:**

1. **Check token expiry:**
```typescript
import { debugToken } from '@/lib/keycloak'

debugToken(accessToken)
// Look at "expiresIn" - should be > 0
```

2. **Implement token refresh:**

Create `src/app/api/auth/refresh/route.ts`:
```typescript
import { getRefreshToken, setAccessToken } from '@/lib/cookies-server'
import { getKeycloakUrls } from '@/lib/keycloak'

export async function POST() {
  const refreshToken = await getRefreshToken()

  if (!refreshToken) {
    return Response.json({ error: 'No refresh token' }, { status: 401 })
  }

  const urls = getKeycloakUrls()
  const response = await fetch(urls.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
    }),
  })

  if (!response.ok) {
    return Response.json({ error: 'Refresh failed' }, { status: 401 })
  }

  const tokens = await response.json()
  await setAccessToken(tokens.access_token)

  return Response.json({ accessToken: tokens.access_token })
}
```

3. **Call refresh before token expires**

---

### ❌ "Cannot read properties of null (reading 'roles')"

**Cause:** Trying to access user before authentication completes.

**Solution:**

1. **Always check if user exists:**
```typescript
const user = useUser()

if (!user) {
  return <div>Loading...</div>
}

// Safe to use user.roles now
return <div>{user.roles.join(', ')}</div>
```

2. **Or use optional chaining:**
```typescript
const roles = user?.roles || []
```

---

### ❌ "Failed to decode JWT: Invalid JWT format"

**Cause:** Invalid token or not a JWT.

**Solution:**

1. **Check token format:**
```javascript
// Valid JWT has 3 parts separated by dots
const parts = token.split('.')
console.log(parts.length) // Should be 3
```

2. **Verify token is from Keycloak:**
```typescript
import { decodeJWT } from '@/lib/keycloak'

try {
  const payload = decodeJWT(token)
  console.log('Issuer:', payload.iss) // Should be your Keycloak URL
} catch (error) {
  console.error('Invalid token:', error)
}
```

---

## API Integration Issues

### ❌ Backend returns 401 even with token

**Cause:** Backend doesn't accept or validate Keycloak tokens.

**Solution:**

1. **Check token is sent:**
```javascript
// Browser Network tab → Request Headers
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...
```

2. **Backend must validate Keycloak JWT:**

Python (FastAPI) example:
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import jwt
import requests

security = HTTPBearer()

def get_keycloak_public_key():
    url = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/certs"
    response = requests.get(url)
    return response.json()

def verify_token(credentials: HTTPAuthCredentials = Depends(security)):
    token = credentials.credentials
    try:
        public_keys = get_keycloak_public_key()
        # Validate JWT with public key
        payload = jwt.decode(token, public_keys, algorithms=['RS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

### ❌ CORS error when calling API

**Cause:** Backend doesn't allow requests from frontend origin.

**Solution:**

Backend must allow CORS:

Node.js (Express):
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}))
```

Python (FastAPI):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Environment Issues

### ❌ Environment variables work in dev but not in production

**Cause:** Production environment not configured.

**Solution:**

1. **Add variables to deployment platform:**

**Vercel:**
```bash
# Go to Project → Settings → Environment Variables
# Add all NEXT_PUBLIC_* variables
```

**Docker:**
```dockerfile
# Add to docker-compose.yml
environment:
  - NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.prod.com
  - NEXT_PUBLIC_KEYCLOAK_REALM=prod
  # ...
```

2. **Rebuild after adding variables**

---

### ❌ "SECURE_COOKIES=false" in production

**Cause:** Not changed to true for production.

**Solution:**
```bash
# Production .env
SECURE_COOKIES=true  # ⚠️ CRITICAL
NODE_ENV=production
```

---

## Browser Issues

### ❌ Cookies not being set

**Cause:** Browser security, SameSite issues, or HTTPS required.

**Solution:**

1. **Check browser console:**
```
"Cookie blocked due to user preferences"
"Cookie blocked by SameSite policy"
```

2. **For localhost development:**
```bash
# .env.local
SECURE_COOKIES=false  # Allow HTTP cookies in dev
```

3. **For production (HTTPS required):**
```bash
SECURE_COOKIES=true
```

4. **Check SameSite settings:**
```typescript
// In cookies.ts
sameSite: 'lax'  // Most compatible
// or
sameSite: 'none' // Only with Secure=true
```

---

### ❌ Infinite redirect loop

**Cause:** Protected route redirects to login, but login redirects back.

**Solution:**

1. **Check authentication logic:**
```typescript
// Make sure not to protect /login or /auth/callback
const publicPaths = ['/login', '/auth/callback', '/']

if (publicPaths.includes(pathname)) {
  return // Don't redirect
}

if (!isAuthenticated) {
  redirect('/login')
}
```

---

## Production Issues

### ❌ "Invalid redirect URI" in production

**Cause:** Production URLs not added to Keycloak.

**Solution:**

1. Update Keycloak client for production:
```
Valid Redirect URIs:
  https://your-domain.com/*
  https://your-domain.com/auth/callback

Web Origins:
  https://your-domain.com
```

2. Update `.env`:
```bash
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=https://your-domain.com/auth/callback
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

### ❌ "Mixed content" errors (HTTP/HTTPS)

**Cause:** Loading HTTP resources on HTTPS page.

**Solution:**

1. **Ensure all URLs use HTTPS in production:**
```bash
NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.example.com  # NOT http://
NEXT_PUBLIC_API_URL=https://api.example.com
```

2. **Force HTTPS in Next.js config:**
```typescript
// next.config.ts
async headers() {
  return [{
    source: '/:path*',
    headers: [{
      key: 'Content-Security-Policy',
      value: "upgrade-insecure-requests"
    }]
  }]
}
```

---

## Debug Checklist

When troubleshooting, check:

- [ ] `.env.local` file exists and filled correctly
- [ ] Dev server restarted after env changes
- [ ] Keycloak server is running
- [ ] Realm and client exist in Keycloak
- [ ] Redirect URIs whitelisted in Keycloak
- [ ] Browser console shows no errors
- [ ] Network tab shows requests/redirects
- [ ] Token format is valid (3 parts)
- [ ] Token is not expired
- [ ] User object exists before accessing properties
- [ ] API calls include Authorization header
- [ ] Backend validates Keycloak JWT
- [ ] CORS configured on backend
- [ ] HTTPS used in production
- [ ] Production env vars configured

---

## Getting Help

If still stuck:

1. **Check Keycloak logs:**
```bash
# Docker
docker logs keycloak-container

# Standalone
tail -f standalone/log/server.log
```

2. **Enable debug logging:**
```typescript
// In auth-store or callback
console.log('Debug info:', {
  isAuthenticated,
  user,
  accessToken: accessToken?.substring(0, 20) + '...',
  error,
})
```

3. **Test with Keycloak Admin CLI:**
```bash
# Get token directly
curl -X POST \
  "http://localhost:8080/realms/my-realm/protocol/openid-connect/token" \
  -d "client_id=nextjs-frontend" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=testpass"
```

4. **Join communities:**
- Keycloak Discord: https://discord.gg/keycloak
- Stack Overflow: Tag `keycloak` + `next.js`

---

**Last Updated**: 2025-12-10

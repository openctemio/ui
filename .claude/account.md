# Account Settings Guide

> User account management for profile, security, preferences, and activity tracking.

## Overview

The Account Settings feature allows users to manage their personal information, security settings, preferences, and view their activity history. It is accessible via the profile dropdown in the navigation header.

## Architecture

```
/account                    # Profile page (default)
├── /account/security      # Password, 2FA, sessions
├── /account/preferences   # Theme, language, notifications
└── /account/activity      # Login history, security events
```

## Feature Structure

```
src/features/account/
├── api/
│   ├── use-profile.ts        # Profile CRUD hooks
│   ├── use-security.ts       # Password, 2FA hooks
│   ├── use-sessions.ts       # Session management hooks
│   ├── use-preferences.ts    # User preferences hooks
│   └── index.ts              # Barrel export
├── types/
│   └── account.types.ts      # Type definitions
└── index.ts                  # Feature exports

src/app/(dashboard)/account/
├── layout.tsx                # Account layout with tab navigation
├── page.tsx                  # Profile tab
├── security/page.tsx         # Security tab
├── preferences/page.tsx      # Preferences tab
└── activity/page.tsx         # Activity log tab
```

## Type Definitions

### User Profile

```typescript
interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string
  phone?: string
  bio?: string
  created_at: string
  updated_at: string
  email_verified: boolean
  auth_provider: 'local' | 'google' | 'github' | 'microsoft' | 'saml' | 'oidc'
}

interface UpdateProfileInput {
  name?: string
  phone?: string
  bio?: string
}
```

### Security

```typescript
interface ChangePasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

interface TwoFactorStatus {
  enabled: boolean
  verified_at?: string
}

interface Session {
  id: string
  device: string
  browser: string
  os: string
  ip_address: string
  location?: string
  created_at: string
  last_active_at: string
  is_current: boolean
}
```

### Preferences

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  date_format: string
  time_format: '12h' | '24h'
  email_notifications: EmailNotificationPreferences
  desktop_notifications: boolean
}

interface EmailNotificationPreferences {
  security_alerts: boolean
  weekly_digest: boolean
  scan_completed: boolean
  new_findings: boolean
  team_updates: boolean
}
```

### Activity

```typescript
type ActivityEventType =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'profile_update'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_revoked'

interface ActivityLog {
  id: string
  event_type: ActivityEventType
  description: string
  ip_address: string
  user_agent: string
  location?: string
  created_at: string
}
```

## API Hooks

### Profile Hooks

```typescript
import { useProfile, useUpdateProfile, useUpdateAvatar } from '@/features/account'

// Fetch profile
const { profile, isLoading, isError, error, mutate } = useProfile()

// Update profile
const { updateProfile, isUpdating, error } = useUpdateProfile()
await updateProfile({ name: 'New Name', phone: '+84123456789' })

// Update avatar
const { updateAvatar, removeAvatar, isUpdating } = useUpdateAvatar()
await updateAvatar('data:image/jpeg;base64,...')
await removeAvatar()
```

### Security Hooks

```typescript
import {
  useChangePassword,
  useTwoFactorStatus,
  useSetupTwoFactor,
  useVerifyTwoFactor,
  useDisableTwoFactor,
} from '@/features/account'

// Change password
const { changePassword, isChanging } = useChangePassword()
await changePassword({
  current_password: 'old',
  new_password: 'new',
  confirm_password: 'new',
})

// 2FA status
const { status, isLoading, mutate } = useTwoFactorStatus()

// Setup 2FA
const { setupTwoFactor, isSettingUp } = useSetupTwoFactor()
const { secret, qr_code_url, backup_codes } = await setupTwoFactor()

// Verify 2FA
const { verifyTwoFactor, isVerifying } = useVerifyTwoFactor()
await verifyTwoFactor({ code: '123456' })

// Disable 2FA
const { disableTwoFactor, isDisabling } = useDisableTwoFactor()
await disableTwoFactor('password')
```

### Session Hooks

```typescript
import {
  useSessions,
  useRevokeSession,
  useRevokeAllSessions,
  getCurrentSession,
  getOtherSessions,
} from '@/features/account'

// Fetch sessions
const { sessions, total, isLoading, mutate } = useSessions()

// Get current/other sessions
const currentSession = getCurrentSession(sessions)
const otherSessions = getOtherSessions(sessions)

// Revoke specific session
const { revokeSession, isRevoking } = useRevokeSession()
await revokeSession('session-id')

// Revoke all except current
const { revokeAllSessions, isRevoking } = useRevokeAllSessions()
await revokeAllSessions()
```

### Preferences Hooks

```typescript
import { usePreferences, useUpdatePreferences, useLocalPreferences } from '@/features/account'

// Fetch preferences
const { preferences, isLoading, mutate } = usePreferences()

// Update preferences
const { updatePreferences, isUpdating } = useUpdatePreferences()
await updatePreferences({
  theme: 'dark',
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
})

// Local preferences with sync (includes localStorage caching)
const { preferences, update, isLoading, isUpdating } = useLocalPreferences()
```

## API Endpoints

| Endpoint                           | Method | Description                 |
| ---------------------------------- | ------ | --------------------------- |
| `/api/v1/users/me`                 | GET    | Get current user profile    |
| `/api/v1/users/me`                 | PUT    | Update current user profile |
| `/api/v1/users/me/avatar`          | PUT    | Upload/update avatar        |
| `/api/v1/users/me/avatar`          | DELETE | Remove avatar               |
| `/api/v1/users/me/change-password` | POST   | Change password             |
| `/api/v1/users/me/2fa`             | GET    | Get 2FA status              |
| `/api/v1/users/me/2fa/setup`       | POST   | Start 2FA setup             |
| `/api/v1/users/me/2fa/verify`      | POST   | Verify and enable 2FA       |
| `/api/v1/users/me/2fa`             | DELETE | Disable 2FA                 |
| `/api/v1/users/me/sessions`        | GET    | List active sessions        |
| `/api/v1/users/me/sessions/{id}`   | DELETE | Revoke specific session     |
| `/api/v1/users/me/sessions`        | DELETE | Revoke all other sessions   |
| `/api/v1/users/me/preferences`     | GET    | Get user preferences        |
| `/api/v1/users/me/preferences`     | PUT    | Update user preferences     |
| `/api/v1/users/me/activity`        | GET    | Get activity history        |

## Pages

### Profile Page (`/account`)

Features:

- Avatar upload with preview and crop
- Name, email (readonly for SSO users), phone, bio
- Email verification status badge
- Account information (ID, auth provider, dates)

### Security Page (`/account/security`)

Features:

- Change password (hidden for SSO users)
- Two-factor authentication status and setup
- Active sessions list with current session highlight
- Revoke individual or all other sessions

### Preferences Page (`/account/preferences`)

Features:

- Theme selection (light/dark/system) with immediate apply
- Language selection
- Timezone and date/time format
- Email notification preferences per category
- Desktop notifications toggle
- Reset to defaults

### Activity Page (`/account/activity`)

Features:

- Activity log with event type icons and colors
- Filter by event type
- Pagination
- Location and IP address display
- Relative timestamps with full date on hover

## Constants

```typescript
import {
  ACTIVITY_EVENT_LABELS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TIMEZONES,
  DATE_FORMATS,
} from '@/features/account'

// Language options
SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'ja', label: '日本語' },
  // ...
]

// Timezone options
SUPPORTED_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (UTC+7)' },
  // ...
]

// Date format options
DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
]
```

## Navigation

The account pages are accessed via the profile dropdown in the header:

```typescript
// profile-dropdown.tsx
<DropdownMenuGroup>
  <DropdownMenuItem asChild>
    <Link href="/account">Profile</Link>
  </DropdownMenuItem>
  <DropdownMenuItem asChild>
    <Link href="/account/security">Security</Link>
  </DropdownMenuItem>
  <DropdownMenuItem asChild>
    <Link href="/account/preferences">Preferences</Link>
  </DropdownMenuItem>
</DropdownMenuGroup>
```

## Permissions

Account settings are user-level and do not require special permissions. All authenticated users can:

- View and edit their own profile
- Change their password (local auth only)
- Manage 2FA
- View and revoke their sessions
- Update their preferences
- View their activity history

## Best Practices

### Avatar Upload

```typescript
// Resize and convert to base64 before upload
const handleAvatarUpload = (file: File) => {
  const img = new Image()
  const canvas = document.createElement('canvas')
  const reader = new FileReader()

  reader.onload = (ev) => {
    img.onload = () => {
      // Resize to max 200x200
      const maxSize = 200
      let w = img.width,
        h = img.height
      if (w > maxSize) {
        h = (h * maxSize) / w
        w = maxSize
      }
      if (h > maxSize) {
        w = (w * maxSize) / h
        h = maxSize
      }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      // Now upload dataUrl
    }
    img.src = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}
```

### Theme Sync

```typescript
// Preferences page syncs with next-themes
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()

// When user changes theme preference
const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
  setFormData({ ...formData, theme: newTheme })
  setTheme(newTheme) // Immediately apply
}
```

### Password Validation

```typescript
// Client-side validation before API call
const validatePassword = (form: ChangePasswordInput): string | null => {
  if (form.new_password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (form.new_password !== form.confirm_password) {
    return 'Passwords do not match'
  }
  return null
}
```

## Troubleshooting

### Avatar not updating immediately

The avatar is cached. After upload, call `mutate()` to refresh the profile data:

```typescript
const { mutate } = useProfile()
await updateAvatar(dataUrl)
mutate() // Refresh profile to get new avatar URL
```

### Theme not applying

Make sure `next-themes` ThemeProvider is wrapping your app and the theme is being set via `setTheme()` from `useTheme()` hook, not just stored in preferences.

### Session list empty

Check if the backend `/api/v1/users/me/sessions` endpoint is implemented. The UI shows mock data if the API returns empty.

### SSO users can't change password

This is expected behavior. For SSO users (auth_provider !== 'local'), the password change section is hidden and shows a message to manage password via the identity provider.

---

**Last Updated**: 2026-01-24

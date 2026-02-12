/**
 * Auth Messages Constants
 *
 * Centralized auth-related messages
 * Single source of truth for all user-facing messages
 */

// ============================================
// SUCCESS MESSAGES
// ============================================

export const AUTH_SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back! You have successfully logged in.',
  REGISTER: 'Account created successfully! Please check your email to verify your account.',
  LOGOUT: 'You have been logged out successfully.',
  PASSWORD_RESET_REQUEST: 'Password reset link has been sent to your email.',
  PASSWORD_RESET: 'Your password has been reset successfully.',
  PASSWORD_CHANGE: 'Your password has been changed successfully.',
  EMAIL_VERIFIED: 'Your email has been verified successfully.',
  PROFILE_UPDATE: 'Your profile has been updated successfully.',
} as const

// ============================================
// ERROR MESSAGES
// ============================================

export const AUTH_ERROR_MESSAGES = {
  // Generic errors
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  SERVER: 'Server error. Please try again later.',

  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Invalid authentication token. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',

  // Registration errors
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USERNAME_TAKEN: 'This username is already taken.',
  WEAK_PASSWORD: 'Password is too weak. Please use a stronger password.',

  // Password reset errors
  INVALID_RESET_TOKEN: 'Invalid or expired reset token. Please request a new one.',
  PASSWORD_RESET_FAILED: 'Failed to reset password. Please try again.',

  // OAuth errors
  OAUTH_FAILED: 'Authentication failed. Please try again.',
  OAUTH_CANCELLED: 'Authentication was cancelled.',
  OAUTH_STATE_MISMATCH: 'Invalid state parameter. Possible CSRF attack detected.',

  // Auth service errors
  AUTH_SERVICE_ERROR: 'Authentication service error. Please try again.',
  AUTH_SERVICE_UNAVAILABLE: 'Authentication service is currently unavailable.',

  // Validation errors
  EMAIL_REQUIRED: 'Please enter your email address.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_REQUIRED: 'Please enter your password.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  PASSWORDS_DONT_MATCH: "Passwords don't match. Please try again.",

  // Authorization errors
  FORBIDDEN: 'You do not have permission to access this resource.',
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions.',
} as const

// ============================================
// INFO MESSAGES
// ============================================

export const AUTH_INFO_MESSAGES = {
  REDIRECTING: 'Redirecting...',
  LOGGING_IN: 'Logging you in...',
  LOGGING_OUT: 'Logging you out...',
  LOADING: 'Loading...',
  CHECKING_AUTH: 'Verifying your session...',
  REFRESHING_TOKEN: 'Refreshing your session...',
} as const

// ============================================
// VALIDATION MESSAGES
// ============================================

export const VALIDATION_MESSAGES = {
  EMAIL: {
    REQUIRED: 'Please enter your email',
    INVALID: 'Please enter a valid email address',
  },
  PASSWORD: {
    REQUIRED: 'Please enter your password',
    MIN_LENGTH: 'Password must be at least 8 characters long',
    WEAK: 'Password is too weak. Use a mix of letters, numbers, and symbols.',
  },
  CONFIRM_PASSWORD: {
    REQUIRED: 'Please confirm your password',
    MISMATCH: "Passwords don't match",
  },
  USERNAME: {
    REQUIRED: 'Please enter a username',
    MIN_LENGTH: 'Username must be at least 3 characters long',
    INVALID: 'Username can only contain letters, numbers, and underscores',
  },
} as const

// ============================================
// CONFIRMATION MESSAGES
// ============================================

export const AUTH_CONFIRMATION_MESSAGES = {
  LOGOUT: {
    TITLE: 'Sign out',
    DESCRIPTION:
      'Are you sure you want to sign out? You will need to sign in again to access your account.',
    CONFIRM: 'Sign out',
    CANCEL: 'Cancel',
  },
  DELETE_ACCOUNT: {
    TITLE: 'Delete Account',
    DESCRIPTION: 'Are you sure you want to delete your account? This action cannot be undone.',
    CONFIRM: 'Delete Account',
    CANCEL: 'Cancel',
  },
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get error message from error object
 */
export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return AUTH_ERROR_MESSAGES.UNKNOWN
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch')
    )
  }
  return false
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('unauthorized') ||
      message.includes('unauthenticated') ||
      message.includes('token') ||
      message.includes('session')
    )
  }
  return false
}

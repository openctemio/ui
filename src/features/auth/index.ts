/**
 * Auth Feature Barrel Export
 *
 * Main entry point for the auth feature
 * Provides convenient access to all auth-related functionality
 */

// ============================================
// COMPONENTS
// ============================================

export { LoginForm, RegisterForm, SignOutDialog, SignOutButton } from './components'

// ============================================
// HOOKS
// ============================================

export { useAuth, useProtectedRoute, useRequireRoles, useRequireAuth } from './hooks'

// ============================================
// SERVER ACTIONS
// ============================================

export {
  handleOAuthCallback,
  refreshTokenAction,
  getCurrentUser,
  logoutAction,
  isAuthenticated,
  getAccessToken,
} from './actions'

// ============================================
// CONSTANTS
// ============================================

export {
  // Routes
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  DEFAULT_LOGIN_REDIRECT,
  DEFAULT_LOGOUT_REDIRECT,
  isPublicRoute,
  isProtectedRoute,
  getReturnUrl,

  // Messages
  AUTH_SUCCESS_MESSAGES,
  AUTH_ERROR_MESSAGES,
  AUTH_INFO_MESSAGES,
  VALIDATION_MESSAGES,
  AUTH_CONFIRMATION_MESSAGES,
  getAuthErrorMessage,
  isNetworkError,
  isAuthError,

  // Config
  TOKEN_CONFIG,
  SESSION_CONFIG,
  PASSWORD_CONFIG,
  OAUTH_CONFIG,
  SECURITY_CONFIG,
  UI_CONFIG,
  REDIRECT_CONFIG,
  FEATURE_FLAGS,
  isAllowedRedirectDomain,
  getAuthConfig,
} from './constants'

// ============================================
// SCHEMAS & VALIDATION
// ============================================

export {
  // Field validators
  emailSchema,
  passwordSchema,
  confirmPasswordSchema,

  // Login
  loginSchema,

  // Register
  registerSchema,

  // Password management
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,

  // OAuth
  oauthCallbackSchema,

  // Helper functions
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from './schemas'

// ============================================
// TYPES
// ============================================

export type {
  // Auth types
  AuthUser,
  AuthTokens,
  AuthUserInfo,
  TokenPayload,
  AuthState,
  AuthStatus,

  // Form types
  LoginInput,
  LoginOutput,
  RegisterInput,
  RegisterOutput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ResetPasswordOutput,
  ChangePasswordInput,
  ChangePasswordOutput,
  OAuthCallbackParams,

  // Server action types
  AuthSuccessResponse,
  AuthErrorResponse,
  AuthResponse,
  HandleCallbackInput,
  RefreshTokenResult,

  // Component prop types
  LoginFormProps,
  RegisterFormProps,
  SignOutDialogProps,
  SignOutButtonProps,

  // Hook types
  UseAuthReturn,

  // Route protection types
  RouteProtectionOptions,
  ProtectedRouteProps,

  // Social auth types
  SocialProvider,
  SocialAuthButtonProps,

  // Session types
  SessionInfo,
  SessionStorage,

  // Error types
  AuthErrorCode,
  AuthError,

  // Middleware types
  AuthMiddlewareOptions,

  // API client types
  AuthApiClient,
} from './types'

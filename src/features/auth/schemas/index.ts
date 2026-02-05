/**
 * Auth Schemas Barrel Export
 *
 * Centralized exports for all auth validation schemas
 */

// Field validators
export { emailSchema, passwordSchema, confirmPasswordSchema } from './auth.schema'

// Login schema
export { loginSchema } from './auth.schema'
export type { LoginInput, LoginOutput } from './auth.schema'

// Register schema
export { registerSchema } from './auth.schema'
export type { RegisterInput, RegisterOutput } from './auth.schema'

// Password schemas
export { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.schema'
export type {
  ForgotPasswordInput,
  ResetPasswordInput,
  ResetPasswordOutput,
  ChangePasswordInput,
  ChangePasswordOutput,
} from './auth.schema'

// OAuth callback schema
export { oauthCallbackSchema } from './auth.schema'
export type { OAuthCallbackParams } from './auth.schema'

// Server action response types
export type { AuthSuccessResponse, AuthErrorResponse, AuthResponse } from './auth.schema'

// Helper functions
export {
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from './auth.schema'

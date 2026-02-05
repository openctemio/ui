/**
 * Authentication Zod Schemas
 *
 * Centralized validation schemas for all authentication forms
 * Used by both client-side forms and Server Actions
 */

import { z } from 'zod'

// ============================================
// FIELD VALIDATORS (Reusable)
// ============================================

/**
 * Email field validator
 * Provides custom error messages for empty vs invalid email
 */
export const emailSchema = z
  .string()
  .min(1, 'Please enter your email')
  .email('Please enter a valid email address')

/**
 * Password field validator
 * Minimum 8 characters (updated from 7 for better security)
 *
 * CUSTOMIZATION: Add stronger password requirements for production:
 * Example with stricter validation:
 * ```typescript
 * export const passwordSchema = z
 *   .string()
 *   .min(1, 'Please enter your password')
 *   .min(8, 'Password must be at least 8 characters')
 *   .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
 *   .regex(/[a-z]/, 'Must contain at least one lowercase letter')
 *   .regex(/[0-9]/, 'Must contain at least one number')
 *   .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')
 * ```
 */
export const passwordSchema = z
  .string()
  .min(1, 'Please enter your password')
  .min(8, 'Password must be at least 8 characters long')

/**
 * Confirm password field validator
 */
export const confirmPasswordSchema = z
  .string()
  .min(1, 'Please confirm your password')

// ============================================
// LOGIN SCHEMA
// ============================================

/**
 * Login form validation schema
 *
 * @example
 * const form = useForm<LoginInput>({
 *   resolver: zodResolver(loginSchema)
 * })
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

/**
 * Login form input type (inferred from schema)
 */
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Login form output type (same as input for login)
 */
export type LoginOutput = LoginInput

// ============================================
// REGISTER SCHEMA
// ============================================

/**
 * First name field validator
 */
export const firstNameSchema = z
  .string()
  .min(1, 'Please enter your first name')
  .max(50, 'First name must be less than 50 characters')

/**
 * Last name field validator
 */
export const lastNameSchema = z
  .string()
  .min(1, 'Please enter your last name')
  .max(50, 'Last name must be less than 50 characters')

/**
 * Register form validation schema
 * Includes password confirmation matching and name fields for local auth
 *
 * @example
 * const form = useForm<RegisterInput>({
 *   resolver: zodResolver(registerSchema)
 * })
 */
export const registerSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // Show error on confirmPassword field
  })

/**
 * Register form input type (includes confirmPassword)
 */
export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Register form output type (without confirmPassword)
 * Use this for Server Actions and API calls
 */
export type RegisterOutput = Omit<RegisterInput, 'confirmPassword'>

// ============================================
// FORGOT PASSWORD SCHEMA
// ============================================

/**
 * Forgot password form schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

/**
 * Forgot password form input type
 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// ============================================
// RESET PASSWORD SCHEMA
// ============================================

/**
 * Reset password form schema
 * Used when user has reset token
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

/**
 * Reset password form input type
 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Reset password form output type (without confirmPassword)
 */
export type ResetPasswordOutput = Omit<ResetPasswordInput, 'confirmPassword'>

// ============================================
// CHANGE PASSWORD SCHEMA
// ============================================

/**
 * Change password form schema (for logged-in users)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password'),
    newPassword: passwordSchema,
    confirmNewPassword: confirmPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

/**
 * Change password form input type
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Change password form output type
 */
export type ChangePasswordOutput = Omit<ChangePasswordInput, 'confirmNewPassword'>

// ============================================
// OAUTH CALLBACK SCHEMA
// ============================================

/**
 * OAuth callback parameters schema
 * Used to validate OAuth callback URL parameters
 */
export const oauthCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  session_state: z.string().optional(),
})

/**
 * OAuth callback parameters type
 */
export type OAuthCallbackParams = z.infer<typeof oauthCallbackSchema>

// ============================================
// SERVER ACTION RESPONSE TYPES
// ============================================

/**
 * Standard success response from Server Actions
 */
export type AuthSuccessResponse<T = unknown> = {
  success: true
  data: T
  message?: string
}

/**
 * Standard error response from Server Actions
 */
export type AuthErrorResponse = {
  success: false
  error: string
  errors?: Record<string, string[]> // Field-specific errors
}

/**
 * Combined auth response type
 */
export type AuthResponse<T = unknown> = AuthSuccessResponse<T> | AuthErrorResponse

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validates if an email is valid
 * Useful for client-side checks without full form validation
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

/**
 * Validates if a password meets requirements
 */
export function isValidPassword(password: string): boolean {
  try {
    passwordSchema.parse(password)
    return true
  } catch {
    return false
  }
}

/**
 * Gets password strength (0-4)
 * 0 = very weak, 4 = very strong
 */
export function getPasswordStrength(password: string): number {
  if (password.length === 0) return 0

  let strength = 0

  // Length
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++

  // Character types
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  return Math.min(strength, 4)
}

/**
 * Gets human-readable password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  return labels[strength] || 'Very Weak'
}

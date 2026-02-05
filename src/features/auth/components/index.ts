/**
 * Auth Components Barrel Export
 *
 * Centralized exports for all auth components
 */

export { LoginForm } from './login-form'
export { RegisterForm } from './register-form'
export {
  PermissionGate,
  ResourceGate,
  AdminGate,
  type PermissionGateProps,
} from './permission-gate'

// Re-export from shared components for backwards compatibility
export { SignOutDialog, SignOutButton } from '@/components/sign-out-dialog'

// Re-export types for convenience
export type { LoginFormProps, RegisterFormProps } from '../types/auth.types'

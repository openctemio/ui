/**
 * Auth Hooks Barrel Export
 *
 * Centralized exports for all auth hooks
 */

export { useAuth } from './use-auth'
export { useProtectedRoute, useRequireRoles, useRequireAuth } from './use-protected-route'
export {
  usePermissions,
  useUserPermissions,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useIsTenantAdmin,
  useTenantRole,
  type UsePermissionsReturn,
} from './use-permissions'
export { useCanSelfRegister, type CanSelfRegister } from './use-can-self-register'
export { useCanCreateOrganization, type CanCreateOrganization } from './use-can-create-organization'

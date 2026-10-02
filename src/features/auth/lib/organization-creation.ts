/**
 * Who may create an organization (team).
 *
 * The API publishes its policy as `tenant_creation_mode` on the public
 * GET /auth/providers (RFC-022 D8, `TENANT_CREATION_MODE`):
 *   - `self_service` (the default): any signed-in user may create one.
 *   - `admin_only`: only the platform administrator creates organizations;
 *     POST /tenants and POST /auth/create-first-team answer 403.
 *
 * A user who belongs to no organization under `admin_only` cannot create one,
 * so the UI must not send them to the create-team form: they wait for an
 * administrator to add them or for an invitation.
 */

export const TENANT_CREATION_ADMIN_ONLY = 'admin_only'

/**
 * True unless the server says only the platform administrator creates
 * organizations. A missing value means an older server, which only had
 * self-service creation; the server enforces the policy either way.
 */
export function canCreateOrganization(tenantCreationMode: string | undefined): boolean {
  return tenantCreationMode !== TENANT_CREATION_ADMIN_ONLY
}

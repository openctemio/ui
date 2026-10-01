import { SsoManagedByPlatform } from '@/features/sso/components/sso-managed-by-platform'

// Verified domains belong to SSO setup, configured per organization in the
// platform admin console (RFC-022). Old links land on an explanation instead
// of the admin console's sign-in.
export default function Page() {
  return <SsoManagedByPlatform title="Verified domains" what="Domain verification for SSO" />
}

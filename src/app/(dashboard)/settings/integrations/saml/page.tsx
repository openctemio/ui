import { SsoManagedByPlatform } from '@/features/sso/components/sso-managed-by-platform'

// SSO is configured per organization in the platform admin console (RFC-022).
// Old links land on an explanation instead of the admin console's sign-in.
export default function Page() {
  return <SsoManagedByPlatform title="SAML single sign-on" what="SAML single sign-on" />
}

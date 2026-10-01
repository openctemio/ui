'use client'

import { OrganizationSettings } from '@/features/organization/components/organization-settings'

/** Settings › Access › Authentication (was the Security tab of /settings/tenant). */
export default function OrganizationAuthenticationPage() {
  return <OrganizationSettings view="authentication" />
}

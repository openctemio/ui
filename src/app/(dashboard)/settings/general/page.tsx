'use client'

import { OrganizationSettings } from '@/features/organization/components/organization-settings'

/** Settings › Organization › General (was /settings/tenant; 308 from there). */
export default function OrganizationGeneralPage() {
  return <OrganizationSettings view="general" />
}

import { redirect } from 'next/navigation'

// SSO setup is configured per organization in the platform admin console
// (RFC-022). Kept as a redirect so old bookmarks land somewhere useful.
export default function Page() {
  redirect('/admin/organizations')
}

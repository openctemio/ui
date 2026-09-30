import { redirect } from 'next/navigation'

// SSO setup moved to the application-administrator area (/admin). Kept as a
// redirect so existing bookmarks and links keep working.
export default function Page() {
  redirect('/admin/scim')
}

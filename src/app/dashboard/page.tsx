import { redirect } from 'next/navigation'

/**
 * Redirect /dashboard to /
 * The main dashboard content is in the (dashboard) route group at /
 */
export default function DashboardPage() {
  redirect('/')
}

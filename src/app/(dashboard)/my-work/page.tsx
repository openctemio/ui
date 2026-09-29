import { redirect } from 'next/navigation'

/**
 * "My Work" — the asset-owner / developer landing: the findings they are
 * responsible for (assignee, asset owner, or member of an assigned group). It
 * reuses the findings list with the "assigned to me" filter pre-applied so there
 * is a single, consistent triage surface rather than a parallel view to keep in
 * sync. A future iteration can enrich this into a personalized summary (my open
 * findings by SLA, my assets at risk); for now it lands the user on their queue.
 */
export default function MyWorkPage() {
  redirect('/findings?mine=true')
}

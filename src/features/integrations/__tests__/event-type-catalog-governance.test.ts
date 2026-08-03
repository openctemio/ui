import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Notification event-type catalog governance guard.
 *
 * The catalog has exactly one source of truth: `integration.AllEventTypes()` in
 * the api, served over `GET /api/v1/me/event-types` and read here through
 * `useTenantEventTypes()`.
 *
 * It used to have two. A hand-maintained `ALL_NOTIFICATION_EVENT_TYPES` array,
 * a `DEFAULT_ENABLED_EVENT_TYPES` list, an `EVENT_CATEGORY_LABELS` map and a
 * client-side module filter lived in `integration.types.ts` and drifted from the
 * backend. Six event types the outbox routes — `sla_breach`, `finding_assigned`,
 * `approval_requested`, `approval_approved`, `approval_rejected`,
 * `workflow_notification` — had no checkbox, so no operator could enable them,
 * and two event categories had no label.
 *
 * Nothing about that failure was visible at build time, which is why it needs a
 * test rather than a convention. If you are here because this went red: put the
 * event type in `AllEventTypes()` in the api. It will reach this UI on its own.
 */

const SRC = join(__dirname, '..', '..', '..')

/** Files that legitimately name event types: tests, and the hook's own docs. */
const ALLOWED = new Set([
  'features/integrations/api/use-event-types.ts',
  'features/integrations/types/integration.types.ts',
])

const isAllowed = (rel: string) =>
  ALLOWED.has(rel) ||
  rel.includes('__tests__') ||
  rel.endsWith('.test.ts') ||
  rel.endsWith('.test.tsx')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/**
 * A file re-declaring the catalog looks like a collection literal naming
 * several event types at once. One incidental mention (a comment, a single
 * default) is not the failure mode; a *list* of them is.
 */
const EVENT_TYPE_LITERAL =
  /['"](?:security_alert|system_error|new_asset|asset_changed|asset_deleted|scan_started|scan_completed|scan_failed|new_finding|finding_confirmed|finding_triaged|finding_fixed|finding_reopened|finding_assigned|sla_breach|approval_requested|approval_approved|approval_rejected|workflow_notification|new_exposure|exposure_resolved)['"]/g

/**
 * Several of these identifiers are also spelled by vocabularies that are NOT
 * this catalog and must not be swept up:
 *
 *  - `features/notifications/lib/notification-types.ts` — the per-user in-app
 *    notification preferences (`finding_new`, `finding_comment`,
 *    `finding_mention`). Stored on `notifications.type`, unrelated to the
 *    integration outbox whitelist.
 *  - `lib/websocket/types.ts` — websocket message discriminants.
 *
 * So a file only counts as re-declaring THIS catalog if it also talks about
 * notification-channel routing. That keeps the guard aimed at the surface that
 * actually drifted, rather than at every file that happens to say
 * "scan_completed".
 */
const CHANNEL_MARKER =
  /enabled_event_types|notification_extension|useTenantEventTypes|EventTypeSelector|NotificationEventTypeInfo/

const CATEGORY_LABEL_MAP =
  /['"](?:system|asset|scan|finding|approval|workflow|exposure)['"]\s*:\s*['"][A-Z][a-z]+ Events['"]/

describe('notification event-type catalog governance', () => {
  const files = walk(SRC).map((f) => ({ path: f, rel: relative(SRC, f) }))

  it('has files to scan', () => {
    // A broken SRC path would make every assertion below pass vacuously.
    expect(files.length).toBeGreaterThan(100)
  })

  it('no file re-declares the event-type list', () => {
    const offenders: string[] = []

    for (const { path, rel } of files) {
      if (isAllowed(rel)) continue
      const source = readFileSync(path, 'utf8')
      if (!CHANNEL_MARKER.test(source)) continue
      // Two or more distinct event-type strings in one file is a catalog.
      const distinct = new Set(source.match(EVENT_TYPE_LITERAL) ?? [])
      if (distinct.size >= 2) {
        offenders.push(`${rel} (${[...distinct].join(', ')})`)
      }
    }

    expect(
      offenders,
      'These files hardcode a list of notification event types. The catalog is served by ' +
        'GET /api/v1/me/event-types — use useTenantEventTypes() instead of restating it here.'
    ).toEqual([])
  })

  it('no file re-declares the event-category label map', () => {
    const offenders = files
      .filter(({ rel }) => !isAllowed(rel))
      .filter(({ path }) => CATEGORY_LABEL_MAP.test(readFileSync(path, 'utf8')))
      .map(({ rel }) => rel)

    expect(
      offenders,
      'These files hardcode event-category display labels. They come from the API alongside ' +
        'the event types; a locally-maintained map is how the approval and workflow ' +
        'categories ended up rendering without a heading.'
    ).toEqual([])
  })

  it('the shared types module no longer exports a catalog', () => {
    const types = readFileSync(
      join(SRC, 'features/integrations/types/integration.types.ts'),
      'utf8'
    )

    for (const removed of [
      'ALL_NOTIFICATION_EVENT_TYPES',
      'DEFAULT_ENABLED_EVENT_TYPES',
      'EVENT_CATEGORY_LABELS',
      'getAvailableEventTypes',
      'getDefaultEnabledEventTypes',
    ]) {
      expect(types, `${removed} was reintroduced; the catalog belongs to the API`).not.toMatch(
        new RegExp(`export (?:const|function) ${removed}\\b`)
      )
    }
  })

  it('NotificationEventType stays open, so a server-side addition typechecks here', () => {
    const types = readFileSync(
      join(SRC, 'features/integrations/types/integration.types.ts'),
      'utf8'
    )

    // A union would mean any event type added to the api fails to compile in
    // this repo until someone hand-edits it — the drift, reintroduced as a
    // build error instead of a silent gap.
    expect(types).toMatch(/export type NotificationEventType = string/)
  })

  it('the catalog is fetched from the API endpoint', () => {
    const hook = readFileSync(join(SRC, 'features/integrations/api/use-event-types.ts'), 'utf8')
    expect(hook).toContain('/api/v1/me/event-types')
  })
})

/**
 * Helpers for linking a finding's affected asset to its detail page.
 *
 * A finding carries `assets[]` whose `id` is EITHER a real inventory-asset UUID
 * (scanner findings, linked pentest findings) OR a free-text target string such
 * as a hostname (pentest `metadata.affected_assets`). Only the former is a
 * routable asset — the nil/zero UUID and target strings must render as plain
 * text, not a dead link.
 *
 * Route: the universal `/assets/{id}` page renders any asset type (repositories
 * redirect to their richer dedicated page), so a single href is correct for all
 * types — no per-type URL map needed.
 */

const NIL_UUID = '00000000-0000-0000-0000-000000000000'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when `id` is a real, routable inventory-asset id (a non-nil UUID). */
export function isLinkableAssetId(id: string | null | undefined): id is string {
  return !!id && id !== NIL_UUID && UUID_RE.test(id)
}

/** Detail-page href for an inventory asset. Caller must gate on isLinkableAssetId. */
export function assetDetailHref(id: string): string {
  return `/assets/${id}`
}

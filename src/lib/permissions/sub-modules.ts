import type { LicensingModule, ReleaseStatus } from '@/features/integrations/api/use-tenant-modules'

/**
 * Whether a nav entry bound to a sub-module (for example the `scm` category of
 * the `integrations` module) is visible, and with what release status.
 *
 * - no sub-module key, or no parent module: visible, status unchanged;
 * - sub-modules not loaded yet: visible, so the nav does not flash empty;
 * - the parent's sub-modules lack the key: hidden (the API lists only enabled,
 *   active sub-modules, so absence means "not available");
 * - release status `disabled`: hidden.
 *
 * Returns `false` when hidden, otherwise the release status to apply (undefined
 * when there is nothing to apply). Shared by the main sidebar and the settings
 * rail so both hide the same entries.
 */
export function subModuleStatus(
  parentModuleId: string | undefined,
  subModuleKey: string | undefined,
  subModules: Record<string, LicensingModule[]>
): ReleaseStatus | undefined | false {
  if (!parentModuleId || !subModuleKey) return undefined
  if (Object.keys(subModules).length === 0) return undefined
  const sub = (subModules[parentModuleId] || []).find((m) => m.slug === subModuleKey)
  if (!sub) return false
  if (sub.release_status === 'disabled') return false
  return sub.release_status
}

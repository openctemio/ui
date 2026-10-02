/**
 * Scoping readiness: is the program's scope written down for this cycle? One
 * row per ctem.org scoping artifact, each with the page that fixes it. These
 * are readiness checks, not a score (ctem.org warns against vanity metrics);
 * outcome metrics live in Program Health.
 *
 * Pure, so the rules are unit-tested; the page and the dashboard tile share it.
 */
import type { ScopingSummary } from './api'

export interface ReadinessRow {
  key: string
  label: string
  ready: boolean
  /** What was measured, e.g. "3 of 9". */
  value: string
  /** The page that fixes it, and the verb on its button. */
  href: string
  action: string
  /** Module the row is about; hidden when that module is off. */
  module?: string
}

const of = (n: number, total: number) => `${n} of ${total}`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function readinessRows(s: ScopingSummary): ReadinessRow[] {
  const cycle = s.active_cycle
  const active = cycle?.status === 'active'
  const charterWritten = !!cycle && cycle.objectives + cycle.success_criteria > 0
  const cj = s.crown_jewels
  const svc = s.business_services
  const assets = s.assets
  const tm = s.threat_models

  return [
    {
      key: 'cycle',
      label: 'Cycle active with a charter',
      ready: active && charterWritten,
      value: cycle
        ? `${cycle.name} · ${cycle.status}${charterWritten ? '' : ' · no charter'}`
        : 'No cycle',
      href: cycle ? `/cycles/${cycle.id}` : '/cycles',
      action: cycle ? 'Open' : 'Start',
      module: 'ctem_cycles',
    },
    {
      key: 'crown_jewels',
      label: 'Crown jewels identified',
      ready: cj.total > 0,
      value: plural(cj.total, 'asset'),
      href: '/crown-jewels',
      action: cj.total > 0 ? 'Review' : 'Designate',
      module: 'crown_jewels',
    },
    {
      key: 'crown_jewel_owners',
      label: 'Crown jewels have an owner',
      ready: cj.total > 0 && cj.with_owner >= cj.total,
      value: of(cj.with_owner, cj.total),
      href: '/assets?is_crown_jewel=true&has_owner=false',
      action: 'Assign',
      module: 'crown_jewels',
    },
    {
      key: 'services',
      label: 'Business services defined',
      ready: svc.total > 0,
      value: plural(svc.total, 'service'),
      href: '/business-services',
      action: svc.total > 0 ? 'Open' : 'Define',
      module: 'business_services',
    },
    {
      key: 'service_assets',
      label: 'Services linked to their assets',
      ready: svc.total > 0 && svc.with_assets >= svc.total,
      value: of(svc.with_assets, svc.total),
      href: '/business-services',
      action: 'Link',
      module: 'business_services',
    },
    {
      key: 'business_units',
      label: 'Assets mapped to a business unit',
      ready: assets.total > 0 && assets.in_business_unit >= assets.total,
      value: of(assets.in_business_unit, assets.total),
      href: s.business_units.total > 0 ? '/assets' : '/business-units',
      action: s.business_units.total > 0 ? 'Map' : 'Create units',
      module: 'business_units',
    },
    {
      key: 'boundary',
      label: 'Boundary set (targets and exclusions)',
      ready: s.boundary.targets > 0,
      value: `${plural(s.boundary.targets, 'target')} · ${plural(s.boundary.exclusions, 'exclusion')}`,
      href: '/scope-config',
      action: 'Open',
      module: 'scope_config',
    },
    {
      key: 'attacker_profiles',
      label: 'Attacker profiles chosen for the cycle',
      ready: !!cycle && cycle.attacker_profiles > 0,
      value: cycle ? plural(cycle.attacker_profiles, 'profile') : 'No cycle',
      href: cycle ? `/cycles/${cycle.id}?tab=profiles` : '/cycles',
      action: 'Choose',
      module: 'ctem_cycles',
    },
    {
      key: 'threat_models',
      label: 'Threat model for each crown jewel',
      ready: cj.total > 0 && tm.crown_jewels_covered >= cj.total,
      value: of(tm.crown_jewels_covered, cj.total),
      href: '/threat-model',
      action: 'Generate',
      module: 'threat_model',
    },
  ]
}

/** Rows the tenant can act on: a row about a module that is off is left out. */
export function visibleReadiness(
  rows: ReadinessRow[],
  moduleOn: (module: string) => boolean
): ReadinessRow[] {
  return rows.filter((r) => !r.module || moduleOn(r.module))
}

export function readinessScore(rows: ReadinessRow[]): { ready: number; total: number } {
  return { ready: rows.filter((r) => r.ready).length, total: rows.length }
}

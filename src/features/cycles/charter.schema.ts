import { z } from 'zod'

import type { CtemCharter } from './types'

/**
 * Charter form schema.
 *
 * Validation is deliberately permissive: the charter is the "soul" of a cycle
 * and users fill it in progressively, so every field is optional and we never
 * hard-block a save on incomplete playbook content. Measurability of success
 * criteria is surfaced as a soft warning in the UI (see `charterWarnings`),
 * not as a blocking schema error.
 */
export const charterFormSchema = z.object({
  business_priorities: z.array(z.string()),
  risk_appetite: z.string(),
  in_scope_services: z.array(z.string()),
  objectives: z.array(z.string()),
  threat_scenarios: z.array(z.string()),
  exclusions: z.array(
    z.object({
      item: z.string(),
      reason: z.string(),
    })
  ),
  success_criteria: z.array(
    z.object({
      name: z.string(),
      metric: z.string(),
      target: z.string(),
    })
  ),
  escalation_path: z.string(),
  timeline: z.string(),
  roles: z.object({
    sponsor: z.string(),
    operator: z.string(),
    engineering_partner: z.string(),
  }),
})

export type CharterFormData = z.infer<typeof charterFormSchema>

export const emptyCharterForm: CharterFormData = {
  business_priorities: [],
  risk_appetite: '',
  in_scope_services: [],
  objectives: [],
  threat_scenarios: [],
  exclusions: [],
  success_criteria: [],
  escalation_path: '',
  timeline: '',
  roles: { sponsor: '', operator: '', engineering_partner: '' },
}

/** Hydrate the form from a charter object returned by the API. */
export function charterToForm(charter?: CtemCharter | null): CharterFormData {
  return {
    business_priorities: charter?.business_priorities ?? [],
    risk_appetite: charter?.risk_appetite ?? '',
    in_scope_services: charter?.in_scope_services ?? [],
    objectives: charter?.objectives ?? [],
    threat_scenarios: charter?.threat_scenarios ?? [],
    exclusions:
      charter?.exclusions?.map((e) => ({ item: e.item ?? '', reason: e.reason ?? '' })) ?? [],
    success_criteria:
      charter?.success_criteria?.map((c) => ({
        name: c.name ?? '',
        metric: c.metric ?? '',
        target: c.target ?? '',
      })) ?? [],
    escalation_path: charter?.escalation_path ?? '',
    timeline: charter?.timeline ?? '',
    roles: {
      sponsor: charter?.roles?.sponsor ?? '',
      operator: charter?.roles?.operator ?? '',
      engineering_partner: charter?.roles?.engineering_partner ?? '',
    },
  }
}

const cleanStrings = (items: string[]): string[] =>
  items.map((s) => s.trim()).filter((s) => s.length > 0)

/**
 * Serialize the form into the charter object the API persists. Empty rows are
 * dropped so a charter never carries blank list entries, and empty
 * strings/objects are omitted to keep the stored JSONB tidy.
 */
export function formToCharter(form: CharterFormData): CtemCharter {
  const charter: CtemCharter = {}

  const businessPriorities = cleanStrings(form.business_priorities)
  if (businessPriorities.length) charter.business_priorities = businessPriorities

  const inScopeServices = cleanStrings(form.in_scope_services)
  if (inScopeServices.length) charter.in_scope_services = inScopeServices

  const objectives = cleanStrings(form.objectives)
  if (objectives.length) charter.objectives = objectives

  const threatScenarios = cleanStrings(form.threat_scenarios)
  if (threatScenarios.length) charter.threat_scenarios = threatScenarios

  const exclusions = form.exclusions
    .map((e) => ({ item: e.item.trim(), reason: e.reason.trim() }))
    .filter((e) => e.item.length > 0 || e.reason.length > 0)
  if (exclusions.length) charter.exclusions = exclusions

  const successCriteria = form.success_criteria
    .map((c) => ({ name: c.name.trim(), metric: c.metric.trim(), target: c.target.trim() }))
    .filter((c) => c.name.length > 0 || c.metric.length > 0 || c.target.length > 0)
  if (successCriteria.length) charter.success_criteria = successCriteria

  if (form.risk_appetite.trim()) charter.risk_appetite = form.risk_appetite.trim()
  if (form.escalation_path.trim()) charter.escalation_path = form.escalation_path.trim()
  if (form.timeline.trim()) charter.timeline = form.timeline.trim()

  const roles = {
    sponsor: form.roles.sponsor.trim(),
    operator: form.roles.operator.trim(),
    engineering_partner: form.roles.engineering_partner.trim(),
  }
  if (roles.sponsor || roles.operator || roles.engineering_partner) {
    charter.roles = roles
  }

  return charter
}

/**
 * Soft-guidance warnings (never block saving). A success criterion is only
 * "measurable" when it names both a metric and a target, per the ctem.org
 * scope-charter playbook.
 */
export function charterWarnings(form: CharterFormData): string[] {
  const warnings: string[] = []
  form.success_criteria.forEach((c, i) => {
    const named = c.name.trim().length > 0
    const measurable = c.metric.trim().length > 0 && c.target.trim().length > 0
    if (named && !measurable) {
      warnings.push(
        `Success criterion ${i + 1}${c.name.trim() ? ` ("${c.name.trim()}")` : ''} has no metric or target — add both to make it measurable.`
      )
    }
  })
  return warnings
}

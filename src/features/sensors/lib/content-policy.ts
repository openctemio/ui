import type { ContentPin, ContentPolicy, SensorContentName } from '@/lib/api/sensor-types'

import { POLICY_CONTENT } from './content'

/**
 * The content policy form (Settings → Scanning → Scanner content): string
 * fields while editing, converted to and from the API's ContentPolicy here so
 * the rules live in one tested place.
 */

export interface ContentPinForm {
  maxAgeHours: string
  version: string
  rulesets: string[]
}

export interface ContentPolicyForm {
  refreshIntervalHours: string
  content: Record<string, ContentPinForm>
}

/** Which pin field each content kind offers. */
export const PIN_KIND: Record<string, 'digest' | 'tag' | 'rulesets'> = {
  'trivy-db': 'digest',
  'trivy-java-db': 'digest',
  'nuclei-templates': 'tag',
  'semgrep-rules': 'rulesets',
}

const MAX_HOURS = 24 * 365
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/
const TAG_RE = /^v?\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/
const RULESET_RE = /^[A-Za-z0-9_][A-Za-z0-9_./:@-]{0,127}$/

const str = (n: number | null | undefined) => (n && n > 0 ? String(n) : '')

export function policyToForm(policy: ContentPolicy | null | undefined): ContentPolicyForm {
  const content: Record<string, ContentPinForm> = {}
  for (const name of POLICY_CONTENT) {
    const pin: ContentPin = policy?.content?.[name] ?? {}
    content[name] = {
      maxAgeHours: str(pin.max_age_hours),
      version: pin.version ?? '',
      rulesets: [...(pin.rulesets ?? [])],
    }
  }
  return { refreshIntervalHours: str(policy?.refresh_interval_hours), content }
}

function parseHours(v: string, field: string, errors: Record<string, string>): number | undefined {
  const t = v.trim()
  if (!t) return undefined
  if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > MAX_HOURS) {
    errors[field] = `Whole hours from 1 to ${MAX_HOURS}`
    return undefined
  }
  return Number(t)
}

/**
 * The form as a ContentPolicy. Empty fields are left out (the platform
 * default applies). `errors` is keyed by field ("refreshIntervalHours",
 * "<content>.maxAgeHours", "<content>.version", "<content>.rulesets").
 */
export function formToPolicy(form: ContentPolicyForm): {
  policy: ContentPolicy
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  const policy: ContentPolicy = { content: {} }
  const interval = parseHours(form.refreshIntervalHours, 'refreshIntervalHours', errors)
  if (interval) policy.refresh_interval_hours = interval

  for (const [name, f] of Object.entries(form.content)) {
    const pin: ContentPin = {}
    const maxAge = parseHours(f.maxAgeHours, `${name}.maxAgeHours`, errors)
    if (maxAge) pin.max_age_hours = maxAge

    const kind = PIN_KIND[name]
    const version = f.version.trim()
    if (version && kind === 'digest') {
      if (DIGEST_RE.test(version)) pin.version = version
      else errors[`${name}.version`] = 'A digest: sha256: and 64 lower-case hex digits'
    } else if (version && kind === 'tag') {
      if (TAG_RE.test(version)) pin.version = version
      else errors[`${name}.version`] = 'A release tag such as v10.4.9'
    }

    if (kind === 'rulesets') {
      const rulesets = f.rulesets.map((r) => r.trim()).filter(Boolean)
      const bad = rulesets.find((r) => !RULESET_RE.test(r))
      if (bad) errors[`${name}.rulesets`] = `Not a ruleset name: ${bad}`
      else if (rulesets.length > 32) errors[`${name}.rulesets`] = 'At most 32 rulesets'
      else if (rulesets.length) pin.rulesets = rulesets
    }

    if (Object.keys(pin).length > 0) policy.content[name as SensorContentName] = pin
  }
  return { policy, errors }
}

/** "48 hours (2 days)" style placeholder from a default. */
export function hoursPlaceholder(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return 'No limit'
  return hours % 24 === 0 && hours >= 24
    ? `${hours} (${hours / 24} ${hours === 24 ? 'day' : 'days'})`
    : String(hours)
}

import { describe, expect, it } from 'vitest'

import { formToPolicy, hoursPlaceholder, policyToForm } from '../content-policy'

const DIGEST = 'sha256:' + 'a'.repeat(64)

describe('content policy form', () => {
  it('round-trips a policy', () => {
    const policy = {
      refresh_interval_hours: 12,
      content: {
        'trivy-db': { max_age_hours: 48, version: DIGEST },
        'nuclei-templates': { max_age_hours: 168, version: 'v10.4.9' },
        'semgrep-rules': { rulesets: ['p/default', 'p/owasp-top-ten'] },
      },
    }
    const form = policyToForm(policy)
    expect(form.refreshIntervalHours).toBe('12')
    expect(form.content['trivy-java-db']).toEqual({ maxAgeHours: '', version: '', rulesets: [] })
    const { policy: back, errors } = formToPolicy(form)
    expect(errors).toEqual({})
    expect(back).toEqual(policy)
  })

  it('leaves empty fields out (the platform default applies)', () => {
    const { policy, errors } = formToPolicy(policyToForm(undefined))
    expect(errors).toEqual({})
    expect(policy).toEqual({ content: {} })
  })

  it('rejects bad hours, digests, tags and rulesets', () => {
    const form = policyToForm(undefined)
    form.refreshIntervalHours = '0'
    form.content['trivy-db'].maxAgeHours = '1.5'
    form.content['trivy-db'].version = 'latest'
    form.content['nuclei-templates'].version = 'main'
    form.content['semgrep-rules'].rulesets = ['p/default', '--config=evil']
    const { errors } = formToPolicy(form)
    expect(Object.keys(errors).sort()).toEqual([
      'nuclei-templates.version',
      'refreshIntervalHours',
      'semgrep-rules.rulesets',
      'trivy-db.maxAgeHours',
      'trivy-db.version',
    ])
  })

  it('formats default placeholders', () => {
    expect(hoursPlaceholder(48)).toBe('48 (2 days)')
    expect(hoursPlaceholder(24)).toBe('24 (1 day)')
    expect(hoursPlaceholder(6)).toBe('6')
    expect(hoursPlaceholder(0)).toBe('No limit')
  })
})

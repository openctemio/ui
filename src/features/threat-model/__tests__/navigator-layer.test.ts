import { describe, it, expect } from 'vitest'
import {
  attackVersion,
  tacticShortname,
  navigatorFileName,
  buildNavigatorLayer,
  TACTIC_SHORTNAMES,
} from '../lib/navigator-layer'
import type { ThreatModelCoverage } from '../types'

describe('attackVersion', () => {
  it('strips the attack- prefix', () => {
    expect(attackVersion('attack-16.1')).toBe('16.1')
    expect(attackVersion('attack-15.0')).toBe('15.0')
  })
  it('passes through an already-bare version', () => {
    expect(attackVersion('16.1')).toBe('16.1')
  })
})

describe('tacticShortname', () => {
  it('maps known display names to Navigator shortnames', () => {
    expect(tacticShortname('Credential Access')).toBe('credential-access')
    expect(tacticShortname('Privilege Escalation')).toBe('privilege-escalation')
    expect(tacticShortname('Command and Control')).toBe('command-and-control')
  })
  it('covers all 14 enterprise tactics', () => {
    expect(Object.keys(TACTIC_SHORTNAMES)).toHaveLength(14)
  })
  it('falls back to a generic slug for an unknown tactic', () => {
    expect(tacticShortname('Some New Tactic')).toBe('some-new-tactic')
  })
})

describe('navigatorFileName', () => {
  it('slugifies the model name', () => {
    expect(navigatorFileName('Threat model: bastion-host')).toBe(
      'threat-model-bastion-host-navigator.json'
    )
  })
  it('falls back when the name slugifies to empty', () => {
    expect(navigatorFileName('   ')).toBe('threat-model-navigator.json')
  })
})

function fixture(): ThreatModelCoverage {
  return {
    threat_model_id: 'tm-1',
    scope_type: 'crown_jewel',
    scope_ref_id: 'cj-1',
    dataset_version: 'attack-16.1',
    generated_at: '2026-07-23T00:00:00Z',
    totals: {
      techniques: 2,
      open: 1,
      mitigated: 0,
      covered: 0,
      accepted: 0,
      theoretical: 1,
      coverage_pct: 0,
    },
    tactics: [
      {
        tactic: 'Credential Access',
        techniques: [
          {
            technique_id: 'T1552',
            technique_name: 'Unsecured Credentials',
            status: 'open',
            counts: { open: 1, mitigated: 0, covered: 0, accepted: 0, theoretical: 0 },
            max_score: 7.2,
            mitigation_ids: ['M1022', 'M1027'],
            threat_count: 1,
          },
        ],
      },
      {
        tactic: 'Execution',
        techniques: [
          {
            technique_id: 'T1059',
            technique_name: 'Command and Scripting Interpreter',
            status: 'theoretical',
            counts: { open: 0, mitigated: 0, covered: 0, accepted: 0, theoretical: 1 },
            max_score: 7.2,
            mitigation_ids: [],
            threat_count: 1,
          },
        ],
      },
    ],
  }
}

describe('buildNavigatorLayer', () => {
  it('produces a v4.5 layer with stripped attack version', () => {
    const { layer } = buildNavigatorLayer(fixture(), 'bastion-host')
    expect(layer.name).toBe('bastion-host')
    expect(layer.versions.attack).toBe('16.1')
    expect(layer.versions.layer).toBe('4.5')
    expect(layer.domain).toBe('enterprise-attack')
    expect(layer.techniques).toHaveLength(2)
  })

  it('colors open techniques red and maps the tactic shortname', () => {
    const { layer } = buildNavigatorLayer(fixture(), 'bastion-host')
    const t1552 = layer.techniques.find((t) => t.techniqueID === 'T1552')!
    expect(t1552.tactic).toBe('credential-access')
    expect(t1552.color).toBe('#ef4444')
    expect(t1552.score).toBe(7.2)
    expect(t1552.enabled).toBe(true)
    expect(t1552.comment).toContain('open')
    expect(t1552.comment).toContain('M1022, M1027')
  })

  it('colors theoretical techniques slate', () => {
    const { layer } = buildNavigatorLayer(fixture(), 'bastion-host')
    const t1059 = layer.techniques.find((t) => t.techniqueID === 'T1059')!
    expect(t1059.tactic).toBe('execution')
    expect(t1059.color).toBe('#94a3b8')
  })

  it('reports no unmapped tactics for known kill-chain names', () => {
    const { unmappedTactics } = buildNavigatorLayer(fixture(), 'bastion-host')
    expect(unmappedTactics).toEqual([])
  })

  it('flags an unmapped tactic name', () => {
    const cov = fixture()
    cov.tactics[0].tactic = 'Made Up Tactic'
    const { unmappedTactics, layer } = buildNavigatorLayer(cov, 'x')
    expect(unmappedTactics).toContain('Made Up Tactic')
    expect(layer.techniques[0].tactic).toBe('made-up-tactic')
  })
})

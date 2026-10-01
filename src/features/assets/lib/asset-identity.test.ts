import { describe, expect, it } from 'vitest'
import {
  type AssetIdentifier,
  dedupReasonLabel,
  deriveAlsoKnownAs,
  describeEvidence,
  identifierKindLabel,
  isUsedForMatching,
  readAliases,
  sortIdentifiers,
} from './asset-identity'

const NOW = Date.parse('2026-10-01T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

function ident(kind: string, value: string, strong: boolean, lastSeenDays = 0): AssetIdentifier {
  return { kind, value, strong, first_seen: daysAgo(30), last_seen: daysAgo(lastSeenDays) }
}

describe('identifierKindLabel', () => {
  it('labels known kinds and falls back for unknown ones', () => {
    expect(identifierKindLabel('mac')).toBe('MAC address')
    expect(identifierKindLabel('host_id')).toBe('Host ID')
    expect(identifierKindLabel('scm_repo_id')).toBe('SCM repository ID')
    expect(identifierKindLabel('new_kind')).toBe('new kind')
  })
})

describe('sortIdentifiers', () => {
  it('orders by trust, then most recently seen', () => {
    const sorted = sortIdentifiers([
      ident('ip', '10.0.0.1', false, 5),
      ident('ip', '10.0.0.2', false, 1),
      ident('mac', '00:1a:2b:3c:4d:5e', true),
      ident('host_id', 'abc', true),
      ident('hostname', 'web-01', false),
    ])
    expect(sorted.map((i) => i.value)).toEqual([
      'abc',
      '00:1a:2b:3c:4d:5e',
      'web-01',
      '10.0.0.2',
      '10.0.0.1',
    ])
  })
})

describe('isUsedForMatching', () => {
  it('always counts strong identifiers', () => {
    expect(isUsedForMatching(ident('mac', 'm', true, 400), NOW)).toBe(true)
  })
  it('counts a weak identifier only within 7 days', () => {
    expect(isUsedForMatching(ident('ip', '10.0.0.1', false, 6), NOW)).toBe(true)
    expect(isUsedForMatching(ident('ip', '10.0.0.1', false, 8), NOW)).toBe(false)
  })
  it('does not count an unparseable timestamp', () => {
    expect(isUsedForMatching({ ...ident('ip', 'x', false), last_seen: 'nope' }, NOW)).toBe(false)
  })
})

describe('readAliases', () => {
  it('keeps non-empty strings only', () => {
    expect(readAliases({ aliases: ['a', '', 3, 'b'] })).toEqual(['a', 'b'])
    expect(readAliases({ aliases: 'a' })).toEqual([])
    expect(readAliases(undefined)).toEqual([])
  })
})

describe('deriveAlsoKnownAs', () => {
  it('lists other names once, newest first, then former names', () => {
    const aka = deriveAlsoKnownAs(
      [
        ident('hostname', 'web-01', false, 3),
        ident('fqdn', 'WEB-01.corp.example', false, 0),
        ident('ip', '10.0.0.5', false, 1),
        ident('mac', '00:1a:2b:3c:4d:5e', true),
        ident('hostname', 'web-01.corp.example', false, 2),
      ],
      'web-01.corp.example',
      ['old-web', 'web-01']
    )
    expect(aka).toEqual([
      { name: '10.0.0.5', kind: 'ip', lastSeen: daysAgo(1) },
      { name: 'web-01', kind: 'hostname', lastSeen: daysAgo(3) },
      { name: 'old-web', kind: 'alias' },
    ])
  })
  it('is empty when nothing differs from the current name', () => {
    expect(deriveAlsoKnownAs([ident('hostname', 'x', false)], 'x')).toEqual([])
  })
})

describe('dedup reasons', () => {
  it('labels reasons, including older reviews without one', () => {
    expect(dedupReasonLabel('identifier_conflict')).toBe('Conflicting identifiers')
    expect(dedupReasonLabel('renamed_host')).toBe('Renamed host')
    expect(dedupReasonLabel(null)).toBe('Name or IP match')
    expect(dedupReasonLabel('something_new')).toBe('something new')
  })
  it('describes evidence in one line', () => {
    expect(describeEvidence({ kind: 'mac', value: '00:1a:2b:3c:4d:5e' })).toBe(
      'MAC address 00:1a:2b:3c:4d:5e'
    )
    expect(describeEvidence({ ip: '10.0.0.5', tool: 'nessus' })).toBe('IP 10.0.0.5 · nessus')
    expect(describeEvidence({ old_name: 'x', new_name: 'y' })).toBe('x → y')
    expect(describeEvidence({ count: 2 })).toBe('count: 2')
    expect(describeEvidence({})).toBe('')
    expect(describeEvidence(null)).toBe('')
  })
})

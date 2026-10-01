import { describe, expect, it } from 'vitest'

import { isPrivateRange, parseRanges, rangesContain, splitRangeInput } from './ranges'

// Cases mirror openctemio/api pkg/domain/scanzone/zone_test.go (ParseRanges).
describe('parseRanges', () => {
  it('normalises addresses, CIDRs and ranges like the API', () => {
    const r = parseRanges(['10.1.2.3/16', '10.1.0.5', '192.168.1.0/24', 'fd00:230::/48'])
    expect(r.errors).toEqual([])
    // 10.1.0.5 is inside 10.1.0.0/16 and is dropped; host bits are masked.
    expect(r.ranges).toEqual(['10.1.0.0/16', '192.168.1.0/24', 'fd00:230::/48'])
    expect(r.privateCount).toBe(3)
  })

  it('expands an inclusive range into CIDRs', () => {
    expect(parseRanges(['10.0.0.0-10.0.0.255']).ranges).toEqual(['10.0.0.0/24'])
    expect(parseRanges(['10.0.0.1-10.0.0.2']).ranges).toEqual(['10.0.0.1/32', '10.0.0.2/32'])
  })

  it('refuses a range that expands to more than 16 CIDRs', () => {
    expect(parseRanges(['10.0.0.1-10.0.0.200']).errors).toEqual([])
    const r = parseRanges(['10.0.0.1-10.255.255.254'])
    expect(r.errors[0].message).toMatch(/too many CIDRs/)
  })

  it('converts IPv4-mapped IPv6 to IPv4', () => {
    expect(parseRanges(['::ffff:10.0.0.5']).ranges).toEqual(['10.0.0.5/32'])
  })

  it.each([
    ['0.0.0.0/0', /deny list/],
    ['::/0', /deny list/],
    ['127.0.0.1', /deny list/],
    ['169.254.169.254', /deny list/],
    ['fe80::1', /deny list/],
    ['224.0.0.1', /deny list/],
    ['8.0.0.0/7', /too large/],
    ['2001:db8::/31', /too large/],
    ['10.0.0.300', /not an address/],
    ['banana', /not an address/],
    ['10.0.0.9-10.0.0.1', /end is before start/],
    ['10.0.0.1-fd00::1', /mixes IPv4 and IPv6/],
  ])('rejects %s', (input, msg) => {
    const r = parseRanges([input])
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0].message).toMatch(msg)
  })

  it('reports every bad line with its number', () => {
    const r = parseRanges(['10.0.0.0/8', 'nope', '127.0.0.0/8'])
    expect(r.errors.map((e) => e.line)).toEqual([2, 3])
  })

  it('allows a /8 and a /32 IPv6 at the bounds', () => {
    expect(parseRanges(['10.0.0.0/8', '2001:db8::/32']).errors).toEqual([])
  })

  it('caps a zone at 256 prefixes', () => {
    const many = Array.from({ length: 257 }, (_, i) => `10.${Math.floor(i / 256)}.${i % 256}.0/24`)
    expect(parseRanges(many).errors[0].message).toMatch(/at most 256/)
  })
})

describe('helpers', () => {
  it('splits textarea input on newlines, commas and spaces', () => {
    expect(splitRangeInput('10.0.0.0/8, 192.168.0.0/16\n\n fd00::/8 ')).toEqual([
      '10.0.0.0/8',
      '192.168.0.0/16',
      'fd00::/8',
    ])
  })

  it('classifies private ranges', () => {
    expect(isPrivateRange('10.230.0.0/16')).toBe(true)
    expect(isPrivateRange('100.64.0.0/10')).toBe(true)
    expect(isPrivateRange('203.0.113.0/24')).toBe(false)
  })

  it('tests address membership', () => {
    expect(rangesContain(['10.0.0.0/8'], '10.2.3.4')).toBe(true)
    expect(rangesContain(['10.0.0.0/8'], '11.2.3.4')).toBe(false)
    expect(rangesContain(['fd00::/8'], 'fd00::1')).toBe(true)
  })
})

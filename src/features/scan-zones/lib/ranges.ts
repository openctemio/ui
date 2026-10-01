/**
 * Client-side mirror of the API's scan zone range rules
 * (openctemio/api `pkg/domain/scanzone/zone.go`, ParseRanges). The server is
 * the authority: this only lets the form point at a bad line before saving,
 * and shows what the API will store (normalised CIDRs).
 *
 * Accepted: an address (10.0.0.5, fd00::5), a CIDR (host bits are masked) and
 * an inclusive range "a-b" (expanded to at most 16 CIDRs). IPv4-mapped IPv6
 * becomes IPv4. Rejected: overlap with the built-in deny list (so 0.0.0.0/0
 * and ::/0 too), IPv4 wider than /8, IPv6 wider than /32, more than 256
 * prefixes per zone.
 */

export const MAX_RANGES_PER_ZONE = 256
export const MAX_RANGE_EXPANSION = 16
export const MIN_IPV4_PREFIX = 8
export const MIN_IPV6_PREFIX = 32
export const MAX_ZONE_NAME_LENGTH = 100
export const MAX_ZONE_DESCRIPTION_LENGTH = 1000

export interface Addr {
  v4: boolean
  value: bigint
}

export interface Prefix {
  addr: Addr
  bits: number
}

const ZERO = BigInt(0)
const ONE = BigInt(1)

function bitLen(v4: boolean): number {
  return v4 ? 32 : 128
}

function allOnes(n: number): bigint {
  return (ONE << BigInt(n)) - ONE
}

function parseIPv4(s: string): bigint | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  let v = ZERO
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    // Go's netip rejects leading zeros ("010"), so do we.
    if (p.length > 1 && p.startsWith('0')) return null
    const n = Number(p)
    if (n > 255) return null
    v = (v << BigInt(8)) | BigInt(n)
  }
  return v
}

function parseIPv6(s: string): bigint | null {
  if (s.includes('%')) return null // zoned addresses are refused
  let head = s
  let tailV4: bigint | null = null
  const lastColon = s.lastIndexOf(':')
  if (lastColon >= 0 && s.slice(lastColon + 1).includes('.')) {
    tailV4 = parseIPv4(s.slice(lastColon + 1))
    if (tailV4 === null) return null
    head = s.slice(0, lastColon + 1) + '0:0'
  }
  const dbl = head.split('::')
  if (dbl.length > 2) return null
  const parseGroups = (part: string): number[] | null => {
    if (part === '') return []
    const out: number[] = []
    for (const g of part.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null
      out.push(parseInt(g, 16))
    }
    return out
  }
  const left = parseGroups(dbl[0])
  const right = dbl.length === 2 ? parseGroups(dbl[1]) : []
  if (!left || !right) return null
  let groups: number[]
  if (dbl.length === 2) {
    const missing = 8 - left.length - right.length
    if (missing < 1) return null
    groups = [...left, ...new Array<number>(missing).fill(0), ...right]
  } else {
    groups = left
  }
  if (groups.length !== 8) return null
  let v = ZERO
  for (const g of groups) v = (v << BigInt(16)) | BigInt(g)
  if (tailV4 !== null) v = (v & ~allOnes(32)) | tailV4
  return v
}

/** Parses an address; IPv4-mapped IPv6 becomes IPv4. */
export function parseAddr(raw: string): Addr | null {
  const s = raw.trim()
  if (s.includes(':')) {
    const v = parseIPv6(s)
    if (v === null) return null
    if (v >> BigInt(32) === BigInt(0xffff)) return { v4: true, value: v & allOnes(32) }
    return { v4: false, value: v }
  }
  const v = parseIPv4(s)
  return v === null ? null : { v4: true, value: v }
}

function mask(addr: Addr, bits: number): Addr {
  const len = bitLen(addr.v4)
  const hostBits = len - bits
  const m = allOnes(len) ^ allOnes(hostBits)
  return { v4: addr.v4, value: addr.value & m }
}

export function lastAddr(p: Prefix): bigint {
  return p.addr.value | allOnes(bitLen(p.addr.v4) - p.bits)
}

export function prefixContainsAddr(p: Prefix, a: Addr): boolean {
  if (p.addr.v4 !== a.v4) return false
  return a.value >= p.addr.value && a.value <= lastAddr(p)
}

export function prefixesOverlap(a: Prefix, b: Prefix): boolean {
  if (a.addr.v4 !== b.addr.v4) return false
  return a.addr.value <= lastAddr(b) && b.addr.value <= lastAddr(a)
}

/** Parses a CIDR or bare address into a masked prefix (mapped v6 unmapped). */
export function parsePrefix(raw: string): Prefix | null {
  const s = raw.trim()
  const slash = s.indexOf('/')
  if (slash < 0) {
    const a = parseAddr(s)
    return a ? { addr: a, bits: bitLen(a.v4) } : null
  }
  const addrPart = s.slice(0, slash)
  const bitsPart = s.slice(slash + 1)
  if (!/^\d{1,3}$/.test(bitsPart)) return null
  let bits = Number(bitsPart)
  const isV6Text = addrPart.includes(':')
  const v = isV6Text ? parseIPv6(addrPart) : parseIPv4(addrPart)
  if (v === null) return null
  if (bits > (isV6Text ? 128 : 32)) return null
  if (isV6Text && v >> BigInt(32) === BigInt(0xffff) && (v & ~allOnes(48)) === ZERO) {
    // IPv4-mapped IPv6 CIDR: ::ffff:10.0.0.0/104 -> 10.0.0.0/8
    bits = Math.max(bits - 96, 0)
    return { addr: mask({ v4: true, value: v & allOnes(32) }, bits), bits }
  }
  return { addr: mask({ v4: !isV6Text, value: v }, bits), bits }
}

export function formatAddr(a: Addr): string {
  if (a.v4) {
    const v = Number(a.value)
    return [24, 16, 8, 0].map((s) => (v >>> s) & 255).join('.')
  }
  const groups: number[] = []
  for (let i = 7; i >= 0; i--) {
    groups.push(Number((a.value >> BigInt(i * 16)) & BigInt(0xffff)))
  }
  // Longest run of zero groups (length >= 2) becomes "::", as Go prints it.
  let bestStart = -1
  let bestLen = 0
  for (let i = 0; i < 8;) {
    if (groups[i] !== 0) {
      i++
      continue
    }
    let j = i
    while (j < 8 && groups[j] === 0) j++
    if (j - i > bestLen && j - i >= 2) {
      bestStart = i
      bestLen = j - i
    }
    i = j
  }
  const hex = groups.map((g) => g.toString(16))
  if (bestStart < 0) return hex.join(':')
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLen).join(':')}`
}

export function formatPrefix(p: Prefix): string {
  return `${formatAddr(p.addr)}/${p.bits}`
}

function pfx(s: string): Prefix {
  const p = parsePrefix(s)
  if (!p) throw new Error(`bad built-in prefix ${s}`)
  return p
}

/** Never part of a zone (RFC-023 §11). Same list as the API. */
export const DENY_RANGES: readonly Prefix[] = [
  '0.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/128',
  '::1/128',
  'fe80::/10',
  'ff00::/8',
].map(pfx)

/** Scanned only through a zone once a tenant has zones (RFC-023 D6). */
export const PRIVATE_RANGES: readonly Prefix[] = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '100.64.0.0/10',
  'fc00::/7',
].map(pfx)

export function isPrivatePrefix(p: Prefix): boolean {
  return PRIVATE_RANGES.some((q) => prefixesOverlap(q, p))
}

function rangeToPrefixes(a: Addr, b: bigint, limit: number): Prefix[] {
  const out: Prefix[] = []
  const len = bitLen(a.v4)
  let start = a.value
  while (out.length < limit) {
    let n = len
    while (n > 0) {
      const wider: Prefix = { addr: { v4: a.v4, value: start }, bits: n - 1 }
      if (mask(wider.addr, n - 1).value !== start || lastAddr(wider) > b) break
      n--
    }
    const p: Prefix = { addr: { v4: a.v4, value: start }, bits: n }
    out.push(p)
    const last = lastAddr(p)
    if (last >= b) break
    start = last + ONE
  }
  return out
}

export class ZoneRangeError extends Error {}

function parseOne(raw: string): Prefix[] {
  const s = raw.trim()
  if (s === '') throw new ZoneRangeError('invalid range: empty')
  const dash = s.indexOf('-')
  if (dash >= 0) {
    const lo = parseAddr(s.slice(0, dash))
    const hi = parseAddr(s.slice(dash + 1))
    if (!lo || !hi) throw new ZoneRangeError(`invalid range "${s}": not an address range`)
    if (lo.v4 !== hi.v4) throw new ZoneRangeError(`invalid range "${s}": mixes IPv4 and IPv6`)
    if (hi.value < lo.value) throw new ZoneRangeError(`invalid range "${s}": end is before start`)
    const out = rangeToPrefixes(lo, hi.value, MAX_RANGE_EXPANSION + 1)
    if (out.length > MAX_RANGE_EXPANSION) {
      throw new ZoneRangeError(
        `range "${s}" expands to too many CIDRs (max ${MAX_RANGE_EXPANSION}); write it as CIDRs`
      )
    }
    return out
  }
  const p = parsePrefix(s)
  if (!p) throw new ZoneRangeError(`invalid range "${s}": not an address, CIDR or address range`)
  return [p]
}

function checkPrefix(p: Prefix): void {
  for (const d of DENY_RANGES) {
    if (prefixesOverlap(d, p)) {
      throw new ZoneRangeError(
        `range ${formatPrefix(p)} overlaps the built-in deny list (${formatPrefix(d)}): loopback, link-local/metadata, multicast, unspecified and reserved addresses are never scanned`
      )
    }
  }
  const min = p.addr.v4 ? MIN_IPV4_PREFIX : MIN_IPV6_PREFIX
  if (p.bits < min) {
    throw new ZoneRangeError(`range ${formatPrefix(p)} is too large (widest allowed is /${min})`)
  }
}

function comparePrefix(a: Prefix, b: Prefix): number {
  if (a.addr.v4 !== b.addr.v4) return a.addr.v4 ? -1 : 1
  if (a.addr.value !== b.addr.value) return a.addr.value < b.addr.value ? -1 : 1
  return a.bits - b.bits
}

function normalize(input: Prefix[]): Prefix[] {
  const ps = [...input].sort(comparePrefix)
  const out: Prefix[] = []
  for (const p of ps) {
    const last = out[out.length - 1]
    if (
      last &&
      last.addr.v4 === p.addr.v4 &&
      last.bits <= p.bits &&
      prefixContainsAddr(last, p.addr)
    ) {
      continue
    }
    out.push(p)
  }
  return out
}

export interface LineError {
  line: number // 1-based
  input: string
  message: string
}

export interface ParsedRanges {
  ranges: string[] // normalised, as the API will store them
  errors: LineError[]
  privateCount: number
}

/** Splits a textarea value (newlines, commas, spaces) into entries. */
export function splitRangeInput(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .flatMap((l) => l.trim().split(/\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Validates and normalises zone ranges like the API does. Each bad entry is
 * reported (not only the first) so the form can list them.
 */
export function parseRanges(entries: string[]): ParsedRanges {
  const all: Prefix[] = []
  const errors: LineError[] = []
  entries.forEach((input, i) => {
    try {
      const ps = parseOne(input)
      ps.forEach(checkPrefix)
      all.push(...ps)
    } catch (e) {
      errors.push({ line: i + 1, input, message: e instanceof Error ? e.message : String(e) })
    }
  })
  const out = normalize(all)
  if (errors.length === 0 && out.length > MAX_RANGES_PER_ZONE) {
    errors.push({
      line: 0,
      input: '',
      message: `a zone may hold at most ${MAX_RANGES_PER_ZONE} ranges (these normalise to ${out.length})`,
    })
  }
  return {
    ranges: out.map(formatPrefix),
    errors,
    privateCount: out.filter(isPrivatePrefix).length,
  }
}

/** True when the CIDR text overlaps private address space. */
export function isPrivateRange(cidr: string): boolean {
  const p = parsePrefix(cidr)
  return p ? isPrivatePrefix(p) : false
}

/**
 * Whether an inventory address (asset name) lies inside any of the ranges.
 * Used for "which zone holds this asset" links; the API's coverage endpoint is
 * the source of the counts.
 */
export function rangesContain(ranges: string[], address: string): boolean {
  const a = parseAddr(address)
  if (!a) return false
  return ranges.some((r) => {
    const p = parsePrefix(r)
    return p ? prefixContainsAddr(p, a) : false
  })
}

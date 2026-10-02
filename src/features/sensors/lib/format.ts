/** "40s", "5m", "2h 14m", "3d 4h": a short duration for table cells. */
export function formatDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return h ? `${d}d ${h}h` : `${d}d`
}

export type KeyExpiry =
  | { kind: 'unknown' }
  | { kind: 'never' }
  | { kind: 'expired' }
  | { kind: 'soon'; days: number }
  | { kind: 'later'; days: number }

/** The API key's expiry, bucketed: "soon" is within 7 days (the API's warning). */
export function keyExpiry(expiresAt: string | null | undefined, now: number): KeyExpiry {
  if (expiresAt === undefined) return { kind: 'unknown' } // an API without the field
  if (expiresAt === null) return { kind: 'never' }
  const t = new Date(expiresAt).getTime()
  if (Number.isNaN(t)) return { kind: 'unknown' }
  const left = t - now
  if (left <= 0) return { kind: 'expired' }
  const days = Math.ceil(left / 86_400_000)
  return left <= 7 * 86_400_000 ? { kind: 'soon', days } : { kind: 'later', days }
}

/** Bytes as "512 B", "12.3 KB", "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`
}

/** "5m ago", "just now"; "—" for an unreadable time. */
export function agoShort(iso: string, now: number): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  if (t >= now - 1000) return 'just now'
  return `${formatDurationShort((now - t) / 1000)} ago`
}

/** The local date and time of an RFC 3339 time, for a tooltip. */
export function exactTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString()
}

/**
 * Helpers for values that cross a trust boundary into server logs or
 * backend request paths.
 *
 * Server Actions receive their arguments straight from the client, so a
 * parameter typed as a string-literal union (e.g. a provider id) can carry
 * any string at runtime. These helpers are plain (non-async) functions so
 * they can live outside `'use server'` modules.
 */

/**
 * Make an arbitrary value safe to write to a log line: strips CR/LF so a
 * client-supplied value cannot forge additional log entries, and caps the
 * length so it cannot flood the log.
 */
export function sanitizeLogValue(value: unknown, maxLength = 128): string {
  const s = String(value).replace(/\r/g, '').replace(/\n/g, '')
  return s.length > maxLength ? `${s.slice(0, maxLength)}...` : s
}

/**
 * Narrow an untrusted value to one of the allowed literals. Use it at the top
 * of a Server Action before the value is interpolated into a URL path.
 */
export function isAllowedValue<T extends string>(
  allowed: readonly T[],
  value: unknown
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

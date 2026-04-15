/**
 * Safely convert a property value to a string array.
 * Handles: string[] (from JSONB array), comma-separated string, single string, null.
 */
export function toStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string')
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  return [String(value)]
}

/**
 * Browser-side half of the double-submit CSRF check: the JS-readable
 * `csrf_token` cookie echoed back in the `X-CSRF-Token` header. Standalone
 * (no imports) so stores and providers can use it without the API client.
 */
export function csrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {}
}

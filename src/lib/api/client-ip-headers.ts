/**
 * Which client-IP headers the Next.js API proxies pass on to the backend.
 *
 * The API enforces an organization's IP allowlist against the caller's IP. When
 * the browser talks to the API through this UI's proxy, the API sees the UI
 * server's address unless the proxy forwards the original one.
 *
 * `X-Real-IP` / `X-Forwarded-For` on an incoming request are only trustworthy
 * when a reverse proxy in front of the UI OVERWRITES them. Without one, a
 * browser can send any value it likes and walk past the allowlist. So they are
 * forwarded only when the operator says such a proxy exists:
 *
 *   TRUST_PROXY_HEADERS=true
 *
 * Default (unset / anything else): nothing is forwarded.
 */

export const CLIENT_IP_HEADERS = ['x-real-ip', 'x-forwarded-for'] as const

/** True when the operator has declared a header-overwriting reverse proxy. */
export function trustProxyHeaders(envValue: string | undefined = process.env.TRUST_PROXY_HEADERS) {
  return envValue === 'true'
}

/**
 * Returns the client-IP headers to send to the backend, read from the incoming
 * request. Empty unless `trusted` is true.
 */
export function clientIpHeaders(
  incoming: Headers,
  trusted: boolean = trustProxyHeaders()
): Array<[string, string]> {
  if (!trusted) return []
  const out: Array<[string, string]> = []
  for (const name of CLIENT_IP_HEADERS) {
    const value = incoming.get(name)?.trim()
    if (value) out.push([name, value])
  }
  return out
}

/** Copies {@link clientIpHeaders} onto the outgoing backend request headers. */
export function applyClientIpHeaders(
  outgoing: Headers,
  incoming: Headers,
  trusted: boolean = trustProxyHeaders()
): void {
  for (const [name, value] of clientIpHeaders(incoming, trusted)) {
    outgoing.set(name, value)
  }
}

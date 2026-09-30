/**
 * Fetch client for the platform admin console. Requests go to the dedicated
 * /api/v1/admin proxy, which forwards only the admin_* cookies. Writes carry
 * the double-submit CSRF header from the readable admin_csrf cookie (distinct
 * from the tenant csrf_token, so both shells can be open in one browser).
 */

export const ADMIN_API = '/api/v1/admin'
const ADMIN_CSRF_COOKIE = 'admin_csrf'

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const c = part.trim()
    if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length))
  }
  return undefined
}

export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = init.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCookie(ADMIN_CSRF_COOKIE)
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const res = await fetch(`${ADMIN_API}${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: 'same-origin',
    cache: 'no-store',
  })

  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }
  if (!res.ok) {
    const body = (data ?? {}) as { message?: string; error?: string; code?: string }
    throw new AdminApiError(body.message || body.error || res.statusText, res.status, body.code)
  }
  return data as T
}

/** SWR fetcher for GET paths under /api/v1/admin. */
export const adminFetcher = <T>(path: string) => adminFetch<T>(path)

/**
 * Navigation helpers for the console sign-in pages.
 */

const NEXT_KEY = 'openctem.admin.next'

const CONSOLE_ROOT = '/admin'

/**
 * Only same-origin console paths are allowed as a post-sign-in target. The
 * result is rebuilt behind the constant console root, so only the part after
 * /admin comes from the input and it can never name another origin or scheme.
 */
export function safeConsolePath(raw: string | null | undefined): string {
  const next = raw ?? ''
  const inConsole = next === CONSOLE_ROOT || next.startsWith(`${CONSOLE_ROOT}/`)
  if (!inConsole || next.startsWith('//') || next.includes('\\')) return CONSOLE_ROOT
  return CONSOLE_ROOT + next.slice(CONSOLE_ROOT.length)
}

/** The ?next= of the current page, sanitized. */
export function nextFromLocation(): string {
  if (typeof window === 'undefined') return '/admin'
  return safeConsolePath(new URLSearchParams(window.location.search).get('next'))
}

/** Keeps the post-sign-in target across the round trip to the IdP. */
export function rememberNext(next: string) {
  try {
    window.sessionStorage.setItem(NEXT_KEY, safeConsolePath(next))
  } catch {
    // Storage unavailable: the console opens on its overview.
  }
}

/** Returns (and forgets) the target remembered before going to the IdP. */
export function takeRememberedNext(): string {
  try {
    const v = window.sessionStorage.getItem(NEXT_KEY)
    window.sessionStorage.removeItem(NEXT_KEY)
    return safeConsolePath(v)
  } catch {
    return '/admin'
  }
}

/**
 * The authorization URL comes from the API, built from the configured IdP.
 * Refuse anything that is not http(s) so a bad value cannot run script.
 */
export function isNavigableURL(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

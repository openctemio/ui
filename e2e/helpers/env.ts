/**
 * Centralised access to E2E environment variables.
 *
 * Each spec file should pull config through this module so that the
 * "missing env" error message is consistent and tests can be skipped
 * (rather than failing) when the runner is invoked without the
 * required setup.
 */

export type E2EConfig = {
  baseURL: string
  apiBaseURL: string
  userEmail: string
  userPassword: string
  tenantSlug: string
}

export type E2EConfigResult = { ok: true; config: E2EConfig } | { ok: false; missing: string[] }

const REQUIRED_ENV_VARS = ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD', 'E2E_TENANT_SLUG'] as const

export function getE2EConfig(): E2EConfigResult {
  const missing: string[] = []
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) missing.push(key)
  }
  if (missing.length > 0) {
    return { ok: false, missing }
  }

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  return {
    ok: true,
    config: {
      baseURL,
      apiBaseURL: process.env.E2E_API_BASE_URL ?? baseURL,
      userEmail: process.env.E2E_USER_EMAIL!,
      userPassword: process.env.E2E_USER_PASSWORD!,
      tenantSlug: process.env.E2E_TENANT_SLUG!,
    },
  }
}

/**
 * Returns the config or throws with a helpful message. Prefer
 * `requireE2EConfig()` inside `test.beforeAll` so the test simply
 * skips when prerequisites are missing.
 */
export function requireE2EConfig(): E2EConfig {
  const result = getE2EConfig()
  if (!result.ok) {
    throw new Error(
      `Missing required E2E environment variables: ${result.missing.join(', ')}.\n` +
        `Copy e2e/.env.example to e2e/.env and fill in the values.`
    )
  }
  return result.config
}

import { test as base, expect } from '@playwright/test'
import type { E2EConfig } from '../helpers/env'
import { getE2EConfig } from '../helpers/env'
import { loginAs } from '../helpers/auth'

/**
 * Custom Playwright fixture that yields a `page` already logged in
 * as the seed user. Specs that need an authenticated session simply
 * import `test` from this file instead of `@playwright/test`.
 *
 * The fixture also exposes `e2eConfig` so specs can access the
 * configured tenant slug and credentials without re-reading env vars.
 *
 * If E2E env vars are missing the fixture marks the test as skipped
 * with a clear message — the suite stays green when run from a fresh
 * clone, and only fails when prerequisites are met but assertions break.
 */

type Fixtures = {
  e2eConfig: E2EConfig
}

export const test = base.extend<Fixtures>({
  // Skip the test if env is missing; otherwise return the resolved config.
  e2eConfig: async ({}, use, testInfo) => {
    const result = getE2EConfig()
    if (!result.ok) {
      testInfo.skip(
        true,
        `Skipping E2E test — missing env vars: ${result.missing.join(', ')}.\n` +
          `Copy e2e/.env.example to e2e/.env to enable E2E tests.`
      )
      // testInfo.skip throws, so this line is unreachable, but TS needs it.
      return
    }
    await use(result.config)
  },

  // Replace the default `page` with one that has already logged in.
  page: async ({ page, e2eConfig }, use) => {
    await loginAs(page, e2eConfig)
    await use(page)
  },
})

export { expect }

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { E2EConfig } from './env'

/**
 * Logs the seed user in via the public login page.
 *
 * Uses the role + label selectors that React Hook Form + shadcn render
 * (FormLabel "Email", FormLabel "Password", submit button "Sign in").
 * Waits for the post-login navigation to land on a tenant route.
 *
 * Returns once the user is on `/{tenantSlug}` (or any path that requires
 * the tenant cookie). Throws if login fails.
 */
export async function loginAs(page: Page, config: E2EConfig): Promise<void> {
  await page.goto('/login')

  // Email + password fields. Targeting by accessible label survives
  // class name and DOM structure changes.
  await page.getByLabel('Email').fill(config.userEmail)
  await page.getByLabel('Password').fill(config.userPassword)

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ])

  // After login the user can land on:
  //   - /                          (single-tenant default tenant)
  //   - /select-tenant             (multi-tenant)
  //   - /onboarding/create-team    (no tenant)
  //   - /<tenant-slug>             (when redirectTo carried a tenant URL)
  // For deterministic tests we navigate explicitly to the tenant root.
  if (page.url().includes('/select-tenant')) {
    // Click the configured tenant by its slug or name. The select-tenant
    // page renders cards keyed by tenant slug.
    await page
      .getByRole('link', { name: new RegExp(config.tenantSlug, 'i') })
      .first()
      .click()
    await page.waitForLoadState('networkidle')
  }

  // Sanity check: we should no longer be on /login.
  await expect(page).not.toHaveURL(/\/login(\?|$)/)
}

/**
 * Navigates to a dashboard path. Tenant context is carried by cookies in
 * this app, so dashboard routes are not slug-prefixed. This wrapper exists
 * mostly for symmetry with `loginAs` and to centralise the
 * waitForLoadState call.
 */
export async function gotoDashboardPath(page: Page, pathName: string): Promise<void> {
  const path = pathName.startsWith('/') ? pathName : `/${pathName}`
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

import { test as base, expect } from '@playwright/test'
import { test as authedTest } from '../fixtures/authenticated-page'
import { getE2EConfig } from '../helpers/env'
import { loginAs } from '../helpers/auth'

/**
 * Critical Flow #1: Login → Invitation Accept
 *
 * Verifies the unauthenticated → authenticated transition (the foundation
 * every other E2E test depends on) and the public invitation preview
 * endpoint, which gates whether invited users can land on the right page.
 *
 * The full "user opens email link → submits form → joins team" loop
 * needs an API helper that creates a fresh invitation against a fresh
 * email — see the TODO at the bottom of this file.
 */

base('login form rejects invalid credentials', async ({ page }, testInfo) => {
  // We don't need full env to test rejection — just need a base URL.
  if (!process.env.E2E_BASE_URL && !process.env.E2E_USER_EMAIL) {
    testInfo.skip(true, 'E2E_BASE_URL not set')
    return
  }
  await page.goto('/login')

  await page.getByLabel('Email').fill('not-a-real-user@example.invalid')
  await page.getByLabel('Password').fill('definitely-wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // The page must NOT navigate away from /login on failure.
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

  // And surface an error to the user — we don't pin the exact text
  // because copy may be localised, but expect SOMETHING with role=alert
  // or a toast container.
  const errorVisible = await Promise.race([
    page
      .getByRole('alert')
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false),
    page
      .locator('[data-sonner-toast]')
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false),
  ])
  expect(errorVisible, 'expected an error alert/toast on failed login').toBe(true)
})

base('login flow lands on a tenant route', async ({ page }, testInfo) => {
  const cfg = getE2EConfig()
  if (!cfg.ok) {
    testInfo.skip(true, `Skipping — missing env vars: ${cfg.missing.join(', ')}`)
    return
  }

  await loginAs(page, cfg.config)
  await expect(page).not.toHaveURL(/\/login(\?|$)/)
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15_000 })
})

base('public invitation preview handles unknown token gracefully', async ({ page }) => {
  // Public route — no auth required. Use a clearly fake token.
  await page.goto('/invitations/this-token-definitely-does-not-exist-0123456789/preview')
  // Either a friendly 404 or an "invalid invitation" UI must render —
  // never a hard crash. We assert the page rendered SOMETHING.
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('body')).not.toBeEmpty()
})

authedTest('admin can see pending invitations on the users page', async ({ page }) => {
  await page.goto('/settings/users')
  await page.waitForLoadState('networkidle')

  // The users page should render the status filter tabs (active/pending/...).
  // Existence of the "Pending" tab proves the page loaded with the right
  // permissions. We don't assert a specific count — empty pending lists
  // are valid for fresh tenants.
  const pendingTab = page
    .getByRole('tab', { name: /pending/i })
    .or(page.getByRole('button', { name: /pending/i }))
  await expect(pendingTab.first()).toBeVisible({ timeout: 15_000 })

  // TODO: Once an API helper exists for seeding an invitation, this test
  // should:
  //   1. POST a fresh invitation via the API
  //   2. Reload the page and find the row by email
  //   3. Click "Resend"
  //   4. Click "Delete" and confirm the row disappears
  // Until then we just assert the tab is reachable.
})

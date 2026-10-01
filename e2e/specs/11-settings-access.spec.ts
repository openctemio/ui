import { test as base } from '@playwright/test'
import { test, expect } from '../fixtures/authenticated-page'
import { loginAs } from '../helpers/auth'
import { getE2EConfig } from '../helpers/env'

/**
 * Settings pages a tenant user cannot act on.
 *
 * Regressions this guards:
 *   1. /settings/integrations/saml (and verified-domains) redirected a tenant
 *      owner into the platform admin console's sign-in. SSO moved there
 *      (RFC-022); the page now says so instead.
 *   2. Members and viewers saw an enabled "Generate token" on the SCIM page,
 *      which the API refuses (owner/admin only).
 *
 * The SCIM check needs a member or viewer: set E2E_LIMITED_EMAIL /
 * E2E_LIMITED_PASSWORD, or it is skipped.
 */

test('SSO settings explain that the platform administrator configures SSO', async ({ page }) => {
  for (const path of ['/settings/integrations/saml', '/settings/integrations/verified-domains']) {
    await page.goto(path)
    await expect(
      page.getByText('SSO is configured by your platform administrator'),
      path
    ).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).pathname, path).toBe(path)
  }
})

base('SCIM tokens: no Generate token for a member or viewer', async ({ page }) => {
  const cfg = getE2EConfig()
  const email = process.env.E2E_LIMITED_EMAIL
  const password = process.env.E2E_LIMITED_PASSWORD
  base.skip(!cfg.ok || !email || !password, 'Set E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD')
  if (!cfg.ok) return

  await loginAs(page, { ...cfg.config, userEmail: email!, userPassword: password! })
  await page.goto('/settings/integrations/scim-tokens')
  await expect(page.getByRole('heading', { name: 'SCIM provisioning' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText("Managed by your team's owners and admins")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate token' })).toHaveCount(0)
})
